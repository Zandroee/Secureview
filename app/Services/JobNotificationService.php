<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;

class JobNotificationService
{
    public function notifyAdmins(
        Inquiry $inquiry,
        string $type,
        string $title,
        string $message
    ): void {
        $adminIds = User::query()->where('role', 'admin')->pluck('id')->all();
        $this->notifyUsers($inquiry, $adminIds, $type, $title, $message);
    }

    public function notifyTechnicians(
        Inquiry $inquiry,
        array $technicianIds,
        string $type,
        string $title,
        string $message
    ): void {
        $validIds = User::query()
            ->where('role', 'technician')
            ->whereIn('id', $technicianIds)
            ->pluck('id')
            ->all();

        $this->notifyUsers($inquiry, $validIds, $type, $title, $message);
    }

    public function notifyJobTeam(
        Inquiry $inquiry,
        string $type,
        string $title,
        string $message
    ): void {
        $inquiry->loadMissing('assignedTechnicians');

        $recipientIds = User::query()
            ->where('role', 'admin')
            ->pluck('id')
            ->all();

        $recipientIds = array_merge(
            $recipientIds,
            $inquiry->assignedTechnicians->pluck('id')->all()
        );

        if ($inquiry->technician_id) {
            $recipientIds[] = (int) $inquiry->technician_id;
        }

        $this->notifyUsers(
            $inquiry,
            array_values(array_unique(array_map('intval', $recipientIds))),
            $type,
            $title,
            $message
        );
    }

    public function notifyUser(
        Inquiry $inquiry,
        User $recipient,
        string $type,
        string $title,
        string $message
    ): void {
        $this->notifyUsers($inquiry, [$recipient->id], $type, $title, $message);
    }

    private function notifyUsers(
        Inquiry $inquiry,
        array $userIds,
        string $type,
        string $title,
        string $message
    ): void {
        $users = User::query()
            ->whereIn('id', array_values(array_unique(array_map('intval', $userIds))))
            ->get(['id', 'role']);

        foreach ($users as $user) {
            CustomerNotification::create([
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $user->role === 'admin'
                    ? route('admin.inquiries.show', $inquiry)
                    : route('staff.jobs.index'),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        }
    }
}
