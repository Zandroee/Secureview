<?php

namespace App\Http\Controllers;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\ServiceRecord;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TechnicianWorkspaceController extends Controller
{
    private const MAX_TECHNICIANS_PER_JOB = 10;

    public function index(Request $request)
    {
        Inquiry::escalateOverdueUrgency();

        $technician = $request->user();

        $jobs = $technician->assignedInquiries()
            ->with(['technicians:id,name,email', 'serviceRecord.items'])
            ->whereIn('status', ['confirmed', 'in_progress', 'completed'])
            ->orderByRaw("CASE WHEN status = 'completed' THEN 4 WHEN urgency = 'emergency' THEN 1 WHEN urgency = 'urgent' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE WHEN status = 'completed' THEN preferred_date END DESC")
            ->orderByRaw("CASE WHEN status != 'completed' THEN preferred_date END ASC")
            ->limit(100)
            ->get()
            ->map(fn (Inquiry $inquiry) => $this->jobData($inquiry, true))
            ->values();

        $busySlots = $technician->assignedInquiries()
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->get(['preferred_date', 'preferred_time'])
            ->map(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d') . '|' . $job->preferred_time)
            ->all();

        $openJobs = Inquiry::query()
            ->with('technicians:id,name,email')
            ->where('status', 'confirmed')
            ->whereDate('preferred_date', '>=', today())
            ->whereDoesntHave('technicians', fn ($query) => $query->where('users.id', $technician->id))
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->limit(50)
            ->get()
            ->filter(function (Inquiry $inquiry) use ($busySlots) {
                $start = $this->appointmentDateTime($inquiry);

                return $start
                    && $start->isFuture()
                    && $inquiry->technicians->count() < self::MAX_TECHNICIANS_PER_JOB
                    && !in_array($inquiry->preferred_date?->format('Y-m-d') . '|' . $inquiry->preferred_time, $busySlots, true);
            })
            ->map(fn (Inquiry $inquiry) => $this->jobData($inquiry, false))
            ->values();

        $inventory = Product::query()
            ->orderBy('name')
            ->get(['id', 'name', 'category', 'stock_quantity', 'image', 'images'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'stock_quantity' => $product->stock_quantity,
                'image' => $product->image,
                'images' => $product->images,
            ])
            ->values();

        $recentNotifications = $technician->customerNotifications()
            ->latest('id')
            ->limit(50)
            ->get(['id', 'type', 'title', 'message', 'read_at', 'created_at'])
            ->map(fn (CustomerNotification $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'read' => $notification->read_at !== null,
                'created_at' => $notification->created_at?->diffForHumans() ?? '',
            ])
            ->values();

        return Inertia::render('Technician/Workspace', [
            'jobs' => $jobs,
            'openJobs' => $openJobs,
            'inventory' => $inventory,
            'recentNotifications' => $recentNotifications,
        ]);
    }

    public function claimJob(Request $request, Inquiry $inquiry, JobNotificationService $notifications)
    {
        $technician = $request->user();

        if (!$inquiry->paymentAllowsTechnicianWork()) {
            return back()->withErrors(['job' => 'Payment must be confirmed before a technician can join this service.']);
        }

        $appointmentStart = $this->appointmentDateTime($inquiry);

        if (
            $inquiry->status !== 'confirmed'
            || !$appointmentStart
            || !$appointmentStart->isFuture()
        ) {
            return back()->withErrors([
                'job' => 'This job is no longer available to join.',
            ]);
        }

        if ($inquiry->technicians()->where('users.id', $technician->id)->exists()) {
            return back()->withErrors([
                'job' => 'You are already assigned to this job.',
            ]);
        }

        if ($inquiry->technicians()->count() >= self::MAX_TECHNICIANS_PER_JOB) {
            return back()->withErrors([
                'job' => 'This job has reached the maximum team size.',
            ]);
        }

        $hasConflict = $technician->assignedInquiries()
            ->whereDate('preferred_date', $inquiry->preferred_date)
            ->where('preferred_time', $inquiry->preferred_time)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->exists();

        if ($hasConflict) {
            return back()->withErrors([
                'job' => 'You already have a job scheduled in this time slot.',
            ]);
        }

        DB::transaction(function () use ($inquiry, $technician, $notifications) {
            $lockedTechnician = User::query()
                ->whereKey($technician->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedInquiry = Inquiry::query()
                ->whereKey($inquiry->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (!$lockedInquiry->paymentAllowsTechnicianWork()) {
                throw ValidationException::withMessages([
                    'job' => 'Payment must be confirmed before a technician can join this service.',
                ]);
            }

            $lockedAppointmentStart = $this->appointmentDateTime($lockedInquiry);

            if (
                $lockedInquiry->status !== 'confirmed'
                || !$lockedAppointmentStart
                || !$lockedAppointmentStart->isFuture()
            ) {
                throw ValidationException::withMessages([
                    'job' => 'This job is no longer available to join.',
                ]);
            }

            $hasConflictAfterLock = $lockedTechnician->assignedInquiries()
                ->whereDate('preferred_date', $lockedInquiry->preferred_date)
                ->where('preferred_time', $lockedInquiry->preferred_time)
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->where('inquiries.id', '!=', $lockedInquiry->getKey())
                ->exists();

            if ($hasConflictAfterLock) {
                throw ValidationException::withMessages([
                    'job' => 'You now have another job in this time slot and cannot join this one.',
                ]);
            }

            if ($lockedInquiry->technicians()->where('users.id', $lockedTechnician->id)->exists()) {
                throw ValidationException::withMessages([
                    'job' => 'You are already assigned to this job.',
                ]);
            }

            if ($lockedInquiry->technicians()->count() >= self::MAX_TECHNICIANS_PER_JOB) {
                throw ValidationException::withMessages([
                    'job' => 'This job has reached the maximum team size.',
                ]);
            }

            $lockedInquiry->technicians()->attach($lockedTechnician->id, [
                'assigned_by' => $lockedTechnician->id,
            ]);

            $lockedInquiry->load('technicians');
            $notifications->notifyAssignmentsChanged($lockedInquiry, [$lockedTechnician->id]);
            $notifications->notifyTechnicianJoined($lockedInquiry, $lockedTechnician);

            CustomerNotification::create([
                'user_id' => $lockedInquiry->user_id,
                'type' => 'technician_assignment',
                'title' => 'Technician team updated',
                'message' => $lockedTechnician->name . ' joined the team for service ' . $lockedInquiry->inquiry_number . '.',
                'action_url' => route('inquiries.show', $lockedInquiry),
                'related_type' => Inquiry::class,
                'related_id' => $lockedInquiry->id,
            ]);
        });

        return back()->with('success', 'You have joined the service team.');
    }

    public function updateJobStatus(
        Request $request,
        Inquiry $inquiry,
        JobNotificationService $notifications
    ) {
        $validated = $request->validate([
            'status' => ['required', 'in:in_progress,completed'],
        ]);

        $technician = $request->user();
        $assignment = $inquiry->technicians()
            ->where('users.id', $technician->id)
            ->first();

        if (!$assignment) {
            abort(403);
        }

        $oldStatus = $inquiry->status;
        $newStatus = $validated['status'];

        if (!$inquiry->paymentAllowsTechnicianWork()) {
            return back()->withErrors(['status' => 'Payment must be confirmed before a technician can update this service.']);
        }

        if ($newStatus === 'completed' && !$inquiry->serviceRecord()->exists()) {
            return back()->withErrors(['status' => 'Submit a post-service record, including work performed and any products used, before completing this job.']);
        }

        if ($newStatus === 'in_progress' && $oldStatus !== 'confirmed') {
            return back()->withErrors(['status' => 'Only a confirmed job can be started.']);
        }

        if ($newStatus === 'completed' && $oldStatus !== 'in_progress') {
            return back()->withErrors(['status' => 'Start the job before marking it completed.']);
        }

        DB::transaction(function () use ($request, $inquiry, $oldStatus, $newStatus, $notifications) {
            $inquiry->update(['status' => $newStatus]);

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'inquiry_status',
                'title' => 'Service status updated',
                'message' => 'Your service ' . $inquiry->inquiry_number . ' is now ' . str_replace('_', ' ', $newStatus) . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);

            $inquiry->load('technicians');
            $notifications->notifyStatusChanged($inquiry, $oldStatus, $newStatus, $request->user());
        });

        return back()->with('success', $newStatus === 'completed'
            ? 'Job marked as completed.'
            : 'Job marked as in progress.');
    }

    public function storePostServiceRecord(Request $request, Inquiry $inquiry)
    {
        abort_unless($inquiry->technicians()->where('users.id', $request->user()->id)->exists(), 404);

        $validated = $request->validate([
            'service_outcome' => ['required', 'in:completed_as_requested,repaired_with_replacement,follow_up_required,inspection_only,no_fault_found'],
            'work_summary' => ['required', 'string', 'min:5', 'max:3000'],
            'recommendations' => ['nullable', 'string', 'max:2000'],
            'service_charge' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'payment_method' => ['nullable', 'in:cash,gcash,card,maya'],
            'items' => ['nullable', 'array', 'max:30'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        if (!$inquiry->paymentAllowsTechnicianWork()) {
            return back()->withErrors(['payment' => 'Payment must be confirmed before adding a post-service record.']);
        }

        if ($inquiry->status !== 'in_progress') {
            return back()->withErrors(['record' => 'Post-service records can only be submitted while a job is in progress.']);
        }

        if ($inquiry->serviceRecord()->exists()) {
            return back()->withErrors(['record' => 'A post-service record has already been submitted for this job. Contact an administrator if it needs correction.']);
        }

        try {
            DB::transaction(function () use ($request, $inquiry, $validated) {
                $lockedInquiry = Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();

                if (!$lockedInquiry->paymentAllowsTechnicianWork()) {
                    throw ValidationException::withMessages(['payment' => 'Payment must be confirmed before adding a post-service record.']);
                }

                if ($lockedInquiry->status !== 'in_progress') {
                    throw ValidationException::withMessages(['record' => 'This service is no longer in progress. Refresh and review its current status.']);
                }

                if ($lockedInquiry->serviceRecord()->exists()) {
                    throw ValidationException::withMessages(['record' => 'A post-service record has already been submitted for this job.']);
                }

                $record = ServiceRecord::create([
                    'inquiry_id' => $lockedInquiry->id,
                    'technician_id' => $request->user()->id,
                    'service_outcome' => $validated['service_outcome'],
                    'work_summary' => trim($validated['work_summary']),
                    'recommendations' => filled($validated['recommendations'] ?? null)
                        ? trim($validated['recommendations'])
                        : null,
                    'service_charge' => round((float) $validated['service_charge'], 2),
                    // Technician-submitted charges remain pending until an administrator confirms receipt.
                    // Zero-charge records do not count as income or outstanding payment.
                    'payment_status' => (float) $validated['service_charge'] > 0 ? 'pending' : 'not_required',
                    'payment_method' => $validated['payment_method'] ?? null,
                    'paid_at' => null,
                ]);

                if ($lockedInquiry->user_id) {
                    CustomerNotification::create([
                        'user_id' => $lockedInquiry->user_id,
                        'type' => 'service_record',
                        'title' => 'Post-service report ready',
                        'message' => $lockedInquiry->inquiry_number . ' now has a technician report. Recorded service charge: ₱' . number_format((float) $record->service_charge, 2) . ($record->payment_status === 'pending' ? ' (awaiting payment confirmation).' : '.'),
                        'action_url' => route('inquiries.show', $lockedInquiry),
                        'related_type' => Inquiry::class,
                        'related_id' => $lockedInquiry->id,
                    ]);
                }

                foreach (($validated['items'] ?? []) as $index => $line) {
                    $product = Product::query()->whereKey($line['product_id'])->lockForUpdate()->firstOrFail();
                    $quantity = (int) $line['quantity'];
                    $previous = (int) $product->stock_quantity;

                    if ($previous < $quantity) {
                        throw ValidationException::withMessages([
                            'items.' . $index . '.quantity' => 'Only ' . $previous . ' unit(s) of ' . $product->name . ' remain in stock.',
                        ]);
                    }

                    $next = $previous - $quantity;
                    $product->update(['stock_quantity' => $next]);

                    $record->items()->create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $quantity,
                        'unit_price' => (float) $product->price,
                        'notes' => filled($line['notes'] ?? null) ? trim($line['notes']) : null,
                    ]);

                    InventoryAdjustment::create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'user_id' => $request->user()->id,
                        'previous_quantity' => $previous,
                        'new_quantity' => $next,
                        'quantity_change' => -$quantity,
                        'reason' => 'Used for service ' . $lockedInquiry->inquiry_number . ' (post-service record #' . $record->id . ')',
                    ]);

                    if (($previous > 5 && $next <= 5) || ($previous > 0 && $next === 0)) {
                        User::query()->where('role', 'admin')->get()->each(function (User $admin) use ($product, $next, $record) {
                            $admin->customerNotifications()->create([
                                'type' => 'inventory_low_stock',
                                'title' => $next === 0 ? 'Product out of stock' : 'Low stock warning',
                                'message' => $product->name . ' now has ' . $next . ' unit(s) remaining after post-service record #' . $record->id . '.',
                                'action_url' => route('admin.products.index'),
                                'related_type' => Product::class,
                                'related_id' => $product->id,
                            ]);
                        });
                    }
                }
            });
        } catch (ValidationException $exception) {
            throw $exception;
        }

        return back()->with('success', 'Post-service record saved, and all used products were recorded against inventory.');
    }

    public function adjustStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'quantity_change' => ['required', 'integer', 'not_in:0', 'min:-100000', 'max:100000'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        DB::transaction(function () use ($request, $product, $validated) {
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $previous = (int) $lockedProduct->stock_quantity;
            $change = (int) $validated['quantity_change'];
            $next = $previous + $change;

            if ($next < 0) {
                throw ValidationException::withMessages(['quantity_change' => 'Stock cannot be reduced below zero.']);
            }

            $lockedProduct->update(['stock_quantity' => $next]);

            InventoryAdjustment::create([
                'product_id' => $lockedProduct->id,
                'product_name' => $lockedProduct->name,
                'user_id' => $request->user()->id,
                'previous_quantity' => $previous,
                'new_quantity' => $next,
                'quantity_change' => $change,
                'reason' => trim($validated['reason']),
            ]);

            if (($previous > 5 && $next <= 5) || ($previous > 0 && $next === 0)) {
                User::query()->where('role', 'admin')->get()->each(function (User $admin) use ($lockedProduct, $next) {
                    $admin->customerNotifications()->create([
                        'type' => 'inventory_low_stock',
                        'title' => $next === 0 ? 'Product out of stock' : 'Low stock warning',
                        'message' => "{$lockedProduct->name} now has {$next} unit(s) remaining.",
                        'action_url' => route('admin.products.index'),
                        'related_type' => Product::class,
                        'related_id' => $lockedProduct->id,
                    ]);
                });
            }
        });

        return back()->with('success', 'Inventory adjustment saved with an audit record.');
    }

    private function appointmentDateTime(Inquiry $inquiry): ?Carbon
    {
        if (!$inquiry->preferred_date || !$inquiry->preferred_time) {
            return null;
        }

        $start = trim(explode('-', $inquiry->preferred_time)[0] ?? '');

        try {
            return Carbon::parse($inquiry->preferred_date->format('Y-m-d') . ' ' . $start);
        } catch (\Throwable) {
            return null;
        }
    }

    private function jobData(Inquiry $inquiry, bool $includeCustomerDetails): array
    {
        $data = [
            'id' => $inquiry->id,
            'inquiry_number' => $inquiry->inquiry_number,
            'service_type' => $inquiry->service_type,
            'item_name' => $inquiry->item_name,
            'urgency' => $inquiry->urgency,
            'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
            'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
            'preferred_time' => $inquiry->preferred_time,
            'reschedule_requested_date' => $inquiry->reschedule_requested_date?->format('Y-m-d'),
            'reschedule_requested_time' => $inquiry->reschedule_requested_time,
            'reschedule_request_status' => $inquiry->reschedule_request_status ?? 'none',
            'reschedule_request_note' => $inquiry->reschedule_request_note,
            'city' => $inquiry->city,
            'street_address' => $includeCustomerDetails ? $inquiry->street_address : null,
            'address_details' => $includeCustomerDetails ? $inquiry->address_details : null,
            'service_latitude' => $includeCustomerDetails ? $inquiry->service_latitude : null,
            'service_longitude' => $includeCustomerDetails ? $inquiry->service_longitude : null,
            'google_place_id' => $includeCustomerDetails ? $inquiry->google_place_id : null,
            'status' => $inquiry->status,
            'other_service_type' => $inquiry->other_service_type,
            'other_service_details' => $inquiry->other_service_details,
            'payment_status' => $inquiry->payment_status ?? 'not_required',
            'service_record' => $inquiry->serviceRecord ? [
                'id' => $inquiry->serviceRecord->id,
                'service_outcome' => $inquiry->serviceRecord->service_outcome,
                'work_summary' => $inquiry->serviceRecord->work_summary,
                'recommendations' => $inquiry->serviceRecord->recommendations,
                'service_charge' => (float) $inquiry->serviceRecord->service_charge,
                'payment_status' => $inquiry->serviceRecord->payment_status,
                'payment_method' => $inquiry->serviceRecord->payment_method,
                'paid_at' => $inquiry->serviceRecord->paid_at?->format('M d, Y h:i A'),
                'technician_name' => $inquiry->serviceRecord->technician?->name,
                'items' => $inquiry->serviceRecord->items->map(fn ($item) => [
                    'product_name' => $item->product_name,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'notes' => $item->notes,
                ])->values(),
            ] : null,
            'technicians' => $inquiry->technicians->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
            ])->values(),
        ];

