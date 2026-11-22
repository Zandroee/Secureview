<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerConversationsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/CustomerConversations', [
            'conversations' => $this->conversationList(),
        ]);
    }

    public function list(): JsonResponse
    {
        return response()->json([
            'conversations' => $this->conversationList(),
        ]);
    }

    public function show(SupportConversation $conversation): JsonResponse
    {
        $conversation->messages()
            ->where('sender_type', 'customer')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($this->conversationPayload(
            $conversation->fresh(['user', 'assignedAdmin', 'messages.sender'])
        ));
    }

    public function reply(Request $request, SupportConversation $conversation): JsonResponse
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'min:1', 'max:1500'],
        ]);

        $body = trim($validated['content']);
        if ($body === '') {
            return response()->json(['message' => 'Please enter a message.'], 422);
        }

        $conversation->messages()->create([
            'sender_type' => 'admin',
            'sender_id' => $request->user()->id,
            'body' => $body,
        ]);

        $conversation->forceFill([
            'status' => 'active',
            'assigned_admin_id' => $conversation->assigned_admin_id ?: $request->user()->id,
            'closed_at' => null,
            'last_message_at' => now(),
        ])->save();

        return response()->json($this->conversationPayload(
            $conversation->fresh(['user', 'assignedAdmin', 'messages.sender'])
        ));
    }

    public function updateStatus(Request $request, SupportConversation $conversation): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:waiting,active,closed'],
        ]);

        $status = $validated['status'];
        $conversation->forceFill([
            'status' => $status,
            'assigned_admin_id' => $status === 'active'
                ? ($conversation->assigned_admin_id ?: $request->user()->id)
                : $conversation->assigned_admin_id,
            'closed_at' => $status === 'closed' ? now() : null,
        ])->save();

        return response()->json($this->conversationPayload(
            $conversation->fresh(['user', 'assignedAdmin', 'messages'])
        ));
    }

    private function conversationList(): array
    {
        return SupportConversation::query()
            ->with(['user:id,name,email', 'assignedAdmin:id,name'])
            ->withCount([
                'messages as unread_customer_messages_count' => fn ($query) => $query
                    ->where('sender_type', 'customer')
                    ->whereNull('read_at'),
            ])
            ->latest('last_message_at')
            ->limit(60)
            ->get()
            ->map(function (SupportConversation $conversation) {
                $latestMessage = $conversation->messages()->latest('id')->first();

                return [
                    'id' => $conversation->id,
                    'subject' => $conversation->subject ?: 'Website chat support',
                    'status' => $conversation->status,
                    'customer_name' => $conversation->user?->name ?: 'Guest visitor',
                    'customer_email' => $conversation->user?->email,
                    'assigned_admin_name' => $conversation->assignedAdmin?->name,
                    'unread_count' => (int) $conversation->unread_customer_messages_count,
                    'last_message' => $latestMessage?->body,
                    'last_message_sender' => $latestMessage?->sender_type,
                    'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    private function conversationPayload(SupportConversation $conversation): array
    {
        return [
            'conversation' => [
                'id' => $conversation->id,
                'subject' => $conversation->subject ?: 'Website chat support',
                'status' => $conversation->status,
                'customer_name' => $conversation->user?->name ?: 'Guest visitor',
                'customer_email' => $conversation->user?->email,
                'assigned_admin_name' => $conversation->assignedAdmin?->name,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            ],
            'messages' => $conversation->messages
                ->sortBy('created_at')
                ->values()
                ->map(fn (SupportMessage $message) => [
                    'id' => $message->id,
                    'sender_type' => $message->sender_type,
                    'sender_name' => $message->sender_type === 'admin'
                        ? ($message->sender?->name ?: 'Netmax Trading Support')
                        : ($message->sender_type === 'customer' ? 'Customer' : 'Netmax Trading Assistant'),
                    'body' => $message->body,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])
                ->all(),
        ];
    }
}
