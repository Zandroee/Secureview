<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SingleLoginSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SingleLoginSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_stale_login_is_signed_out_when_the_account_logs_in_elsewhere(): void
    {
        $user = User::factory()->create();
        Cache::forever(SingleLoginSessionService::cacheKey($user->id), 'current-device-token');

        $this->actingAs($user)
            ->withSession([
                SingleLoginSessionService::SESSION_TOKEN_KEY => 'old-device-token',
                SingleLoginSessionService::SESSION_USER_ID_KEY => $user->id,
            ])
            ->get('/settings')
            ->assertRedirect(route('login'))
            ->assertSessionHas(
                'status',
                'You were signed out because your account was logged in on another device or browser.'
            );

        $this->assertGuest();
        $this->assertSame(
            'current-device-token',
            Cache::get(SingleLoginSessionService::cacheKey($user->id))
        );
    }

    public function test_the_current_active_login_remains_authenticated(): void
    {
        $user = User::factory()->create();
        Cache::forever(SingleLoginSessionService::cacheKey($user->id), 'current-device-token');

        $this->actingAs($user)
            ->withSession([
                SingleLoginSessionService::SESSION_TOKEN_KEY => 'current-device-token',
                SingleLoginSessionService::SESSION_USER_ID_KEY => $user->id,
            ])
            ->get('/settings')
            ->assertOk();

        $this->assertAuthenticatedAs($user);
    }

    public function test_successful_password_login_registers_a_new_active_session(): void
    {
        $user = User::factory()->create([
            'email' => 'single-session@example.test',
            'email_verified_at' => now(),
            'password' => 'CorrectPass123!',
            'remember_token' => 'previous-remember-token',
        ]);

        Cache::forever(SingleLoginSessionService::cacheKey($user->id), 'previous-device-token');

        $this->post(route('login.authenticate'), [
            'email' => 'single-session@example.test',
            'password' => 'CorrectPass123!',
        ])->assertRedirect('/');

        $this->assertAuthenticatedAs($user);
        $this->assertSessionHas(SingleLoginSessionService::SESSION_TOKEN_KEY);

        $sessionToken = session(SingleLoginSessionService::SESSION_TOKEN_KEY);

        $this->assertIsString($sessionToken);
        $this->assertSame(
            $sessionToken,
            Cache::get(SingleLoginSessionService::cacheKey($user->id))
        );
        $this->assertNotSame('previous-remember-token', $user->fresh()->getRememberToken());
    }
}
