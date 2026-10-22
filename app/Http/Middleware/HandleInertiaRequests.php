<?php

namespace App\Http\Middleware;

use App\Models\CustomerNotification;
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

        if ($user) {
            $cartCount = $user->cart?->items()->sum('quantity') ?? 0;
            $notificationCount = $user->customerNotifications()
                ->whereNull('read_at')
                ->count();

            $latestNotification = $user->customerNotifications()
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
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'status' => fn () => $request->session()->get('status'),
                'message' => fn () => $request->session()->get('message'),
                'verificationRequired' => fn () => $request->session()->get('verificationRequired', false),
                'verificationEmail' => fn () => $request->session()->get('verificationEmail'),
            ],
        ]);
    }
}
