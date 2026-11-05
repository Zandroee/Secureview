<?php

namespace App\Http\Middleware;

use App\Models\CustomerNotification;
use App\Models\SupportConversation;
use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Prevent authenticated page payloads from being restored from browser or
     * intermediary caches after logout.
     */
    public function handle(Request $request, Closure $next)
    {
        $isAuthenticated = $request->user() !== null;
        $response = parent::handle($request, $next);

        if ($isAuthenticated) {
            $response->headers->set(
                'Cache-Control',
                'private, no-store, no-cache, must-revalidate, max-age=0'
            );
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $cartCount = 0;
        $notificationCount = 0;
        $latestNotification = null;
        $supportConversationCount = 0;

        if ($user) {
            if ($user->role === 'admin') {
                $supportConversationCount = SupportConversation::query()
                    ->whereIn('status', ['waiting', 'active'])
                    ->whereHas('messages', fn ($query) => $query
                        ->where('sender_type', 'customer')
                        ->whereNull('read_at'))
                    ->count();
            }
            $cartCount = $user->cart?->items()->sum('quantity') ?? 0;
            $visibleNotifications = $user->customerNotifications();
            if ($user->role === 'technician') {
                $visibleNotifications->where('type', '!=', 'new_order');
            }

            $notificationCount = (clone $visibleNotifications)
                ->whereNull('read_at')
                ->count();

            $latestNotification = (clone $visibleNotifications)
                ->whereNull('read_at')
                ->latest('id')
                ->first(['id', 'title', 'message', 'action_url']);
        }

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user,
            ],
            'cartCount' => $cartCount,
            'notificationCount' => $notificationCount,
            'latestNotification' => $latestNotification,
            'supportConversationCount' => $supportConversationCount,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'serviceNotification' => fn () => $request->session()->get('serviceNotification'),
                'status' => fn () => $request->session()->get('status'),
                'message' => fn () => $request->session()->get('message'),
                'verificationRequired' => fn () => $request->session()->get('verificationRequired', false),
                'verificationEmail' => fn () => $request->session()->get('verificationEmail'),
            ],
        ]);
    }
}
