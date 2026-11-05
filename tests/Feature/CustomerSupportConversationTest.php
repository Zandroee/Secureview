<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerSupportConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_request_a_human_handoff_and_the_chat_transcript_is_saved(): void
    {
        $response = $this->postJson('/chatbot/handoff', [
            'reason' => 'The assistant could not answer my question.',
            'messages' => [
                ['role' => 'user', 'content' => 'Do you provide maintenance for an existing CCTV setup?'],
                ['role' => 'assistant', 'content' => 'I do not have enough information to confirm that.'],
                ['role' => 'user', 'content' => 'Please connect me with a person.'],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('conversation.status', 'waiting')
            ->assertJsonPath('messages.0.role', 'user')
            ->assertJsonPath('messages.2.role', 'user');

        $conversationId = $response->json('conversation.id');

        $this->assertDatabaseHas('support_conversations', [
            'id' => $conversationId,
            'status' => 'waiting',
            'user_id' => null,
        ]);

        $this->assertDatabaseHas('support_messages', [
            'conversation_id' => $conversationId,
            'sender_type' => 'assistant',
            'body' => 'I do not have enough information to confirm that.',
        ]);

        $this->getJson('/chatbot/conversation')
            ->assertOk()
            ->assertJsonPath('conversation.id', $conversationId)
            ->assertJsonPath('messages.2.content', 'Please connect me with a person.');

        $this->getJson('/chatbot/conversations/' . $conversationId)
            ->assertOk()
            ->assertJsonPath('conversation.id', $conversationId);
    }

    public function test_guest_cannot_read_another_guest_session_conversation(): void
    {
        $response = $this->postJson('/chatbot/handoff', [
            'messages' => [
                ['role' => 'user', 'content' => 'I would like to talk to the team.'],
            ],
        ])->assertOk();

        $conversationId = $response->json('conversation.id');

        $this->withSession(['netmax_support_guest_token' => str_repeat('x', 64)])
            ->getJson('/chatbot/conversations/' . $conversationId)
            ->assertNotFound();
    }

    public function test_customer_can_send_messages_after_handoff(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/chatbot/handoff', [
            'messages' => [
                ['role' => 'user', 'content' => 'I need help choosing a camera.'],
            ],
        ])->assertOk();

        $conversationId = $response->json('conversation.id');

        $this->postJson('/chatbot/conversations/' . $conversationId . '/messages', [
            'content' => 'The installation location is outdoors.',
        ])
            ->assertOk()
            ->assertJsonPath('conversation.status', 'waiting');

        $this->assertDatabaseHas('support_messages', [
            'conversation_id' => $conversationId,
            'sender_type' => 'customer',
            'body' => 'The installation location is outdoors.',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'support_chat',
            'title' => 'New customer chat message',
            'related_id' => $conversationId,
        ]);

    }

    public function test_admin_can_open_the_customer_conversation_inbox_and_reply(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/chatbot/handoff', [
            'messages' => [
                ['role' => 'user', 'content' => 'Can someone help me compare two camera models?'],
            ],
        ])->assertOk();

        $conversationId = $response->json('conversation.id');

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'support_chat',
            'title' => 'New customer chat request',
            'related_id' => $conversationId,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.customer-conversations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/CustomerConversations')
                ->has('conversations', 1)
                ->where('conversations.0.id', $conversationId)
            );

        $this->actingAs($admin)
            ->postJson('/admin/customer-conversations/' . $conversationId . '/messages', [
                'content' => 'Hello! A team member can help you compare those cameras.',
            ])
            ->assertOk()
            ->assertJsonPath('conversation.status', 'active')
            ->assertJsonPath('messages.1.sender_type', 'admin');

        $this->assertDatabaseHas('support_conversations', [
            'id' => $conversationId,
            'status' => 'active',
            'assigned_admin_id' => $admin->id,
        ]);

        $this->assertDatabaseHas('support_messages', [
            'conversation_id' => $conversationId,
            'sender_type' => 'admin',
            'sender_id' => $admin->id,
            'body' => 'Hello! A team member can help you compare those cameras.',
        ]);    }

    public function test_non_admin_cannot_access_customer_conversation_inbox(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer)
            ->get(route('admin.customer-conversations.index'))
            ->assertForbidden();
    }

    public function test_admin_can_close_and_reopen_a_customer_conversation(): void
    {
        $response = $this->postJson('/chatbot/handoff', [
            'messages' => [
                ['role' => 'user', 'content' => 'I would like to speak with support.'],
            ],
        ])->assertOk();

        $conversationId = $response->json('conversation.id');
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson('/admin/customer-conversations/' . $conversationId . '/status', [
                'status' => 'closed',
            ])
            ->assertOk()
            ->assertJsonPath('conversation.status', 'closed');

        $this->actingAs($admin)
            ->patchJson('/admin/customer-conversations/' . $conversationId . '/status', [
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('conversation.status', 'active');

        $this->assertDatabaseHas('support_conversations', [
            'id' => $conversationId,
            'status' => 'active',
            'assigned_admin_id' => $admin->id,
        ]);
    }
}
