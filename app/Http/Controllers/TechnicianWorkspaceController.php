<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TechnicianWorkspaceController extends Controller
{
    public function index(Request $request)
    {
        $technician = $request->user();

        $jobs = $technician->assignedInquiries()
            ->with('technicians:id,name,email')
            ->whereIn('status', ['confirmed', 'in_progress', 'completed'])
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END")
            ->orderBy('preferred_date')
            ->limit(100)
            ->get()
            ->map(fn (Inquiry $inquiry) => $this->jobData($inquiry, true, $technician->id))
            ->values();

        $openJobs = Inquiry::query()
            ->with('technicians:id,name,email')
            ->where('status', 'confirmed')
            ->where('allow_additional_technicians', true)
            ->whereDate('preferred_date', '>=', today())
            ->whereDoesntHave('technicians', fn ($query) => $query->where('users.id', $technician->id))
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->limit(50)
            ->get()
            ->map(fn (Inquiry $inquiry) => $this->jobData($inquiry, false, $technician->id))
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

        return Inertia::render('Technician/Workspace', [
            'jobs' => $jobs,
            'openJobs' => $openJobs,
            'inventory' => $inventory,
        ]);
    }

    public function claimJob(Request $request, Inquiry $inquiry, JobNotificationService $notifications)
    {
        $technician = $request->user();

        if (
            $inquiry->status !== 'confirmed'
            || !$inquiry->allow_additional_technicians
            || !$inquiry->preferred_date
            || $inquiry->preferred_date->lt(today())
        ) {
            return back()->withErrors([
                'job' => 'This job is no longer open for additional technicians.',
            ]);
        }

        if ($inquiry->technicians()->where('users.id', $technician->id)->exists()) {
            return back()->withErrors([
                'job' => 'You are already assigned to this job.',
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
            $inquiry->technicians()->attach($technician->id, [
                'is_lead' => false,
                'assigned_by' => $technician->id,
            ]);

            $inquiry->load('technicians');
            $notifications->notifyAssignmentsChanged($inquiry, [$technician->id]);
            $notifications->notifyTechnicianJoined($inquiry, $technician);
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

        if ($newStatus === 'in_progress' && $oldStatus !== 'confirmed') {
            return back()->withErrors(['status' => 'Only a confirmed job can be started.']);
        }

        if ($newStatus === 'completed' && $oldStatus !== 'in_progress') {
            return back()->withErrors(['status' => 'Start the job before marking it completed.']);
        }

        if ($newStatus === 'completed' && !(bool) $assignment->pivot->is_lead) {
            return back()->withErrors(['status' => 'Only the lead technician can complete the job.']);
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

            if ($previous > 5 && $next <= 5) {
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

    private function jobData(Inquiry $inquiry, bool $includeCustomerDetails, int $currentTechnicianId): array
    {
        $data = [
            'id' => $inquiry->id,
            'inquiry_number' => $inquiry->inquiry_number,
            'service_type' => $inquiry->service_type,
            'item_name' => $inquiry->item_name,
            'urgency' => $inquiry->urgency,
            'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
            'preferred_time' => $inquiry->preferred_time,
            'city' => $inquiry->city,
            'street_address' => $includeCustomerDetails ? $inquiry->street_address : null,
            'status' => $inquiry->status,
            'allow_additional_technicians' => $inquiry->allow_additional_technicians,
            'technicians' => $inquiry->technicians->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'is_lead' => (bool) $user->pivot->is_lead,
                'is_current_user' => $user->id === $currentTechnicianId,
            ])->values(),
        ];

        if ($includeCustomerDetails) {
            $data['customer_name'] = $inquiry->customer_name;
            $data['customer_phone'] = $inquiry->customer_phone;
            $data['notes'] = $inquiry->notes;
        }

        return $data;
    }
}
