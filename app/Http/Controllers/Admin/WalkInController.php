<?php

namespace App\\Http\\Controllers\\Admin;

use App\\Http\\Controllers\\Controller;
use App\\Models\\BlockedBookingDate;
use App\\Models\\BlockedBookingTimeSlot;
use App\\Models\\Inquiry;
use App\\Models\\Order;
use App\\Models\\OrderItem;
use App\\Models\\OrderEvent;
use App\\Models\\Package;
use App\\Models\\Product;
use App\\Models\\ServiceBookingFeeSetting;
use App\\Models\\User;
use App\\Services\\InventoryService;
use App\\Services\\JobNotificationService;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Str;
use Illuminate\\Validation\\Rule;
use Illuminate\\Validation\\ValidationException;
use Inertia\\Inertia;

class WalkInController extends Controller
{
    private const BOOKING_TIME_SLOTS = [
        '08:00 AM - 11:00 AM',
        '11:00 AM - 02:00 PM',
        '02:00 PM - 05:00 PM',
    ];

    public function index(InventoryService $inventory)
    {
        $catalogItems = Product::query()->orderBy('name')->get()
            ->map(fn (Product $product) => [
                'type' => 'product',
                'id' => $product->id,
                'name' => $product->name,
                'price' => $product->effectivePrice(),
                'stock' => $inventory->getAvailableStock($product),
                'warranty' => $product->warranty,
            ])
            ->merge(Package::query()->with('packageItems.product')->orderBy('name')->get()
                ->map(fn (Package $package) => [
                    'type' => 'package',
                    'id' => $package->id,
                    'name' => $package->name,
                    'price' => $package->effectivePrice(),
                    'stock' => $inventory->getAvailableStock($package),
                    'warranty' => $package->warranty,
                ]))
            ->sortBy('name')
            ->values();

        return Inertia::render('Admin/WalkIn', [
            'catalogItems' => $catalogItems,
            'bookingTimeSlots' => self::BOOKING_TIME_SLOTS,
            'todayDate' => today()->toDateString(),
            'urgencyFees' => ServiceBookingFeeSetting::current()->fees(),
        ]);
    }

    public function storeSale(Request $request, InventoryService $inventory)
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'payment_method' => ['required', Rule::in(['cash', 'gcash', 'card', 'maya'])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.type' => ['required', Rule::in(['product', 'package'])],
            'items.*.id' => ['required', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
        ]);

        $order = DB::transaction(function () use ($request, $validated, $inventory) {
            $number = $this->uniqueReference('SV-WI-');
            $order = Order::create([
                'user_id' => null,
                'order_number' => $number,
                'subtotal' => 0,
                'discount_amount' => 0,
                'shipping_fee' => 0,
                'installation_fee' => 0,
                'service_priority_fee' => 0,
                'total' => 0,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'paid',
                'paid_at' => now(),
                'order_status' => 'completed',
                'customer_name' => trim($validated['customer_name']),
                'customer_phone' => $validated['customer_phone'] ?? '',
                'customer_email' => $validated['customer_email'] ?? null,
                'delivery_address' => 'In-store purchase',
                'notes' => $validated['notes'] ?? null,
                'sales_channel' => 'walk_in',
                'created_by' => $request->user()->id,
            ]);

            $subtotal = 0.0;
            foreach ($validated['items'] as $index => $item) {
                $model = $item['type'] === 'product' ? Product::class : Package::class;
                $query = $model::query();
                if ($item['type'] === 'package') {
                    $query->with('packageItems.product');
                }
                $purchasable = $query->whereKey($item['id'])->lockForUpdate()->first();

                if (!$purchasable) {
                    throw ValidationException::withMessages([
                        "items.{$index}.id" => 'One of the selected catalog items is no longer available.',
                    ]);
                }

                $quantity = (int) $item['quantity'];
                $price = (float) $purchasable->effectivePrice();
                $lineTotal = round($price * $quantity, 2);
                $subtotal += $lineTotal;

                $order->items()->create([
                    'purchasable_type' => $model,
                    'purchasable_id' => $purchasable->id,
                    'name' => $purchasable->name,
                    'warranty_period' => $purchasable->warranty ?? null,
                    'price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $lineTotal,
                ]);
            }

            $order->update([
                'subtotal' => round($subtotal, 2),
                'total' => round($subtotal, 2),
            ]);

            $inventory->validateOrderStock($order);
            $inventory->deductForOrder($order);

            $order->events()->create([
                'actor_user_id' => $request->user()->id,
                'event_key' => 'walk_in_sale_completed',
                'title' => 'Walk-in sale completed',
                'description' => 'In-store sale recorded by ' . $request->user()->name . '. Payment was recorded as received at the counter.',
                'payment_status_before' => 'pending',
                'payment_status_after' => 'paid',
                'order_status_before' => 'pending',
                'order_status_after' => 'completed',
                'metadata' => ['sales_channel' => 'walk_in'],
            ]);

            return $order;
        });

