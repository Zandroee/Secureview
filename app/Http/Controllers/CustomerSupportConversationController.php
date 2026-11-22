<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\SupportConversation;
use App\Models\User;
use App\Models\SupportMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerSupportConversationController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['sometimes', 'array', 'max:12'],
            'messages.*.role' => ['required_with:messages', 'in:user,assistant'],
            'messages.*.content' => ['required_with:messages', 'string', 'max:1500'],
            'reason' => ['nullable', 'string', 'max:180'],
        ]);

        $user = $request->user();
        $guestToken = $user ? null : $this->guestToken($request);
        $conversation = $this->ownedConversations($request, $guestToken)
            ->whereIn('status', ['waiting', 'active'])
            ->latest('last_message_at')
            ->first();

        if (!$conversation) {
            $firstCustomerMessage = collect($validated['messages'] ?? [])
                ->first(fn (array $message) => $message['role'] === 'user');

            $conversation = SupportConversation::create([
                'user_id' => $user?->id,
                'guest_token' => $guestToken,
                'status' => 'waiting',
                'subject' => Str::limit(
                    trim((string) ($firstCustomerMessage['content'] ?? $validated['reason'] ?? 'Website chat support')),
                    180
                ),
                'last_message_at' => now(),
                'last_customer_message_at' => now(),
            ]);

            foreach ($validated['messages'] ?? [] as $message) {
                $body = trim($message['content']);
                if ($body === '') {
                    continue;
                }

                $conversation->messages()->create([
                    'sender_type' => $message['role'] === 'user' ? 'customer' : 'assistant',
                    'sender_id' => $message['role'] === 'user' ? $user?->id : null,
                    'body' => $body,
                ]);
            }

            if ($conversation->messages()->doesntExist()) {
                $conversation->messages()->create([
                    'sender_type' => 'customer',
                    'sender_id' => $user?->id,
                    'body' => 'The visitor requested to speak with a member of the Netmax Trading team.',
                ]);
            }

            $this->notifyAdministrators(
                $conversation,
                'New customer chat request',
                'A visitor requested a live conversation with the Netmax Trading team.'
            );
        }

        return response()->json($this->payload($conversation->fresh(['assignedAdmin', 'messages.sender'])));
    }

    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $guestToken = $user ? null : $this->guestToken($request);

        $conversation = $this->ownedConversations($request, $guestToken)
            ->whereIn('status', ['waiting', 'active'])
            ->latest('last_message_at')
            ->first();

        if (!$conversation) {
            return response()->json(['conversation' => null]);
        }

        return response()->json(
            $this->payload($conversation->load(['assignedAdmin', 'messages.sender']))
        );
    }

    public function show(Request $request, SupportConversation $conversation): JsonResponse
    {
        abort_unless($this->owns($request, $conversation), 404);

        $conversation->load(['assignedAdmin', 'messages.sender']);

        // Messages sent by the support team are considered seen when the customer
        // refreshes the conversation in the open chat panel.
        $conversation->messages()
            ->whereIn('sender_type', ['admin'])
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($this->payload($conversation->fresh(['assignedAdmin', 'messages.sender'])));
    }

    public function store(Request $request, SupportConversation $conversation): JsonResponse
    {
        abort_unless($this->owns($request, $conversation), 404);
        abort_if($conversation->status === 'closed', 409, 'This support conversation has been closed. Start a new conversation to contact the team.');

        $validated = $request->validate([
            'content' => ['required', 'string', 'min:1', 'max:1500'],
        ]);

        $body = trim($validated['content']);
        if ($body === '') {
            return response()->json(['message' => 'Please enter a message.'], 422);
        }

        $user = $request->user();
        $conversation->messages()->create([
            'sender_type' => 'customer',
            'sender_id' => $user?->id,
            'body' => $body,
        ]);

        $conversation->forceFill([
            'last_message_at' => now(),
            'last_customer_message_at' => now(),
        ])->save();

        $customerLabel = $user?->name ?: 'A guest visitor';
        $this->notifyAdministrators(
            $conversation,
            'New customer chat message',
            $customerLabel . ' sent a new message in a support conversation.'
        );

        return response()->json(array_merge(
            $this->payload($conversation->fresh(['assignedAdmin', 'messages.sender'])),
            ['message' => 'Your message has been sent to the Netmax Trading team.']
        ));
    }


    private function notifyAdministrators(
        SupportConversation $conversation,
        string $title,
        string $message
    ): void {
        $administrators = User::query()
            ->where('role', 'admin')
            ->get(['id']);

        foreach ($administrators as $administrator) {
            CustomerNotification::create([
                'user_id' => $administrator->id,
                'type' => 'support_chat',
                'title' => $title,
                'message' => $message,
                'action_url' => route('admin.customer-conversations.index'),
                'related_type' => SupportConversation::class,
                'related_id' => $conversation->id,
            ]);
        }
    }

    private function ownedConversations(Request $request, ?string $guestToken)
    {
        if ($request->user()) {
            return SupportConversation::query()->where('user_id', $request->user()->id);
        }

        return SupportConversation::query()->where('guest_token', $guestToken);
    }

    private function owns(Request $request, SupportConversation $conversation): bool
    {
        if ($request->user()) {
            return (int) $conversation->user_id === (int) $request->user()->id
                || ($conversation->guest_token !== null
                    && hash_equals($conversation->guest_token, $this->guestToken($request)));
        }

        return $conversation->guest_token !== null
            && hash_equals($conversation->guest_token, $this->guestToken($request));
    }

    private function guestToken(Request $request): string
    {
        $token = $request->session()->get('netmax_support_guest_token');

        if (!is_string($token) || strlen($token) !== 64) {
            $token = Str::random(64);
            $request->session()->put('netmax_support_guest_token', $token);
        }

        return $token;
    }

    private function payload(SupportConversation $conversation): array
    {
        return [
            'conversation' => [
                'id' => $conversation->id,
                'status' => $conversation->status,
                'subject' => $conversation->subject,
                'assigned_admin_name' => $conversation->assignedAdmin?->name,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            ],
            'messages' => $conversation->messages
                ->sortBy('created_at')
                ->values()
                ->map(fn (SupportMessage $message) => [
                    'id' => $message->id,
                    'role' => match ($message->sender_type) {
                        'customer' => 'user',
                        'admin' => 'admin',
                        default => 'assistant',
                    },
                    'sender_name' => match ($message->sender_type) {
                        'customer' => 'You',
                        'admin' => $message->sender?->name ?: $conversation->assignedAdmin?->name ?: 'Netmax Trading Support',
                        default => 'Netmax Trading Assistant',
                    },
                    'content' => $message->body,
                    'created_at' => $message->created_at?->toIso8601String(),
                ]),
        ];
    }
}