        if ($includeCustomerDetails) {
            $data['customer_name'] = $inquiry->customer_name;
            $data['customer_phone'] = $inquiry->customer_phone;
            $data['notes'] = $inquiry->notes;
        }

        return $data;
    }
    public function updateJobSchedule(Request $request, Inquiry $inquiry)
    {
        $technician = $request->user();
        abort_unless($inquiry->technicians()->where('users.id', $technician->id)->exists(), 404);

        if (!$inquiry->paymentAllowsTechnicianWork()) {
            return back()->withErrors(['schedule' => 'Payment must be confirmed before rescheduling this service.']);
        }

        if ($inquiry->status !== 'confirmed') {
            return back()->withErrors(['schedule' => 'Only confirmed jobs can be rescheduled by a technician.']);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:08:00 AM - 11:00 AM,11:00 AM - 02:00 PM,02:00 PM - 05:00 PM'],
        ]);

        if ($this->dateUnavailableByTechnicianCapacity($validated['preferred_date'], $inquiry->id)) {
            return back()->withErrors(['preferred_date' => 'No technicians are available on that date. Every technician is already scheduled for another service.']);
        }

        if (BlockedBookingDate::query()->whereDate('booking_date', $validated['preferred_date'])->exists()) {
            return back()->withErrors(['preferred_date' => 'That date is marked fully booked.']);
        }
        if (BlockedBookingTimeSlot::query()->whereDate('booking_date', $validated['preferred_date'])->where('booking_time', $validated['preferred_time'])->exists()) {
            return back()->withErrors(['preferred_time' => 'That time slot is marked fully booked.']);
        }

        $teamIds = $inquiry->technicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $conflicts = Inquiry::query()
            ->where('id', '!=', $inquiry->id)
            ->whereDate('preferred_date', $validated['preferred_date'])
            ->where('preferred_time', $validated['preferred_time'])
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereHas('technicians', fn ($query) => $query->whereIn('users.id', $teamIds))
            ->with('technicians:id,name')
            ->get()
            ->flatMap(fn (Inquiry $job) => $job->technicians->whereIn('id', $teamIds)->pluck('name'))
            ->unique()
            ->values()
            ->all();

        if ($conflicts) {
            return back()->withErrors(['preferred_time' => 'Your team has another job at that time: ' . implode(', ', $conflicts) . '.']);
        }

        DB::transaction(function () use ($inquiry, $validated) {
            Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail()->update([
                'preferred_date' => $validated['preferred_date'],
                'preferred_time' => $validated['preferred_time'],
                'reschedule_requested_date' => null,
                'reschedule_requested_time' => null,
                'reschedule_request_status' => 'none',
                'reschedule_request_note' => null,
                'reschedule_requested_at' => null,
            ]);
        });

        if ($inquiry->user_id) {
            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'schedule_updated',
                'title' => 'Service schedule updated',
                'message' => 'Your service ' . $inquiry->inquiry_number . ' is now scheduled for ' . $validated['preferred_date'] . ' (' . $validated['preferred_time'] . ').',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        }

        return back()->with('success', 'Service schedule updated successfully.');
    }

    public function reviewReschedule(Request $request, Inquiry $inquiry, string $decision)
    {
        abort_unless($inquiry->technicians()->where('users.id', $request->user()->id)->exists(), 404);

        if (!$inquiry->paymentAllowsTechnicianWork()) {
            return back()->withErrors(['reschedule' => 'Payment must be confirmed before reviewing a reschedule request.']);
        }

        if (($inquiry->reschedule_request_status ?? 'none') !== 'pending' || $inquiry->status !== 'confirmed') {
            return back()->withErrors(['reschedule' => 'There is no pending reschedule request to review.']);
        }

        if (!in_array($decision, ['approve', 'decline'], true)) {
            abort(404);
        }

        if ($decision === 'decline') {
            $inquiry->update(['reschedule_request_status' => 'declined']);
            if ($inquiry->user_id) {
                CustomerNotification::create([
                    'user_id' => $inquiry->user_id,
                    'type' => 'reschedule_declined',
                    'title' => 'Reschedule request declined',
                    'message' => 'Your reschedule request for ' . $inquiry->inquiry_number . ' was declined by the assigned technician. Your original appointment remains scheduled.',
                    'action_url' => route('inquiries.show', $inquiry),
                    'related_type' => Inquiry::class,
                    'related_id' => $inquiry->id,
                ]);
            }
            return back()->with('success', 'Reschedule request declined. The original schedule remains unchanged.');
        }

        $date = $inquiry->reschedule_requested_date?->format('Y-m-d');
        $time = $inquiry->reschedule_requested_time;
        if (!$date || !$time) {
            return back()->withErrors(['reschedule' => 'The requested date or time is missing.']);
        }

        if ($this->dateUnavailableByTechnicianCapacity($date, $inquiry->id)) {
            return back()->withErrors(['reschedule' => 'No technicians are available on that date. Every technician is already scheduled for another service.']);
        }

        if (BlockedBookingDate::query()->whereDate('booking_date', $date)->exists()) {
            return back()->withErrors(['reschedule' => 'The requested date is now marked fully booked.']);
        }
        if (BlockedBookingTimeSlot::query()->whereDate('booking_date', $date)->where('booking_time', $time)->exists()) {
            return back()->withErrors(['reschedule' => 'The requested time slot is now marked fully booked.']);
        }

        $teamIds = $inquiry->technicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $conflicts = Inquiry::query()
            ->where('id', '!=', $inquiry->id)
            ->whereDate('preferred_date', $date)
            ->where('preferred_time', $time)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereHas('technicians', fn ($query) => $query->whereIn('users.id', $teamIds))
            ->exists();

        if ($conflicts) {
            return back()->withErrors(['reschedule' => 'One or more assigned technicians are already booked at the requested time.']);
        }

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
                'message' => 'Your service ' . $inquiry->inquiry_number . ' has been rescheduled to ' . $date . ' (' . $time . ') by the assigned technician.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        }

        return back()->with('success', 'Customer reschedule request approved.');
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
                $activeOnDate = function ($query) use ($date, $exceptInquiryId) {
                    $query->whereDate('preferred_date', $date)
                        ->whereIn('status', ['confirmed', 'in_progress']);
                    if ($exceptInquiryId !== null) {
                        $query->where('inquiries.id', '!=', $exceptInquiryId);
                    }
                };

                $technicianQuery
                    ->whereHas('assignedInquiries', $activeOnDate)
                    ->orWhereHas('technicianInquiries', $activeOnDate);
            })
            ->count();

        return $busyCount >= $technicianCount;
    }


}
