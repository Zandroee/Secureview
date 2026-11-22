<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class SocialLoginVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_google_accounts_are_verified_and_logged_in_immediately(): void
    {
        $this->mockSocialProvider('google', [
            'id' => 'google-new-account-123',
            'name' => 'Google New User',
            'email' => 'google-new@example.test',
        ]);

        $this->get(route('auth.google.callback'))
            ->assertRedirect('/');

        $user = User::query()
            ->where('google_id', 'google-new-account-123')
            ->firstOrFail();

        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('google-new@example.test', $user->email);
        $this->assertAuthenticatedAs($user);
    }

    public function test_new_facebook_accounts_are_verified_and_logged_in_immediately(): void
    {
        $this->mockSocialProvider('facebook', [
            'id' => 'facebook-new-account-456',
            'name' => 'Facebook New User',
            'email' => 'facebook-new@example.test',
        ]);

        $this->get(route('auth.facebook.callback'))
            ->assertRedirect('/');

        $user = User::query()
            ->where('facebook_id', 'facebook-new-account-456')
            ->firstOrFail();

        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('facebook-new@example.test', $user->email);
        $this->assertAuthenticatedAs($user);
    }

    private function mockSocialProvider(string $providerName, array $profile): void
    {
        $socialUser = (new SocialiteUser())->map($profile);
        $provider = Mockery::mock();
        $provider->shouldReceive('user')->once()->andReturn($socialUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with($providerName)
            ->andReturn($provider);
    }
}
