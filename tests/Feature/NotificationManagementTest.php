<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotificationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifications_are_paginated_per_authenticated_user(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        foreach (range(1, 12) as $number) {
            $this->makeNotification($user, 'Notification ' . $number);
        }

        $this->actingAs($user)
            ->get(route('notifications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('notifications')
                ->where('notifications.current_page', 1)
                ->where('notifications.last_page', 2)
                ->where('notifications.total', 12)
                ->where('unreadCount', 12)
                ->has('notifications.data', 10)
            );

        $this->actingAs($user)
            ->get(route('notifications.index', ['page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('notifications.current_page', 2)
                ->has('notifications.data', 2)
            );
    }

    public function test_user_can_delete_one_of_their_own_notifications(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $notification = $this->makeNotification($user, 'Delete me');

        $this->actingAs($user)
            ->delete(route('notifications.destroy', $notification))
            ->assertRedirect(route('notifications.index', ['page' => 1]));

        $this->assertDatabaseMissing('customer_notifications', [
            'id' => $notification->id,
        ]);
    }

    public function test_user_can_delete_selected_notifications_together(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $first = $this->makeNotification($user, 'First');
        $second = $this->makeNotification($user, 'Second');
        $keep = $this->makeNotification($user, 'Keep');

        $this->actingAs($user)
            ->delete(route('notifications.destroy-selected'), [
                'ids' => [$first->id, $second->id],
                'page' => 1,
            ])
            ->assertRedirect(route('notifications.index', ['page' => 1]));

        $this->assertDatabaseMissing('customer_notifications', ['id' => $first->id]);
        $this->assertDatabaseMissing('customer_notifications', ['id' => $second->id]);
        $this->assertDatabaseHas('customer_notifications', ['id' => $keep->id]);
    }

    public function test_user_cannot_delete_another_users_notification(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $otherUser = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $notification = $this->makeNotification($otherUser, 'Private notification');

        $this->actingAs($user)
            ->delete(route('notifications.destroy', $notification))
            ->assertNotFound();

        $this->assertDatabaseHas('customer_notifications', [
            'id' => $notification->id,
            'user_id' => $otherUser->id,
        ]);
    }

    private function makeNotification(User $user, string $title): CustomerNotification
    {
        return CustomerNotification::create([
            'user_id' => $user->id,
            'type' => 'order',
            'title' => $title,
            'message' => 'Test notification message',
        ]);
    }
}
