<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    private const BOOKING_TIME_SLOTS = [
        '08:00 AM - 11:00 AM',
        '11:00 AM - 02:00 PM',
        '02:00 PM - 05:00 PM',
    ];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:confirmed,in_progress'],
            'technician' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $query = Inquiry::with(['user', 'technician'])
            ->whereIn('status', ['confirmed', 'in_progress']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('inquiry_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('service_type', 'like', '%' . $search . '%')
                    ->orWhere('item_name', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['technician'])) {
            $query->where('technician_id', $filters['technician']);
        }

        $schedules = $query
            ->orderByRaw("CASE urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString()
            ->through(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'customer_name' => $inquiry->customer_name,
                    'customer_phone' => $inquiry->customer_phone,
                    'service_type' => $inquiry->service_type,
                    'item_name' => $inquiry->item_name,
                    'urgency' => $inquiry->urgency,
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                    'preferred_time' => $inquiry->preferred_time,
                    'city' => $inquiry->city,
                    'status' => $inquiry->status,
                    'technician' => $inquiry->technician
                        ? [
                            'id' => $inquiry->technician->id,
                            'name' => $inquiry->technician->name,
                            'email' => $inquiry->technician->email,
                        ]
                        : null,
                ];
            });

        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();
            

        $blockedBookingDates = BlockedBookingDate::query()
            ->whereDate('booking_date', '>=', today())
            ->orderBy('booking_date')
            ->get()
            ->map(fn (BlockedBookingDate $blockedDate) => [
                'id' => $blockedDate->id,
                'booking_date' => $blockedDate->booking_date->format('Y-m-d'),
                'formatted_date' => $blockedDate->booking_date->format('F j, Y'),
                'reason' => $blockedDate->reason,
            ])
            ->values();

        $blockedBookingTimeSlots = BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', '>=', today())
            ->orderBy('booking_date')
            ->orderBy('booking_time')
            ->get()
            ->map(fn (BlockedBookingTimeSlot $blockedSlot) => [
                'id' => $blockedSlot->id,
                'booking_date' => $blockedSlot->booking_date->format('Y-m-d'),
                'formatted_date' => $blockedSlot->booking_date->format('F j, Y'),
                'booking_time' => $blockedSlot->booking_time,
                'reason' => $blockedSlot->reason,
            ])
            ->values();

        return Inertia::render('Admin/Schedules', [
            'schedules' => $schedules,
            'blockedBookingDates' => $blockedBookingDates,
            'blockedBookingTimeSlots' => $blockedBookingTimeSlots,
            'bookingTimeSlots' => self::BOOKING_TIME_SLOTS,
            'todayDate' => today()->toDateString(),
            'technicians' => $technicians,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'technician' => $filters['technician'] ?? '',
            ],
            'summary' => [
                'active' => Inquiry::whereIn('status', ['confirmed', 'in_progress'])->count(),
                'confirmed' => Inquiry::where('status', 'confirmed')->count(),
                'in_progress' => Inquiry::where('status', 'in_progress')->count(),
                'unassigned' => Inquiry::whereIn('status', ['confirmed', 'in_progress'])
                    ->whereNull('technician_id')
                    ->count(),
            ],
        ]);
    }

    public function storeBookingDateBlock(Request $request)
    {
        $blockType = $request->input('block_type', 'full_date');

        $validated = $request->validate([
            'block_type' => ['nullable', 'in:full_date,time_slot'],
            'booking_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'booking_time' => ['nullable', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($blockType === 'time_slot') {
            if (empty($validated['booking_time'])) {
                return redirect()
                    ->route('admin.schedules.index')
                    ->withErrors(['booking_time' => 'Choose a time slot to mark fully booked.']);
            }

            if (BlockedBookingDate::query()
                ->whereDate('booking_date', $validated['booking_date'])
                ->exists()) {
                return redirect()
                    ->route('admin.schedules.index')
                    ->withErrors(['booking_date' => 'This entire date is already marked fully booked.']);
            }

            BlockedBookingTimeSlot::query()->updateOrCreate(
                [
                    'booking_date' => $validated['booking_date'],
                    'booking_time' => $validated['booking_time'],
                ],
                [
                    'reason' => filled($validated['reason'] ?? null) ? $validated['reason'] : null,
                    'blocked_by' => $request->user()->id,
                ]
            );

            return redirect()
                ->route('admin.schedules.index')
                ->with('success', 'The selected time slot is now fully booked.');
        }

        BlockedBookingDate::query()->updateOrCreate(
            ['booking_date' => $validated['booking_date']],
            [
                'reason' => filled($validated['reason'] ?? null) ? $validated['reason'] : null,
                'blocked_by' => $request->user()->id,
            ]
        );

        return redirect()
            ->route('admin.schedules.index')
            ->with('success', 'The selected date is now marked fully booked.');
    }

    public function destroyBookingDateBlock(Request $request, BlockedBookingDate $blockedBookingDate)
    {
        $blockedBookingDate->delete();

        return redirect()
            ->route('admin.schedules.index')
            ->with('success', 'The selected date is available for booking again.');
    }

    public function destroyBookingTimeSlot(Request $request, BlockedBookingTimeSlot $blockedBookingTimeSlot)
    {
        $blockedBookingTimeSlot->delete();

        return redirect()
            ->route('admin.schedules.index')
            ->with('success', 'The selected time slot is available for booking again.');
    }
}
