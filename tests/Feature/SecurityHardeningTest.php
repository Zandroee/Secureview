<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_accounts_and_wrong_passwords_return_the_same_login_error(): void
    {
        $unknownAccountResponse = $this->from('/login')->post(route('login.authenticate'), [
            'email' => 'not-registered@example.test',
            'password' => 'WrongPass123!',
        ]);

        $unknownAccountResponse->assertSessionHasErrors([
            'email' => 'The provided credentials are incorrect.',
        ]);

        User::factory()->create([
            'email' => 'registered@example.test',
            'password' => 'CorrectPass123!',
        ]);

        $wrongPasswordResponse = $this->from('/login')->post(route('login.authenticate'), [
            'email' => 'registered@example.test',
            'password' => 'WrongPass123!',
        ]);

        $wrongPasswordResponse->assertSessionHasErrors([
            'email' => 'The provided credentials are incorrect.',
        ]);
    }

    public function test_remember_me_creates_a_persistent_login_token(): void
    {
        $user = User::factory()->create([
            'email' => 'remember-me@example.test',
            'email_verified_at' => now(),
            'remember_token' => null,
            'password' => 'CorrectPass123!',
        ]);

        $this->from('/login')
            ->post(route('login.authenticate'), [
                'email' => 'remember-me@example.test',
                'password' => 'CorrectPass123!',
                'remember' => true,
            ])
            ->assertRedirect('/');

        $this->assertAuthenticatedAs($user);
        $rememberToken = $user->fresh()->getRememberToken();

        $this->assertNotNull($rememberToken);
        $this->assertSame(60, strlen($rememberToken));
    }

    public function test_login_is_rate_limited_for_repeated_attempts_with_the_same_email_and_ip(): void
    {
        $payload = [
            'email' => 'login-limit@example.test',
            'password' => 'WrongPass123!',
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->from('/login')
                ->post(route('login.authenticate'), $payload)
                ->assertRedirect('/login');
        }

        $limitedResponse = $this->from('/login')
            ->post(route('login.authenticate'), $payload);

        $limitedResponse
            ->assertStatus(429)
            ->assertSee('Please slow down a moment')
            ->assertSee('Netmax Trading');
    }

    public function test_registration_rate_limit_is_session_aware_and_returns_a_friendly_inertia_notice(): void
    {
        // The feature-test client does not persist browser session cookies between
        // requests the way a real browser does. Exercise the shared-IP ceiling
        // here; real browser sessions also use the tighter per-session ceiling.
        for ($attempt = 0; $attempt < 60; $attempt++) {
            $this->from('/signup')
                ->withHeaders(['X-Inertia' => 'true'])
                ->post(route('register'), [])
                ->assertRedirect('/signup');
        }

        $this->from('/signup')
            ->withHeaders(['X-Inertia' => 'true'])
            ->post(route('register'), [])
            ->assertRedirect('/signup')
            ->assertSessionHas('rateLimitMessage');
    }

    public function test_password_reset_rate_limit_returns_a_friendly_inertia_notice(): void
    {
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->from('/forgot-password')
                ->withHeaders(['X-Inertia' => 'true'])
                ->post(route('password.email'), [
                    'email' => 'password-limit@example.test',
                ])
                ->assertRedirect('/forgot-password');
        }

        $this->from('/forgot-password')
            ->withHeaders(['X-Inertia' => 'true'])
            ->post(route('password.email'), [
                'email' => 'password-limit@example.test',
            ])
            ->assertRedirect('/forgot-password')
            ->assertSessionHas('rateLimitMessage');
    }

    public function test_catalog_search_suggestions_return_a_public_json_payload(): void
    {
        $this->getJson(route('search.suggestions', ['q' => 'camera']))
            ->assertOk()
            ->assertJsonStructure([
                'products',
                'packages',
            ]);
    }

    public function test_session_lifetime_defaults_to_eight_hours(): void
    {
        $this->assertSame(480, (int) config('session.lifetime'));
    }

    public function test_expired_session_recovery_page_is_available(): void
    {
        $html = view('errors.419')->render();

        $this->assertStringContainsString('Your session has expired', $html);
        $this->assertStringContainsString('Return to previous page', $html);
        $this->assertStringContainsString('Sign in', $html);
    }

    public function test_rate_limit_recovery_page_uses_customer_friendly_copy(): void
    {
        $html = view('errors.429', ['retryAfter' => 60])->render();

        $this->assertStringContainsString('Please slow down a moment', $html);
        $this->assertStringContainsString('Netmax Trading', $html);
        $this->assertStringContainsString('60 seconds', $html);
        $this->assertStringContainsString('Return to the previous page', $html);
    }

    public function test_authenticated_admin_pages_encrypt_history_and_disable_browser_caching(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store, private')
            ->assertHeader('Pragma', 'no-cache')
            ->assertHeader('Expires', '0')
            ->assertViewHas('page', fn (array $page) => ($page['encryptHistory'] ?? false) === true);
    }

    public function test_logout_clears_inertia_history_and_blocks_return_to_admin_pages(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk();

        $logoutResponse = $this->post('/logout');

        $logoutResponse->assertRedirect('/');
        $logoutResponse->assertSessionHas('inertia.clear_history', true);

        $this->assertGuest();
        $this->get('/dashboard')->assertRedirect('/login');
    }


    public function test_web_responses_include_baseline_security_headers(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=()');
    }
}
