<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\ServiceRecord;
use App\Models\ServiceRecordItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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
        Inquiry::escalateOverdueUrgency();

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:confirmed,in_progress'],
            'technician' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $query = Inquiry::with(['user', 'technicians'])
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
            $query->whereHas('technicians', fn ($builder) => $builder->where('users.id', $filters['technician']));
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
                    'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                    'preferred_time' => $inquiry->preferred_time,
                    'city' => $inquiry->city,
                    'street_address' => $inquiry->street_address,
                    'address_details' => $inquiry->address_details,
                    'service_latitude' => $inquiry->service_latitude,
                    'service_longitude' => $inquiry->service_longitude,
                    'google_place_id' => $inquiry->google_place_id,
                    'status' => $inquiry->status,
                    'reschedule_requested_date' => $inquiry->reschedule_requested_date?->format('Y-m-d'),
                    'reschedule_requested_time' => $inquiry->reschedule_requested_time,
                    'reschedule_request_status' => $inquiry->reschedule_request_status ?? 'none',
                    'reschedule_request_note' => $inquiry->reschedule_request_note,
                    'technician' => $inquiry->technicians->first()
                        ? [
                            'id' => $inquiry->technicians->first()->id,
                            'name' => $inquiry->technicians->first()->name,
                            'email' => $inquiry->technicians->first()->email,
                        ]
                        : null,
                    'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                        'id' => $technician->id,
                        'name' => $technician->name,
                        'email' => $technician->email,
                    ])->values(),
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

        // A technician can take only one service per day. Count every assigned job
        // (including pending inquiries that already have a technician); unassigned
        // pending inquiries do not consume technician capacity.
        $technicianCount = $technicians->count();
        $assignedScheduleBookings = Inquiry::query()
            ->with('technicians:id')
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->whereDate('preferred_date', '>=', today())
            ->get(['id', 'technician_id', 'preferred_date', 'preferred_time']);

        $assignedTechnicianIds = function (Inquiry $job) {
            $ids = $job->technicians->pluck('id')->map(fn ($id) => (int) $id);
            if ($job->technician_id) {
                $ids->push((int) $job->technician_id);
            }

            return $ids->unique()->values();
        };

        $busyTechniciansByDate = $assignedScheduleBookings
            ->groupBy(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d'))
            ->map(fn ($jobs) => $jobs->flatMap($assignedTechnicianIds)->unique()->count());

        $manualDateKeys = $blockedBookingDates->pluck('booking_date')->map(fn ($date) => (string) $date);
        $capacityBlockedDateKeys = $busyTechniciansByDate
            ->filter(fn ($busyCount) => $technicianCount === 0 || $busyCount >= $technicianCount)
            ->keys()
            ->map(fn ($date) => Carbon::parse($date)->toDateString());

        $automaticBlockedDates = $capacityBlockedDateKeys
            ->reject(fn ($date) => $manualDateKeys->contains($date))
            ->map(fn ($date) => [
                'id' => 'capacity-' . $date,
                'booking_date' => $date,
                'formatted_date' => Carbon::parse($date)->format('F j, Y'),
                'reason' => 'Automatically blocked: every technician already has a service scheduled that day.',
                'is_automatic' => true,
            ])
            ->values();

        $blockedBookingDates = $blockedBookingDates
            ->concat($automaticBlockedDates)
            ->sortBy('booking_date')
            ->values();

        // When all technicians are occupied for the day, display all three slots
        // as unavailable too. This matches the one-service-per-technician-per-day rule.
        $manualSlotKeys = $blockedBookingTimeSlots->map(
            fn ($slot) => $slot['booking_date'] . '|' . $slot['booking_time']
        );
        $automaticBlockedSlots = $capacityBlockedDateKeys
            ->flatMap(function ($date) use ($manualSlotKeys) {
                return collect(self::BOOKING_TIME_SLOTS)
                    ->map(function ($time) use ($date) {
                        return [
                            'id' => 'capacity-' . $date . '-' . md5($time),
                            'booking_date' => $date,
                            'formatted_date' => Carbon::parse($date)->format('F j, Y'),
                            'booking_time' => $time,
                            'reason' => 'Automatically blocked: every technician already has a service scheduled that day.',
                            'is_automatic' => true,
                        ];
                    })
                    ->reject(fn ($slot) => $manualSlotKeys->contains(
                        $slot['booking_date'] . '|' . $slot['booking_time']
                    ));
            })
            ->values();

        $blockedBookingTimeSlots = $blockedBookingTimeSlots
            ->concat($automaticBlockedSlots)
            ->sortBy(fn ($slot) => $slot['booking_date'] . '|' . $slot['booking_time'])
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
                    ->whereDoesntHave('technicians')
                    ->count(),
            ],
        ]);
    }

    public function show(Request $request, Inquiry $inquiry)
    {
        Inquiry::escalateOverdueUrgency();

        $fromHistory = $request->query('from') === 'history';
        $inquiry->load(['user', 'inquirable', 'technician', 'technicians']);

        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();

        return Inertia::render($fromHistory ? 'Admin/InquiryDetails' : 'Admin/ScheduleDetails', [
            'inquiry' => [
                'id' => $inquiry->id,
                'inquiry_number' => $inquiry->inquiry_number,
                'item_name' => $inquiry->item_name,
                'item_type' => $inquiry->inquirable_type
                    ? class_basename($inquiry->inquirable_type)
                    : null,
                'item_image' => $inquiry->inquirable?->image,
                'customer_name' => $inquiry->customer_name,
                'customer_phone' => $inquiry->customer_phone,
                'customer_email' => $inquiry->customer_email,
                'technician' => $inquiry->technician
                    ? [
                        'id' => $inquiry->technician->id,
                        'name' => $inquiry->technician->name,
                        'email' => $inquiry->technician->email,
                    ]
                    : null,
                'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                    'id' => $technician->id,
                    'name' => $technician->name,
                    'email' => $technician->email,
                ])->values(),
                'street_address' => $inquiry->street_address,
                'address_details' => $inquiry->address_details,
                'city' => $inquiry->city,
                'service_latitude' => $inquiry->service_latitude,
                'service_longitude' => $inquiry->service_longitude,
                'google_place_id' => $inquiry->google_place_id,
                'service_type' => $inquiry->service_type,
                'urgency' => $inquiry->urgency,
                'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                'preferred_time' => $inquiry->preferred_time,
                'notes' => $inquiry->notes,
                'status' => $inquiry->status,
                'service_record_exists' => $inquiry->serviceRecord()->exists(),
                'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                'user_id' => $inquiry->user_id,
            ],
            'technicians' => $technicians,
            'bookingTimeSlots' => self::BOOKING_TIME_SLOTS,
            'todayDate' => today()->toDateString(),
            'fromSchedule' => !$fromHistory,
            'fromHistory' => $fromHistory,
        ]);
    }

    public function history(Request $request)
    {
        Inquiry::escalateOverdueUrgency();

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $query = Inquiry::query()
            ->with(['technicians', 'serviceRecord.technician', 'serviceRecord.items'])
            ->where('status', 'completed');

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

        $services = $query
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString()
            ->through(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'customer_name' => $inquiry->customer_name,
                    'customer_email' => $inquiry->customer_email,
                    'service_type' => $inquiry->service_type,
                    'item_name' => $inquiry->item_name,
                    'urgency' => $inquiry->urgency,
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                    'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                    'preferred_time' => $inquiry->preferred_time,
                    'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                        'id' => $technician->id,
                        'name' => $technician->name,
                    ])->values(),
                    'completed_at' => $inquiry->serviceRecord?->completed_at?->format('M d, Y h:i A')
                        ?? $inquiry->updated_at?->format('M d, Y h:i A'),
                    'service_record' => $inquiry->serviceRecord ? [
                        'id' => $inquiry->serviceRecord->id,
                        'technician_name' => $inquiry->serviceRecord->technician?->name,
                        'work_summary' => $inquiry->serviceRecord->work_summary,
                        'labor_charge' => (float) $inquiry->serviceRecord->labor_charge,
                        'additional_charge' => (float) $inquiry->serviceRecord->additional_charge,
                        'total_income' => (float) $inquiry->serviceRecord->total_income,
                        'items' => $inquiry->serviceRecord->items->map(fn ($item) => [
                            'product_name' => $item->product_name,
                            'action' => $item->action,
                            'quantity' => (int) $item->quantity,
                            'unit_price' => (float) $item->unit_price,
                        ])->values(),
                    ] : null,
                ];
            });

        return Inertia::render('Admin/ServiceHistory', [
            'services' => $services,
            'serviceIncomeSummary' => [
                'recorded_service_income' => (float) ServiceRecord::query()->sum('total_income'),
                'service_records' => ServiceRecord::query()->count(),
                'completed_without_record' => Inquiry::query()->where('status', 'completed')->whereDoesntHave('serviceRecord')->count(),
                'parts_revenue' => (float) (ServiceRecordItem::query()->where('action', 'used')
                    ->selectRaw('COALESCE(SUM(quantity * unit_price), 0) as amount')->value('amount') ?? 0),
            ],
            'filters' => [
                'search' => $filters['search'] ?? '',
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
    public function updateSchedule(Request $request, Inquiry $inquiry)
    {
        if (!in_array($inquiry->status, ['confirmed', 'in_progress'], true)) {
            return back()->withErrors(['schedule' => 'Only confirmed or in-progress services can be rescheduled.']);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
        ]);

        if ($this->dateUnavailableByTechnicianCapacity($validated['preferred_date'], $inquiry->id)) {
            throw ValidationException::withMessages([
                'preferred_date' => 'No technicians are available on that date. Every technician is already scheduled for another service.',
            ]);
        }

        $this->assertSlotIsOpen($validated['preferred_date'], $validated['preferred_time'], $inquiry);

        $technicianIds = $inquiry->technicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $this->assertTechniciansAvailable($technicianIds, $validated['preferred_date'], $validated['preferred_time'], $inquiry);

        $inquiry->update([
            'preferred_date' => $validated['preferred_date'],
            'preferred_time' => $validated['preferred_time'],
            'reschedule_requested_date' => null,
            'reschedule_requested_time' => null,
            'reschedule_request_status' => 'none',
            'reschedule_request_note' => null,
            'reschedule_requested_at' => null,
        ]);

        if ($inquiry->user_id) {
            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'schedule_updated',
                'title' => 'Service schedule updated',
                'message' => 'Your service ' . $inquiry->inquiry_number . ' is now scheduled for ' . $inquiry->preferred_date->format('F j, Y') . ' (' . $inquiry->preferred_time . ').',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        }

        return back()->with('success', 'Service schedule updated successfully.');
    }

    public function approveReschedule(Request $request, Inquiry $inquiry)
    {
        if ($inquiry->status !== 'confirmed' || ($inquiry->reschedule_request_status ?? 'none') !== 'pending') {
            return back()->withErrors(['reschedule' => 'There is no pending customer reschedule request to approve.']);
        }

        $date = $inquiry->reschedule_requested_date?->format('Y-m-d');
        $time = $inquiry->reschedule_requested_time;
        if (!$date || !$time) {
            return back()->withErrors(['reschedule' => 'The requested date or time is missing.']);
        }

        if ($this->dateUnavailableByTechnicianCapacity($date, $inquiry->id)) {
            throw ValidationException::withMessages([
                'reschedule' => 'No technicians are available on that date. Every technician is already scheduled for another service.',
            ]);
        }

        $this->assertSlotIsOpen($date, $time, $inquiry);
        $technicianIds = $inquiry->technicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $this->assertTechniciansAvailable($technicianIds, $date, $time, $inquiry);

        DB::transaction(function () use ($inquiry, $date, $time, $request) {
            $inquiry->newQuery()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();
            $inquiry->update([
                'preferred_date' => $date,
                'preferred_time' => $time,
                'reschedule_requested_date' => null,
                'reschedule_requested_time' => null,
                'reschedule_request_status' => 'approved',
                'reschedule_request_note' => null,
                'reschedule_requested_at' => null,
            ]);
            if ($inquiry->user_id) {
                CustomerNotification::create([
                    'user_id' => $inquiry->user_id,
                    'type' => 'reschedule_approved',
                    'title' => 'Reschedule request approved',
                    'message' => 'Your service ' . $inquiry->inquiry_number . ' has been rescheduled to ' . $inquiry->preferred_date->format('F j, Y') . ' (' . $inquiry->preferred_time . ').',
                    'action_url' => route('inquiries.show', $inquiry),
                    'related_type' => Inquiry::class,
                    'related_id' => $inquiry->id,
                ]);
            }
        });

        return back()->with('success', 'Customer reschedule request approved.');
    }

    public function declineReschedule(Request $request, Inquiry $inquiry)
    {
        if (($inquiry->reschedule_request_status ?? 'none') !== 'pending') {
            return back()->withErrors(['reschedule' => 'There is no pending reschedule request to decline.']);
        }

        $inquiry->update(['reschedule_request_status' => 'declined']);
        if ($inquiry->user_id) {
            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'reschedule_declined',
                'title' => 'Reschedule request declined',
                'message' => 'Your reschedule request for ' . $inquiry->inquiry_number . ' was declined. Your original appointment remains scheduled.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        }

        return back()->with('success', 'Reschedule request declined. The original schedule remains unchanged.');
    }

    private function assertSlotIsOpen(string $date, string $time, Inquiry $inquiry): void
    {
        if (BlockedBookingDate::query()->whereDate('booking_date', $date)->exists()) {
            throw ValidationException::withMessages(['preferred_date' => 'That date is marked fully booked.']);
        }
        if (BlockedBookingTimeSlot::query()->whereDate('booking_date', $date)->where('booking_time', $time)->exists()) {
            throw ValidationException::withMessages(['preferred_time' => 'That time slot is marked fully booked.']);
        }
    }

    private function assertTechniciansAvailable(array $technicianIds, string $date, string $time, Inquiry $inquiry): void
    {
        if (empty($technicianIds)) {
            return;
        }

        $conflicts = User::query()
            ->whereIn('id', $technicianIds)
            ->where(function ($technicianQuery) use ($date, $inquiry) {
                $assignedOnDate = function ($query) use ($date, $inquiry) {
                    $query->whereDate('preferred_date', $date)
                        ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                        ->where('inquiries.id', '!=', $inquiry->id);
                };

                $technicianQuery
                    ->whereHas('assignedInquiries', $assignedOnDate)
                    ->orWhereHas('technicianInquiries', $assignedOnDate);
            })
            ->pluck('name')
            ->all();

        if ($conflicts) {
            throw ValidationException::withMessages([
                'preferred_date' => 'The assigned technician team already has another service on this date: ' . implode(', ', $conflicts) . '. Choose another date or team.',
            ]);
        }
    }


    private function dateUnavailableByTechnicianCapacity(string $date, ?int $exceptInquiryId = null): bool
    {
        $technicianCount = User::query()->where('role', 'technician')->count();
        if ($technicianCount === 0) {
            return true;
        }

        $busyCount = User::query()
            ->where('role', 'technician')
            ->where(function ($technicianQuery) use ($date, $exceptInquiryId) {
                $assignedOnDate = function ($query) use ($date, $exceptInquiryId) {
                    $query->whereDate('preferred_date', $date)
                        ->whereIn('status', ['pending', 'confirmed', 'in_progress']);

                    if ($exceptInquiryId !== null) {
                        $query->where('inquiries.id', '!=', $exceptInquiryId);
                    }
                };

                $technicianQuery
                    ->whereHas('assignedInquiries', $assignedOnDate)
                    ->orWhereHas('technicianInquiries', $assignedOnDate);
            })
            ->count();

        return $busyCount >= $technicianCount;
    }
}
