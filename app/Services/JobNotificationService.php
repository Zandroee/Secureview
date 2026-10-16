<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;

class JobNotificationService
{
    public function notifyUser(
        User $user,
        string $type,
        string $title,
        string $message,
        string $dedupeKey,
        ?string $actionUrl = null,
        ?Inquiry $inquiry = null
    ): void {
        CustomerNotification::firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $actionUrl,
                'related_type' => $inquiry ? Inquiry::class : null,
                'related_id' => $inquiry?->id,
            ]
        );
    }

    public function notifyStaff(
        Inquiry $inquiry,
        string $type,
        string $title,
        string $message,
        string $eventKey
    ): void {
        $technicianIds = $inquiry->technicians()->pluck('users.id')->all();

        if ($inquiry->technician_id) {
            $technicianIds[] = (int) $inquiry->technician_id;
        }

        $recipients = User::query()
            ->where(function ($query) use ($technicianIds) {
                $query->where('role', 'admin');

                if ($technicianIds !== []) {
                    $query->orWhereIn('id', array_unique($technicianIds));
                }
            })
            ->get();

        foreach ($recipients as $recipient) {
            $actionUrl = $recipient->isTechnician()
                ? route('staff.jobs.show', $inquiry)
                : route('admin.inquiries.show', $inquiry);

            $this->notifyUser(
                $recipient,
                $type,
                $title,
                $message,
                $eventKey . ':user:' . $recipient->id,
                $actionUrl,
                $inquiry
            );
        }
    }

    public function notifyCustomer(
        Inquiry $inquiry,
        string $type,
        string $title,
        string $message,
        string $eventKey
    ): void {
        if (!$inquiry->user_id) {
            return;
        }

        $this->notifyUser(
            $inquiry->user,
            $type,
            $title,
            $message,
            $eventKey . ':user:' . $inquiry->user_id,
            route('inquiries.show', $inquiry),
            $inquiry
        );
    }

    public function notifyJobParticipants(
        Inquiry $inquiry,
        string $type,
        string $title,
        string $message,
        string $eventKey,
        bool $includeCustomer = true
    ): void {
        $this->notifyStaff($inquiry, $type, $title, $message, $eventKey);

        if ($includeCustomer) {
            $this->notifyCustomer($inquiry, $type, $title, $message, $eventKey);
        }
    }
}