        return redirect()->route('admin.walk-in.index')
            ->with('success', 'Walk-in sale ' . $order->order_number . ' was recorded, payment marked paid, and inventory updated.');
    }

    public function storeService(Request $request, JobNotificationService $notifications)
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'regex:/^09\\d{9}$/'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'service_type' => ['required', Rule::in(['Installation', 'Site Inspection', 'Maintenance', 'Repair', 'Consultation', 'Other'])],
            'service_location_type' => ['required', Rule::in(['in_shop', 'customer_site'])],
            'street_address' => ['required_if:service_location_type,customer_site', 'nullable', 'string', 'max:255'],
            'address_details' => ['nullable', 'string', 'max:500'],
            'city' => ['required_if:service_location_type,customer_site', 'nullable', 'string', 'max:120'],
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'preferred_time' => ['required', Rule::in(self::BOOKING_TIME_SLOTS)],
            'urgency' => ['required', Rule::in(['normal', 'urgent', 'emergency'])],
            'item_name' => ['nullable', 'string', 'max:180'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->assertBookingSlotAvailable($validated['preferred_date'], $validated['preferred_time']);

        $urgencyFees = ServiceBookingFeeSetting::current()->fees();
        $urgencyFee = match ($validated['urgency']) {
            'urgent' => (float) ($urgencyFees['urgent'] ?? 0),
            'emergency' => (float) ($urgencyFees['emergency'] ?? 0),
            default => 0.0,
        };

        $inquiryNumber = $this->uniqueReference('INQ-WI-');
        $isInShop = $validated['service_location_type'] === 'in_shop';

        $inquiry = Inquiry::create([
            'user_id' => null,
            'inquiry_number' => $inquiryNumber,
            'item_name' => filled($validated['item_name'] ?? null) ? trim($validated['item_name']) : null,
            'customer_name' => trim($validated['customer_name']),
            'customer_phone' => $validated['customer_phone'],
            'customer_email' => $validated['customer_email'] ?? null,
            'street_address' => $isInShop ? 'Netmax Trading — In-shop service counter' : trim($validated['street_address']),
            'address_details' => $validated['address_details'] ?? null,
            'city' => $isInShop ? 'In-shop' : trim($validated['city']),
            'service_type' => $validated['service_type'],
            'urgency' => $validated['urgency'],
            'urgency_fee' => $urgencyFee,
            'preferred_date' => $validated['preferred_date'],
            'preferred_time' => $validated['preferred_time'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
            'intake_channel' => 'walk_in',
            'service_location_type' => $validated['service_location_type'],
        ]);

        $notifications->notifyNewInquirySubmitted($inquiry);

        return redirect()->route('admin.walk-in.index')
            ->with('success', 'Walk-in service ' . $inquiry->inquiry_number . ' was recorded and sent to the existing service review and scheduling workflow.');
    }

    private function assertBookingSlotAvailable(string $date, string $time): void
    {
        if (BlockedBookingDate::query()->whereDate('booking_date', $date)->exists()) {
            throw ValidationException::withMessages(['preferred_date' => 'This date is blocked for service bookings.']);
        }

        if (BlockedBookingTimeSlot::query()->whereDate('booking_date', $date)->where('booking_time', $time)->exists()) {
            throw ValidationException::withMessages(['preferred_time' => 'This time slot is blocked for service bookings.']);
        }

        $technicianCount = User::query()->where('role', 'technician')->count();
        if ($technicianCount === 0) {
            throw ValidationException::withMessages(['preferred_date' => 'No technicians are currently available for service bookings.']);
        }

        $active = Inquiry::query()
            ->with('technicians:id')
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->whereDate('preferred_date', $date)
            ->get(['id', 'technician_id', 'preferred_time']);

        $assignedIds = fn (Inquiry $job) => $job->technicians->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->push($job->technician_id ? (int) $job->technician_id : null)
            ->filter()
            ->unique();

        $busyThatDay = $active->flatMap($assignedIds)->unique()->count();
        if ($busyThatDay >= $technicianCount) {
            throw ValidationException::withMessages(['preferred_date' => 'All technicians are already assigned to a service on this date.']);
        }

        $busyInSlot = $active->where('preferred_time', $time)->flatMap($assignedIds)->unique()->count();
        if ($busyInSlot >= $technicianCount) {
            throw ValidationException::withMessages(['preferred_time' => 'All technicians are already occupied during this time slot.']);
        }
    }

    private function uniqueReference(string $prefix): string
    {
        do {
            $reference = $prefix . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
        } while (
            ($prefix === 'SV-WI-' && Order::query()->where('order_number', $reference)->exists())
            || ($prefix !== 'SV-WI-' && Inquiry::query()->where('inquiry_number', $reference)->exists())
        );

        return $reference;
    }
}
