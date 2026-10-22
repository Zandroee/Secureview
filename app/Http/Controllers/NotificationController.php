<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    private const NOTIFICATIONS_PER_PAGE = 10;

    public function index(Request $request)
    {
        $notifications = $request->user()
            ->customerNotifications()
            ->latest()
            ->paginate(self::NOTIFICATIONS_PER_PAGE)
            ->through(function (CustomerNotification $notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'action_url' => $notification->action_url,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at?->format('M d, Y h:i A'),
                ];
            });

        return Inertia::render('notifications', [
            'notifications' => $notifications,
        ]);
    }

    public function storeAnnouncement(Request $request)
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $recipients = User::query()
            ->where('role', 'user')
            ->select('id')
            ->get();

        if ($recipients->isEmpty()) {
            return back()->withErrors([
                'announcement' => 'There are no customer accounts to receive this announcement yet.',
            ]);
        }

        foreach ($recipients as $recipient) {
            CustomerNotification::create([
                'user_id' => $recipient->id,
                'type' => 'announcement',
                'title' => $validated['title'],
                'message' => $validated['message'],
                'action_url' => null,
                'related_type' => 'announcement',
            ]);
        }

        return back()->with('success', 'Announcement sent to ' . $recipients->count() . ' customer account(s).');
    }

    public function markAsRead(Request $request, CustomerNotification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(404);
        }

        if (!$notification->read_at) {
            $notification->update([
                'read_at' => now(),
            ]);
        }

        $destination = $this->internalNotificationDestination(
            $notification->action_url,
            $request
        );

        if ($destination !== null) {
            return redirect()->to($destination);
        }

        return back();
    }

    public function destroy(Request $request, CustomerNotification $notification)
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $notification->delete();

        return $this->redirectToValidNotificationPage(
            $request,
            'Notification deleted.'
        );
    }

    public function destroySelected(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $user = $request->user();
        $requestedIds = array_map('intval', $validated['ids']);
        $ownedIds = $user->customerNotifications()
            ->whereIn('id', $requestedIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // Never delete another account's notifications, even if IDs are tampered with.
        if (count($ownedIds) !== count($requestedIds)) {
            abort(404);
        }

        $deletedCount = $user->customerNotifications()
            ->whereIn('id', $ownedIds)
            ->delete();

        return $this->redirectToValidNotificationPage(
            $request,
            $deletedCount . ' notification(s) deleted.'
        );
    }

    private function redirectToValidNotificationPage(Request $request, string $message)
    {
        $total = $request->user()->customerNotifications()->count();
        $requestedPage = max(1, (int) $request->input('page', $request->query('page', 1)));
        $lastPage = max(1, (int) ceil($total / self::NOTIFICATIONS_PER_PAGE));
        $page = min($requestedPage, $lastPage);

        return redirect()
            ->route('notifications.index', ['page' => $page])
            ->with('success', $message);
    }

    /**
     * Keep notification actions on this application.
     *
     * Some legacy rows may contain absolute URLs generated on a local
     * development machine (for example, https://localhost:8000/...). Convert
     * those to same-origin paths when a customer clicks them in production.
     * Also refuse unrelated external URLs to avoid open redirects.
     */
    private function internalNotificationDestination(?string $actionUrl, Request $request): ?string
    {
        if (!is_string($actionUrl) || trim($actionUrl) === '') {
            return null;
        }

        $actionUrl = trim($actionUrl);

        if (str_starts_with($actionUrl, '/') && !str_starts_with($actionUrl, '//')) {
            return $actionUrl;
        }

        $parts = parse_url($actionUrl);

        if (
            !is_array($parts)
            || !isset($parts['scheme'], $parts['host'])
            || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)
        ) {
            return null;
        }

        $host = strtolower($parts['host']);
        $currentHost = strtolower($request->getHost());
        $developmentHosts = ['localhost', '127.0.0.1', '::1'];

        if ($host !== $currentHost && !in_array($host, $developmentHosts, true)) {
            return null;
        }

        $path = $parts['path'] ?? '/';

        if (!str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return null;
        }

        if (isset($parts['query'])) {
            $path .= '?' . $parts['query'];
        }

        if (isset($parts['fragment'])) {
            $path .= '#' . $parts['fragment'];
        }

        return $path;
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()
            ->customerNotifications()
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);

        return back();
    }
}
