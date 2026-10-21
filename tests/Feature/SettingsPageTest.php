<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SettingsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_user_can_open_settings_with_saved_preferences(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'preferred_theme' => 'dark',
            'notification_popups_enabled' => false,
        ]);

        $this->actingAs($user)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings')
                ->where('settings.preferred_theme', 'dark')
                ->where('settings.notification_popups_enabled', false)
                ->where('settings.email', $user->email));
    }

    public function test_guest_is_redirected_from_settings(): void
    {
        $this->get(route('settings.index'))->assertRedirect(route('login'));
    }

    public function test_user_can_save_dark_mode_and_notification_popup_preferences(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch(route('settings.preferences.update'), [
                'preferred_theme' => 'dark',
                'notification_popups_enabled' => false,
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Appearance and notification preferences saved.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'preferred_theme' => 'dark',
            'notification_popups_enabled' => 0,
        ]);
    }

    public function test_user_cannot_save_an_invalid_theme(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->from(route('settings.index'))
            ->patch(route('settings.preferences.update'), [
                'preferred_theme' => 'ultraviolet',
                'notification_popups_enabled' => true,
            ])
            ->assertSessionHasErrors('preferred_theme');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'preferred_theme' => 'system',
        ]);
    }

    public function test_user_can_update_their_name_and_phone_without_changing_email(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);

        $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => 'Updated Account Name',
                'phone' => '09181234567',
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Profile settings saved.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Account Name',
            'phone' => '09181234567',
            'email' => $user->email,
        ]);
    }

    public function test_user_cannot_change_phone_to_an_invalid_or_duplicate_number(): void
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'phone' => '09171234567']);
        User::factory()->create(['phone' => '09181234567']);

        $this->actingAs($user)
            ->from(route('settings.index'))
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'phone' => '09181234567',
            ])
            ->assertSessionHasErrors('phone');
    }

    public function test_user_can_change_password_with_the_current_password(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'password' => 'OldPass123!',
        ]);

        $this->actingAs($user)
            ->patch(route('settings.password.update'), [
                'current_password' => 'OldPass123!',
                'password' => 'NewPass123!',
                'password_confirmation' => 'NewPass123!',
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Password updated successfully.');

        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
    }

    public function test_incorrect_current_password_is_rejected(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'password' => 'OldPass123!',
        ]);

        $this->actingAs($user)
            ->from(route('settings.index'))
            ->patch(route('settings.password.update'), [
                'current_password' => 'WrongPass123!',
                'password' => 'NewPass123!',
                'password_confirmation' => 'NewPass123!',
            ])
            ->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('OldPass123!', $user->fresh()->password));
    }
}
