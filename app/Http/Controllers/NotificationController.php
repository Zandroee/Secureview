<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->customerNotifications()
            ->latest()
            ->get()
            ->map(function (CustomerNotification $notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'action_url' => $notification->action_url,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at?->format('M d, Y h:i A'),
                ];
            })
            ->values();

        return Inertia::render('notifications', [
            'notifications' => $notifications,
        ]);
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

        if ($notification->action_url) {
            return redirect($notification->action_url);
        }

        return back();
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
