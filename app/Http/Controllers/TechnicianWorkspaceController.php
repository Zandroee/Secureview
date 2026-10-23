<?php

namespace App\Http\Controllers;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\PendingInquiryCheckout;
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
            ->with(['technicians:id,name,email', 'serviceRecord.items', 'pendingCheckout.order'])
            ->whereIn('status', ['confirmed', 'in_progress', 'completed'])
            ->orderByRaw("CASE WHEN status = 'completed' THEN 4 WHEN urgency = 'emergency' THEN 1 WHEN urgency = 'urgent' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE WHEN status = 'completed' THEN preferred_date END DESC")
            ->orderByRaw("CASE WHEN status != 'completed' THEN preferred_date END ASC")
            ->limit(100)
            ->get()
            ->map(fn (Inquiry $inquiry) => $this->jobData($inquiry, true))
            ->values();

        // Include both current team assignments and legacy technician_id assignments.
        $busySlots = Inquiry::query()
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereDate('preferred_date', '>=', today())
            ->where(function ($query) use ($technician) {
                $query->where('technician_id', $technician->id)
                    ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $technician->id));
            })
            ->get(['preferred_date', 'preferred_time'])
            ->map(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d') . '|' . $job->preferred_time)
            ->all();

        $openJobs = Inquiry::query()
            ->with(['technicians:id,name,email', 'pendingCheckout.order'])
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('preferred_date', '>=', today())
            ->where(function ($query) use ($technician) {
                $query->whereNull('technician_id')
                    ->orWhere('technician_id', '!=', $technician->id);
            })
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
            ->get(['id', 'name', 'brand', 'category', 'price', 'stock_quantity', 'image', 'images'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'brand' => $product->brand,
                'category' => $product->category,
                'price' => (float) $product->price,
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

        if ($this->hasPendingServicePayment($inquiry)) {
            return back()->withErrors(['job' => 'This service cannot be joined until its required payment is confirmed.']);
        }

        $appointmentStart = $this->appointmentDateTime($inquiry);

        if (
            !in_array($inquiry->status, ['pending', 'confirmed'], true)
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

        $hasConflict = Inquiry::query()
            ->where('id', '!=', $inquiry->id)
            ->whereDate('preferred_date', $inquiry->preferred_date)
            ->where('preferred_time', $inquiry->preferred_time)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where(function ($query) use ($technician) {
                $query->where('technician_id', $technician->id)
                    ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $technician->id));
            })
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

            $lockedAppointmentStart = $this->appointmentDateTime($lockedInquiry);

            if (
                !in_array($lockedInquiry->status, ['pending', 'confirmed'], true)
                || !$lockedAppointmentStart
                || !$lockedAppointmentStart->isFuture()
            ) {
                throw ValidationException::withMessages([
                    'job' => 'This job is no longer available to join.',
                ]);
            }

            if ($this->hasPendingServicePayment($lockedInquiry)) {
                throw ValidationException::withMessages([
                    'job' => 'This service cannot be joined until its required payment is confirmed.',
                ]);
            }

            $hasConflictAfterLock = Inquiry::query()
                ->where('id', '!=', $lockedInquiry->getKey())
                ->whereDate('preferred_date', $lockedInquiry->preferred_date)
                ->where('preferred_time', $lockedInquiry->preferred_time)
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->where(function ($query) use ($lockedTechnician) {
                    $query->where('technician_id', $lockedTechnician->id)
                        ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $lockedTechnician->id));
                })
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

    public function updateJobStatus(Request $request, Inquiry $inquiry, JobNotificationService $notifications)
    {
        $validated = $request->validate(['status' => ['required', 'in:in_progress,completed']]);
        $technician = $request->user();
        abort_unless($inquiry->technicians()->where('users.id', $technician->id)->exists(), 403);

        if ($this->hasPendingServicePayment($inquiry)) {
            return back()->withErrors(['status' => 'This service cannot be changed until its required payment is confirmed.']);
        }
        if ($validated['status'] === 'completed') {
            return back()->withErrors(['status' => 'Complete the Post-Service Record before marking this job completed.']);
        }
        if ($inquiry->status !== 'confirmed') {
            return back()->withErrors(['status' => 'Only a confirmed job can be started.']);
        }

        DB::transaction(function () use ($request, $inquiry, $notifications) {
            $lockedInquiry = Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();
            if ($lockedInquiry->status !== 'confirmed' || $this->hasPendingServicePayment($lockedInquiry)) {
                throw ValidationException::withMessages([
                    'status' => 'Only a confirmed service with settled payment can be started.',
                ]);
            }

            $lockedInquiry->update(['status' => 'in_progress']);
            $lockedInquiry->load('technicians');
            $notifications->notifyStatusChanged($lockedInquiry, 'confirmed', 'in_progress', $request->user());

            CustomerNotification::create([
                'user_id' => $lockedInquiry->user_id,
                'type' => 'inquiry_status',
                'title' => 'Service started',
                'message' => 'Your service ' . $lockedInquiry->inquiry_number . ' has been started by the technician team.',
                'action_url' => route('inquiries.show', $lockedInquiry),
                'related_type' => Inquiry::class,
                'related_id' => $lockedInquiry->id,
            ]);
        });

        return back()->with('success', 'Job marked as in progress.');
    }

    public function storePostServiceRecord(Request $request, Inquiry $inquiry, JobNotificationService $notifications)
    {
        $validated = $request->validate([
            'work_summary' => ['required', 'string', 'min:10', 'max:5000'],
            'customer_notes' => ['nullable', 'string', 'max:3000'],
            'labor_charge' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'additional_charge' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'items' => ['nullable', 'array', 'max:20'],
            'items.*.action' => ['required', 'in:used,removed'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.product_name' => ['required', 'string', 'max:180'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $technician = $request->user();
        abort_unless($inquiry->technicians()->where('users.id', $technician->id)->exists(), 403);

        if ($inquiry->status !== 'in_progress' || $this->hasPendingServicePayment($inquiry)) {
            return back()->withErrors([
                'service_record' => $this->hasPendingServicePayment($inquiry)
                    ? 'This service cannot be completed until its required payment is confirmed.'
                    : 'Start this service before submitting its Post-Service Record.',
            ]);
        }
        if ($inquiry->serviceRecord()->exists()) {
            return back()->withErrors(['service_record' => 'A Post-Service Record already exists for this service.']);
        }

        DB::transaction(function () use ($request, $inquiry, $technician, $validated, $notifications) {
            $lockedInquiry = Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();
            if ($lockedInquiry->status !== 'in_progress' || $this->hasPendingServicePayment($lockedInquiry)) {
                throw ValidationException::withMessages([
                    'service_record' => 'Only an in-progress service with settled payment can be completed.',
                ]);
            }
            if ($lockedInquiry->serviceRecord()->exists()) {
                throw ValidationException::withMessages(['service_record' => 'A Post-Service Record already exists for this service.']);
            }

            $record = ServiceRecord::create([
                'inquiry_id' => $lockedInquiry->id,
                'technician_id' => $technician->id,
                'work_summary' => trim($validated['work_summary']),
                'customer_notes' => filled($validated['customer_notes'] ?? null) ? trim($validated['customer_notes']) : null,
                'labor_charge' => round((float) $validated['labor_charge'], 2),
                'additional_charge' => round((float) ($validated['additional_charge'] ?? 0), 2),
                'total_income' => 0,
                'completed_at' => now(),
            ]);

            $partsIncome = 0.0;
            foreach (($validated['items'] ?? []) as $index => $item) {
                $action = $item['action'];
                $quantity = (int) $item['quantity'];
                $product = null;
                $productName = trim($item['product_name']);

                if ($action === 'used') {
                    if (empty($item['product_id'])) {
                        throw ValidationException::withMessages([
                            "items.{$index}.product_id" => 'Select a shop product for each part taken from inventory.',
                        ]);
                    }

                    $product = Product::query()->whereKey($item['product_id'])->lockForUpdate()->firstOrFail();
                    $previous = (int) $product->stock_quantity;
                    if ($previous < $quantity) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => "Only {$previous} unit(s) of {$product->name} remain in stock.",
                        ]);
                    }

                    $productName = $product->name;
                    $unitPrice = array_key_exists('unit_price', $item) && $item['unit_price'] !== null && $item['unit_price'] !== ''
                        ? round((float) $item['unit_price'], 2)
                        : round((float) $product->price, 2);
                    $next = $previous - $quantity;
                    $product->update(['stock_quantity' => $next]);

                    InventoryAdjustment::create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'user_id' => $technician->id,
                        'previous_quantity' => $previous,
                        'new_quantity' => $next,
                        'quantity_change' => -$quantity,
                        'reason' => 'Used for service ' . $lockedInquiry->inquiry_number . ' (post-service record #' . $record->id . ')',
                    ]);

                    $partsIncome += $unitPrice * $quantity;
                } else {
                    $product = !empty($item['product_id']) ? Product::query()->find($item['product_id']) : null;
                    $productName = $product?->name ?: $productName;
                    $unitPrice = 0;
                }

                $record->items()->create([
                    'product_id' => $product?->id,
                    'product_name' => $productName,
                    'action' => $action,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'notes' => filled($item['notes'] ?? null) ? trim($item['notes']) : null,
                ]);
            }

            $record->update([
                'total_income' => round((float) $record->labor_charge + (float) $record->additional_charge + $partsIncome, 2),
            ]);
            $lockedInquiry->update(['status' => 'completed']);
            $lockedInquiry->load('technicians');
            $notifications->notifyStatusChanged($lockedInquiry, 'in_progress', 'completed', $technician);

            CustomerNotification::create([
                'user_id' => $lockedInquiry->user_id,
                'type' => 'service_completed',
                'title' => 'Service completed',
                'message' => 'Your service ' . $lockedInquiry->inquiry_number . ' has been completed. Please review the service details in your account.',
                'action_url' => route('inquiries.show', $lockedInquiry),
                'related_type' => Inquiry::class,
                'related_id' => $lockedInquiry->id,
            ]);
        });

        return back()->with('success', 'Post-Service Record saved and the service has been marked completed.');
    }

    private function hasPendingServicePayment(Inquiry $inquiry): bool
    {
        return PendingInquiryCheckout::query()
            ->where('inquiry_id', $inquiry->id)
            ->where('status', 'pending_payment')
            ->whereHas('order', fn ($query) => $query->where('payment_status', '!=', 'paid')->whereNull('paid_at'))
            ->exists();
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
            'payment_status' => $inquiry->pendingCheckout?->order?->payment_status ?? 'not_applicable',
            'payment_method' => $inquiry->pendingCheckout?->order?->payment_method,
            'service_record' => $inquiry->serviceRecord ? [
                'id' => $inquiry->serviceRecord->id,
                'work_summary' => $inquiry->serviceRecord->work_summary,
                'customer_notes' => $inquiry->serviceRecord->customer_notes,
                'technician_name' => $inquiry->serviceRecord->technician?->name,
                'labor_charge' => (float) $inquiry->serviceRecord->labor_charge,
                'additional_charge' => (float) $inquiry->serviceRecord->additional_charge,
                'total_income' => (float) $inquiry->serviceRecord->total_income,
                'items' => $inquiry->serviceRecord->items->map(fn ($item) => [
                    'product_name' => $item->product_name,
                    'action' => $item->action,
                    'quantity' => $item->quantity,
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

        if ($this->hasPendingServicePayment($inquiry)) {
            return back()->withErrors(['schedule' => 'This service cannot be rescheduled until its required payment is confirmed.']);
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

        if ($this->hasPendingServicePayment($inquiry)) {
            return back()->withErrors(['reschedule' => 'This service cannot be rescheduled until its required payment is confirmed.']);
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
