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

        $this->from('/login')
            ->post(route('login.authenticate'), $payload)
            ->assertStatus(429);
    }

    public function test_registration_is_rate_limited_by_client_ip(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->from('/signup')
                ->post(route('register'), [])
                ->assertRedirect('/signup');
        }

        $this->from('/signup')
            ->post(route('register'), [])
            ->assertStatus(429);
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
