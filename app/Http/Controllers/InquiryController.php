<?php

namespace App\Http\Controllers;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Models\Package;
use App\Models\ServiceBookingFeeSetting;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class InquiryController extends Controller
{
    private const BOOKING_TIME_SLOTS = [
        '08:00 AM - 11:00 AM',
        '11:00 AM - 02:00 PM',
        '02:00 PM - 05:00 PM',
    ];

    public function create(Request $request, InventoryService $inventory)
    {
        $item = null;

        if ($request->filled('item_type') || $request->filled('item_id')) {
            $itemQuery = $request->validate([
                'item_type' => ['required', 'in:product,package'],
                'item_id' => ['required', 'integer', 'min:1'],
            ]);

            $modelClass = $itemQuery['item_type'] === 'product' ? Product::class : Package::class;
            $purchasable = $modelClass::findOrFail($itemQuery['item_id']);
            $item = [
                'type' => $itemQuery['item_type'],
                'id' => $purchasable->id,
                'name' => $purchasable->name,
                'category' => $purchasable->category,
                'image' => $purchasable->image,
                'price' => (float) $purchasable->price,
                'installation_fee' => $purchasable->installation_fee === null ? null : (float) $purchasable->installation_fee,
            ];
        }

        $serviceTypeQuery = $request->validate([
            'service_type' => [
                'nullable',
                Rule::in(['Installation', 'Site Inspection', 'Maintenance', 'Repair', 'Consultation', 'Other']),
            ],
        ]);
        $initialServiceType = $serviceTypeQuery['service_type'] ?? 'Installation';

        $unavailableDates = BlockedBookingDate::query()
            ->whereDate('booking_date', '>=', today())
            ->orderBy('booking_date')
            ->get()
            ->map(fn (BlockedBookingDate $blockedDate) => $blockedDate->booking_date->format('Y-m-d'))
            ->values();

        $blockedSlotDates = BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', '>=', today())
            ->select('booking_date')
            ->groupBy('booking_date')
            ->havingRaw('COUNT(DISTINCT booking_time) >= ?', [count(self::BOOKING_TIME_SLOTS)])
            ->pluck('booking_date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString());

        $unavailableDates = collect(array_merge($unavailableDates->all(), $blockedSlotDates->all()))
            ->unique()
            ->values();

        $unavailableTimeSlots = BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', '>=', today())
            ->orderBy('booking_date')
            ->get(['booking_date', 'booking_time'])
            ->groupBy(fn (BlockedBookingTimeSlot $blockedSlot) => $blockedSlot->booking_date->format('Y-m-d'))
            ->map(fn ($slots) => collect(self::BOOKING_TIME_SLOTS)
                ->filter(fn (string $slot) => $slots->contains(
                    fn (BlockedBookingTimeSlot $blockedSlot) => $blockedSlot->booking_time === $slot
                ))
                ->values())
            ->all();

        // Capacity is based on active assignments, including legacy single-technician assignments.
        $technicianIds = User::query()->where('role', 'technician')->pluck('id')->map(fn ($id) => (int) $id);
        $technicianCount = $technicianIds->count();
        $activeBookings = Inquiry::query()
            ->with('technicians:id')
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->whereDate('preferred_date', '>=', today())
            ->get(['id', 'technician_id', 'preferred_date', 'preferred_time']);

        $assignedIdsForJob = function (Inquiry $job) {
            $ids = $job->technicians->pluck('id')->map(fn ($id) => (int) $id);
            if ($job->technician_id) {
                $ids->push((int) $job->technician_id);
            }

            return $ids->unique()->values();
        };

        $busyBySlot = $activeBookings
            ->groupBy(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d') . '|' . $job->preferred_time)
            ->map(fn ($jobs) => $jobs->flatMap($assignedIdsForJob)->unique()->count());

        $busyByDate = $activeBookings
            ->groupBy(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d'))
            ->map(fn ($jobs) => $jobs->flatMap($assignedIdsForJob)->unique()->count());

        $capacityBlockedSlots = [];
        foreach ($busyBySlot as $key => $busyTechnicianCount) {
            [$date, $time] = explode('|', $key, 2);
            if ($technicianCount === 0 || $busyTechnicianCount >= $technicianCount) {
                $capacityBlockedSlots[$date][] = $time;
            }
        }

        foreach ($capacityBlockedSlots as $date => $slots) {
            $unavailableTimeSlots[$date] = collect($unavailableTimeSlots[$date] ?? [])
                ->merge($slots)->unique()->values();
        }

        // A day is fully unavailable when every technician already has any active job that day,
        // even if their jobs are spread across different time slots.
        $capacityBlockedDates = $busyByDate
            ->filter(fn ($busyTechnicianCount) => $technicianCount === 0 || $busyTechnicianCount >= $technicianCount)
            ->keys();

        // A technician can take only one service per day. If every technician is
        // already assigned anywhere on this date, all three slots must be disabled.
        foreach ($capacityBlockedDates as $date) {
            $unavailableTimeSlots[$date] = collect($unavailableTimeSlots[$date] ?? [])
                ->merge(self::BOOKING_TIME_SLOTS)
                ->unique()
                ->values();
        }

        $fullyUnavailableDates = collect($unavailableTimeSlots)
            ->filter(fn ($slots) => collect(self::BOOKING_TIME_SLOTS)->every(fn ($slot) => collect($slots)->contains($slot)))
            ->keys();

        $unavailableDates = collect($unavailableDates)
            ->merge($capacityBlockedDates)
            ->merge($fullyUnavailableDates)
            ->unique()
            ->values();

        $noTechniciansAvailable = $technicianCount === 0;

        $catalogItems = Product::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => [
                'type' => 'product',
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'image' => $product->image,
                'price' => (float) $product->price,
                'installation_fee' => $product->installation_fee === null ? null : (float) $product->installation_fee,
                'available_stock' => $inventory->getAvailableStock($product),
            ])
            ->merge(
                Package::query()
                    ->with('packageItems.product')
                    ->orderBy('name')
                    ->get()
                    ->map(fn (Package $package) => [
                        'type' => 'package',
                        'id' => $package->id,
                        'name' => $package->name,
                        'category' => $package->category,
                        'image' => $package->image,
                        'price' => (float) $package->price,
                        'installation_fee' => $package->installation_fee === null ? null : (float) $package->installation_fee,
                        'available_stock' => $inventory->getAvailableStock($package),
                    ])
            )
            ->sortBy('name')
            ->values();

        $cartItems = $request->user()->cart
            ?->items()
            ->with('purchasable')
            ->get()
            ->map(function ($cartItem) use ($inventory) {
                $purchasable = $cartItem->purchasable;
                if (!$purchasable instanceof Product && !$purchasable instanceof Package) {
                    return null;
                }

                return [
                    'cart_item_id' => $cartItem->id,
                    'type' => $purchasable instanceof Package ? 'package' : 'product',
                    'id' => $purchasable->id,
                    'name' => $purchasable->name,
                    'category' => $purchasable->category,
                    'image' => $purchasable->image,
                    'price' => (float) $purchasable->price,
                    'installation_fee' => $purchasable->installation_fee === null
                        ? null
                        : (float) $purchasable->installation_fee,
                    'quantity' => (int) $cartItem->quantity,
                    'available_stock' => $inventory->getAvailableStock($purchasable),
                ];
            })
            ->filter()
            ->values() ?? collect();

        return Inertia::render('inquiry', [
            'unavailableDates' => $unavailableDates,
            'unavailableTimeSlots' => $unavailableTimeSlots,
            'noTechniciansAvailable' => $noTechniciansAvailable,
            'customer' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone ?? '',
            ],
            'item' => $item,
            'catalogItems' => $catalogItems,
            'cartItems' => $cartItems,
            'urgencyFees' => ServiceBookingFeeSetting::current()->fees(),
            'bookingRequestToken' => (string) Str::uuid(),
            'initialServiceType' => $initialServiceType,
        ]);
    }

    public function store(Request $request, InventoryService $inventory, JobNotificationService $jobNotifications)
    {
        $validated = $request->validate([
            'item_type' => ['nullable', 'required_if:service_type,Installation', 'in:product,package'],
            'item_id' => ['nullable', 'required_if:service_type,Installation', 'integer', 'min:1'],
            'item_quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'customer_email' => ['required', 'email', 'max:255'],
            'street_address' => ['required', 'string', 'max:255'],
            'address_details' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:120'],
            'service_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'service_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'booking_request_token' => ['nullable', 'uuid'],
            'service_type' => ['required', 'string', 'in:Installation,Site Inspection,Maintenance,Repair,Consultation,Other'],
            'urgency' => ['required', 'in:normal,urgent,emergency'],
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'preferred_time' => ['required', 'string', Rule::in(self::BOOKING_TIME_SLOTS)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'required_if:service_type,Installation', 'in:cash,gcash,card,maya'],
        ]);

        $urgencyFee = $this->configuredUrgencyFee($validated['urgency']);
        // Only flows that create an order require the stable form token. Existing
        // standard service requests remain compatible and do not create fee orders.
        if (
            ($validated['service_type'] === 'Installation' || $urgencyFee > 0) &&
            empty($validated['booking_request_token'])
        ) {
            throw ValidationException::withMessages([
                'booking_request_token' => 'Refresh the booking form before submitting an installation, urgent, or emergency booking.',
            ]);
        }

        // Persist only the server-derived amount in checkout payloads.
        $validated['urgency_fee'] = $urgencyFee;

        // A repeated submission from the same rendered form must reuse its existing
        // order instead of creating a second order with the same priority surcharge.
        $existingCheckout = !empty($validated['booking_request_token'])
            ? PendingInquiryCheckout::query()
                ->with(['order', 'inquiry'])
                ->where('user_id', $request->user()->id)
                ->where('booking_request_token', $validated['booking_request_token'])
                ->first()
            : null;

        if ($existingCheckout) {
            $existingOrder = $existingCheckout->order;
            $existingInquiry = $existingCheckout->inquiry;

            if (!$existingOrder || !$existingInquiry) {
                throw ValidationException::withMessages([
                    'booking_request_token' => 'This booking submission was already received. Check your service history or orders before submitting again.',
                ]);
            }

            if ($existingOrder->payment_method === 'cash' || $existingOrder->payment_status === 'paid') {
                return redirect()->route('inquiries.show', $existingInquiry)
                    ->with('success', 'This booking was already submitted. Your existing service request is shown here; no duplicate fee was created.');
            }

            return redirect()->route('purchases.show', $existingOrder)
                ->with('success', 'This booking was already submitted. Continue from the existing order to retry payment; no duplicate fee was created.');
        }

        if (
            $validated['service_type'] !== 'Installation' &&
            $urgencyFee > 0 &&
            empty($validated['payment_method'])
        ) {
            throw ValidationException::withMessages([
                'payment_method' => 'Choose a payment method to pay the ' . $validated['urgency'] . ' service booking fee.',
            ]);
        }

        if (
            $validated['service_type'] !== 'Installation' &&
            $urgencyFee > 0 &&
            ($validated['payment_method'] ?? 'cash') !== 'cash' &&
            !config('services.paymongo.secret_key')
        ) {
            throw ValidationException::withMessages([
                'payment_method' => 'Online payments are not configured. Choose Cash or contact SecureView before submitting this priority booking.',
            ]);
        }

        $hasLatitude = filled($validated['service_latitude'] ?? null);
        $hasLongitude = filled($validated['service_longitude'] ?? null);
        if ($hasLatitude !== $hasLongitude) {
            throw ValidationException::withMessages([
                'service_location' => 'Choose a point on the map or leave the map pin unset.',
            ]);
        }

        if (BlockedBookingDate::query()->whereDate('booking_date', $validated['preferred_date'])->exists()) {
            throw ValidationException::withMessages([
                'preferred_date' => 'This date is fully booked. Please choose another date.',
            ]);
        }

        if ($this->dateUnavailableByTechnicianCapacity($validated['preferred_date'])) {
            throw ValidationException::withMessages([
                'preferred_date' => 'No technicians are available on this date. Every technician is already scheduled for another service.',
            ]);
        }

        if (BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', $validated['preferred_date'])
            ->where('booking_time', $validated['preferred_time'])
            ->exists()) {
            throw ValidationException::withMessages([
                'preferred_time' => 'This time slot is fully booked. Please choose another time.',
            ]);
        }

        if ($this->slotUnavailableByTechnicianCapacity($validated['preferred_date'], $validated['preferred_time'])) {
            throw ValidationException::withMessages([
                'preferred_time' => 'All technicians are already occupied during this time slot. Please choose another time.',
            ]);
        }

        if (collect(self::BOOKING_TIME_SLOTS)->every(
            fn (string $slot) => $this->slotUnavailableByTechnicianCapacity($validated['preferred_date'], $slot)
        )) {
            throw ValidationException::withMessages([
                'preferred_date' => 'All technicians are fully booked for that day. Please choose another date.',
            ]);
        }

        $hasItemType = filled($validated['item_type'] ?? null);
        $hasItemId = filled($validated['item_id'] ?? null);
        if ($hasItemType !== $hasItemId) {
            throw ValidationException::withMessages([
                'item_id' => 'Select a product or package, or remove the item selection.',
            ]);
        }

        $inquirable = null;
        if ($hasItemType && $hasItemId) {
            $modelClass = $validated['item_type'] === 'product' ? Product::class : Package::class;
            $inquirable = $modelClass::findOrFail($validated['item_id']);
        }

        if ($validated['service_type'] === 'Installation') {
            if (!$inquirable) {
                throw ValidationException::withMessages([
                    'item_id' => 'Choose a product or package before booking an installation.',
                ]);
            }

            $cartItem = $request->user()->cart?->items()
                ->where('purchasable_type', get_class($inquirable))
                ->where('purchasable_id', $inquirable->id)
                ->first();

            if (!$cartItem) {
                throw ValidationException::withMessages([
                    'item_id' => 'Installation bookings require a product or package already in your cart. Add it from the store, then return to this page.',
                ]);
            }

            // The cart is authoritative for quantity; never trust the submitted quantity.
            $validated['item_quantity'] = (int) $cartItem->quantity;

            return $this->startInstallationPayment(
                $request,
                $validated,
                $inquirable,
                $inventory,
                $jobNotifications,
                $urgencyFee
            );
        }

        do {
            $inquiryNumber = 'INQ-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
        } while (Inquiry::where('inquiry_number', $inquiryNumber)->exists());

        $inquiry = Inquiry::create([
            'user_id' => $request->user()->id,
            'inquiry_number' => $inquiryNumber,
            'inquirable_type' => $inquirable ? get_class($inquirable) : null,
            'inquirable_id' => $inquirable?->id,
            'item_name' => $inquirable?->name,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'],
            'customer_email' => $validated['customer_email'],
            'street_address' => $validated['street_address'],
            'address_details' => $validated['address_details'] ?? null,
            'city' => $validated['city'],
            'service_latitude' => $validated['service_latitude'] ?? null,
            'service_longitude' => $validated['service_longitude'] ?? null,
            'google_place_id' => $validated['google_place_id'] ?? null,
            'service_type' => $validated['service_type'],
            'urgency' => $validated['urgency'],
            'urgency_fee' => $urgencyFee,
            'preferred_date' => $validated['preferred_date'],
            'preferred_time' => $validated['preferred_time'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        $jobNotifications->notifyNewInquirySubmitted($inquiry);

        if ($urgencyFee > 0) {
            return $this->startPriorityServicePayment($request, $validated, $inquiry, $urgencyFee);
        }

        return redirect()->route('inquiries.show', $inquiry)
            ->with('success', 'Your service request has been submitted successfully.')
            ->with('serviceNotification', [
                'title' => 'Service request submitted',
                'message' => 'Your service request ' . $inquiry->inquiry_number . ' has been submitted and is awaiting review.',
                'action_url' => route('inquiries.show', $inquiry),
            ]);
    }

    private function startInstallationPayment(
        Request $request,
        array $validated,
        Product|Package $item,
        InventoryService $inventory,
        JobNotificationService $jobNotifications,
        float $urgencyFee
    ) {
        $paymentMethod = $validated['payment_method'] ?? 'gcash';
        $secretKey = config('services.paymongo.secret_key');
        if ($paymentMethod !== 'cash' && !$secretKey) {
            return back()->withErrors([
                'payment' => 'Online payments are not configured yet. Add the PayMongo test secret key before booking an installation.',
            ])->withInput();
        }

        $itemQuantity = max(1, (int) ($validated['item_quantity'] ?? 1));
        $stockError = $inventory->getAvailabilityError($item, $itemQuantity);
        if ($stockError) {
            return back()->withErrors(['item_id' => $stockError])->withInput();
        }

        $installationFee = max(0, (float) ($item->installation_fee ?? 0));
        $itemPrice = (float) $item->price;
        $itemSubtotal = $itemPrice * $itemQuantity;
        $totalInstallationFee = $installationFee * $itemQuantity;
        $totalDue = $itemSubtotal + $totalInstallationFee + $urgencyFee;
        $serviceAddress = trim(implode(', ', array_filter([
            $validated['street_address'],
            $validated['address_details'] ?? null,
            $validated['city'],
        ])));

        [$order, $inquiry] = DB::transaction(function () use (
            $request, $validated, $item, $paymentMethod, $installationFee, $itemPrice, $itemQuantity, $itemSubtotal, $totalInstallationFee, $urgencyFee, $totalDue, $serviceAddress
        ) {
            do {
                $orderNumber = 'SV-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => $orderNumber,
                'subtotal' => $itemSubtotal,
                'shipping_fee' => 0,
                'installation_fee' => $totalInstallationFee,
                'service_priority_fee' => $urgencyFee,
                'total' => $totalDue,
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
                'order_status' => $paymentMethod === 'cash' ? 'pending' : 'awaiting_payment',
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'],
                'delivery_address' => $serviceAddress,
                'notes' => $validated['notes'] ?? null,
            ]);

            $order->items()->create([
                'purchasable_type' => get_class($item),
                'purchasable_id' => $item->id,
                'name' => $item->name,
                'warranty_period' => $item->warranty ?? null,
                'price' => $itemPrice,
                'quantity' => $itemQuantity,
                'subtotal' => $itemSubtotal,
            ]);

            do {
                $inquiryNumber = 'INQ-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            } while (Inquiry::where('inquiry_number', $inquiryNumber)->exists());

            $inquiry = Inquiry::create([
                'user_id' => $request->user()->id,
                'inquiry_number' => $inquiryNumber,
                'inquirable_type' => get_class($item),
                'inquirable_id' => $item->id,
                'item_name' => $item->name,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'],
                'street_address' => $validated['street_address'],
                'address_details' => $validated['address_details'] ?? null,
                'city' => $validated['city'],
                'service_latitude' => $validated['service_latitude'] ?? null,
                'service_longitude' => $validated['service_longitude'] ?? null,
                'google_place_id' => $validated['google_place_id'] ?? null,
                'service_type' => 'Installation',
                'urgency' => $validated['urgency'],
                'urgency_fee' => $urgencyFee,
                'preferred_date' => $validated['preferred_date'],
                'preferred_time' => $validated['preferred_time'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
            ]);

            PendingInquiryCheckout::create([
                'user_id' => $request->user()->id,
                'order_id' => $order->id,
                'inquiry_id' => $inquiry->id,
                'booking_request_token' => $validated['booking_request_token'],
                'payload' => $validated,
                'status' => 'pending_payment',
            ]);

            return [$order, $inquiry];
        });

        $jobNotifications->notifyNewInquirySubmitted($inquiry);

        if ($paymentMethod === 'cash') {
            return redirect()->route('inquiries.show', $inquiry)
                ->with('success', 'Your installation service has been booked. Payment is pending until SecureView confirms receipt of cash.')
                ->with('serviceNotification', [
                    'title' => 'Installation service booked',
                    'message' => 'Your service ' . $inquiry->inquiry_number . ' is saved and awaiting payment confirmation.',
                    'action_url' => route('inquiries.show', $inquiry),
                ]);
        }

        $lineItems = [[
            'name' => $item->name,
            'amount' => (int) round($itemPrice * 100),
            'currency' => 'PHP',
            'quantity' => $itemQuantity,
        ]];
        if ($installationFee > 0) {
            $lineItems[] = [
                'name' => 'Installation fee — ' . $item->name,
                'amount' => (int) round($installationFee * 100),
                'currency' => 'PHP',
                'quantity' => $itemQuantity,
            ];
        }
        if ($urgencyFee > 0) {
            $lineItems[] = [
                'name' => ucfirst($validated['urgency']) . ' service booking fee',
                'amount' => (int) round($urgencyFee * 100),
                'currency' => 'PHP',
                'quantity' => 1,
            ];
        }

        try {
            $response = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->asJson()
                ->withHeaders(['Idempotency-Key' => 'secureview-installation-' . $order->order_number])
                ->post(rtrim(config('services.paymongo.base_url'), '/') . '/v2/checkout_sessions', [
                    'data' => [
                        'attributes' => [
                            'line_items' => $lineItems,
                            'payment_method_types' => [$paymentMethod === 'maya' ? 'paymaya' : $paymentMethod],
                            'billing' => [
                                'name' => $order->customer_name,
                                'email' => $order->customer_email,
                                'phone' => $order->customer_phone,
                            ],
                            'description' => 'SecureView Installation Booking ' . $order->order_number,
                            'reference_number' => $order->order_number,
                            'metadata' => [
                                'order_id' => (string) $order->id,
                                'order_number' => $order->order_number,
                                'booking_type' => 'installation_inquiry',
                            ],
                            'send_email_receipt' => true,
                            'show_description' => true,
                            'show_line_items' => true,
                            'success_url' => route('checkout.payment.success', ['order' => $order->id], true),
                            'cancel_url' => route('checkout.payment.cancel', ['order' => $order->id], true),
                        ],
                    ],
                ]);

            if (!$response->successful()) {
                $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
                return back()->withErrors([
                    'payment' => 'Unable to start the installation payment. Please check PayMongo and try again.',
                ])->withInput();
            }

            $session = $response->json('data');
            $checkoutSessionId = $session['id'] ?? null;
            $checkoutUrl = $session['attributes']['checkout_url'] ?? null;
            if (!$checkoutSessionId || !$checkoutUrl) {
                $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
                return back()->withErrors([
                    'payment' => 'The payment gateway returned an invalid checkout session. Your service request is saved, but payment is not confirmed. Open Order History to retry payment.',
                ])->withInput();
            }

            $order->update(['paymongo_checkout_session_id' => $checkoutSessionId]);
            return Inertia::location($checkoutUrl);
        } catch (\Throwable $exception) {
            report($exception);
            $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
            return back()->withErrors([
                'payment' => 'Unable to connect to the payment gateway. Your service request remains saved, but payment is not confirmed. Open Order History to retry payment.',
            ])->withInput();
        }
    }

    private function configuredUrgencyFee(string $urgency): float
    {
        if ($urgency === 'normal') {
            return 0.0;
        }

        $fees = ServiceBookingFeeSetting::current()->fees();

        return round(max(0, (float) ($fees[$urgency] ?? 0)), 2);
    }

    /**
     * Urgent and emergency non-installation bookings do not need a catalog item,
     * but their configured priority fee is still an order and payment record.
     * The pending checkout references the existing inquiry so payment-return
     * and webhook handling can safely finalize it without creating a duplicate.
     */
    private function startPriorityServicePayment(
        Request $request,
        array $validated,
        Inquiry $inquiry,
        float $urgencyFee
    ) {
        $paymentMethod = $validated['payment_method'];
        $serviceAddress = trim(implode(', ', array_filter([
            $validated['street_address'],
            $validated['address_details'] ?? null,
            $validated['city'],
        ])));

        [$order, $pendingCheckout] = DB::transaction(function () use (
            $request,
            $validated,
            $inquiry,
            $paymentMethod,
            $urgencyFee,
            $serviceAddress
        ) {
            do {
                $orderNumber = 'SV-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            } while (Order::query()->where('order_number', $orderNumber)->exists());

            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => $orderNumber,
                'subtotal' => 0,
                'shipping_fee' => 0,
                'installation_fee' => 0,
                'service_priority_fee' => $urgencyFee,
                'total' => $urgencyFee,
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
                'order_status' => $paymentMethod === 'cash' ? 'pending' : 'awaiting_payment',
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'],
                'delivery_address' => $serviceAddress,
                'delivery_address_details' => $validated['address_details'] ?? null,
                'delivery_city' => $validated['city'],
                'delivery_latitude' => $validated['service_latitude'] ?? null,
                'delivery_longitude' => $validated['service_longitude'] ?? null,
                'notes' => trim('Priority booking fee for ' . $inquiry->inquiry_number . '. ' . ($validated['notes'] ?? '')),
            ]);

            $pendingCheckout = PendingInquiryCheckout::create([
                'user_id' => $request->user()->id,
                'order_id' => $order->id,
                'inquiry_id' => $inquiry->id,
                'booking_request_token' => $validated['booking_request_token'],
                'payload' => $validated,
                'status' => 'pending_payment',
            ]);

            return [$order, $pendingCheckout];
        });

        if ($paymentMethod === 'cash') {
            return redirect()->route('inquiries.show', $inquiry)
                ->with('success', 'Your ' . strtolower($inquiry->service_type) . ' request is saved. The ' . $validated['urgency'] . ' booking fee is pending until SecureView confirms receipt of cash.')
                ->with('serviceNotification', [
                    'title' => 'Priority service request submitted',
                    'message' => 'Your ' . $inquiry->inquiry_number . ' request is awaiting review and cash confirmation for its priority booking fee.',
                    'action_url' => route('inquiries.show', $inquiry),
                ]);
        }

        $secretKey = config('services.paymongo.secret_key');
        if (!$secretKey) {
            // This is guarded before the inquiry is created; retain this defensive check.
            $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
            return back()->withErrors(['payment_method' => 'Online payments are not configured. Choose Cash or contact SecureView.'])->withInput();
        }

        $lineItems = [[
            'name' => ucfirst($validated['urgency']) . ' service booking fee — ' . $inquiry->service_type,
            'amount' => (int) round($urgencyFee * 100),
            'currency' => 'PHP',
            'quantity' => 1,
        ]];

        try {
            $response = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->asJson()
                ->withHeaders(['Idempotency-Key' => 'secureview-priority-service-' . $order->order_number])
                ->post(rtrim(config('services.paymongo.base_url'), '/') . '/v2/checkout_sessions', [
                    'data' => [
                        'attributes' => [
                            'line_items' => $lineItems,
                            'payment_method_types' => [$paymentMethod === 'maya' ? 'paymaya' : $paymentMethod],
                            'billing' => [
                                'name' => $order->customer_name,
                                'email' => $order->customer_email,
                                'phone' => $order->customer_phone,
                            ],
                            'description' => 'SecureView ' . ucfirst($validated['urgency']) . ' Service Booking Fee ' . $order->order_number,
                            'reference_number' => $order->order_number,
                            'metadata' => [
                                'order_id' => (string) $order->id,
                                'order_number' => $order->order_number,
                                'booking_type' => 'priority_service_inquiry',
                                'inquiry_id' => (string) $inquiry->id,
                            ],
                            'send_email_receipt' => true,
                            'show_description' => true,
                            'show_line_items' => true,
                            'success_url' => route('checkout.payment.success', ['order' => $order->id], true),
                            'cancel_url' => route('checkout.payment.cancel', ['order' => $order->id], true),
                        ],
                    ],
                ]);

            if (!$response->successful()) {
                $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
                return back()->withErrors([
                    'payment' => 'Unable to start the priority booking fee payment. Your service request is saved; retry payment from your Orders page.',
                ])->withInput();
            }

            $session = $response->json('data');
            $checkoutSessionId = $session['id'] ?? null;
            $checkoutUrl = $session['attributes']['checkout_url'] ?? null;

            if (!$checkoutSessionId || !$checkoutUrl) {
                $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
                return back()->withErrors([
                    'payment' => 'PayMongo returned an invalid checkout response. Your service request is saved; retry payment from your Orders page.',
                ])->withInput();
            }

            $order->update(['paymongo_checkout_session_id' => $checkoutSessionId]);
            CustomerNotification::create([
                'user_id' => $request->user()->id,
                'type' => 'order',
                'title' => 'Priority fee payment required',
                'message' => 'Your ' . $validated['urgency'] . ' service booking fee for ' . $inquiry->inquiry_number . ' is awaiting payment.',
                'action_url' => route('purchases.show', $order),
                'related_type' => Order::class,
                'related_id' => $order->id,
            ]);

            return Inertia::location($checkoutUrl);
        } catch (\Throwable $exception) {
            report($exception);
            $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
            return back()->withErrors([
                'payment' => 'Unable to connect to PayMongo. Your service request is saved; retry payment from your Orders page.',
            ])->withInput();
        }
    }

    public function index(Request $request)
    {
        Inquiry::escalateOverdueUrgency();

        $inquiries = $request->user()
            ->inquiries()
            ->with(['technician', 'technicians', 'pendingCheckout.order'])
            ->latest()
            ->get()
            ->map(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'item_name' => $inquiry->item_name,
                    'service_type' => $inquiry->service_type,
                    'urgency' => $inquiry->urgency,
                    'urgency_fee' => (float) $inquiry->urgency_fee,
                    'technician' => $inquiry->technician
                        ? [
                            'name' => $inquiry->technician->name,
                            'email' => $inquiry->technician->email,
                        ]
                        : null,
                    'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                        'name' => $technician->name,
                        'email' => $technician->email,
                    ])->values(),
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                    'preferred_time' => $inquiry->preferred_time,
                    'city' => $inquiry->city,
                    'address_details' => $inquiry->address_details,
                    'service_latitude' => $inquiry->service_latitude,
                    'service_longitude' => $inquiry->service_longitude,
                    'google_place_id' => $inquiry->google_place_id,
                    'street_address' => $inquiry->street_address,
                    'status' => $inquiry->status,
                    'payment_status' => $inquiry->pendingCheckout?->order?->payment_status ?? 'not_applicable',
                    'payment_method' => $inquiry->pendingCheckout?->order?->payment_method,
                    'order_id' => $inquiry->pendingCheckout?->order?->id,
                    'order_number' => $inquiry->pendingCheckout?->order?->order_number,
                    'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                    'created_date' => $inquiry->created_at?->format('M d, Y'),
                    'created_time' => $inquiry->created_at?->format('h:i A'),
                ];
            })->values();

        return Inertia::render('inquiries', [
            'inquiries' => $inquiries,
        ]);
    }

    public function show(Request $request, Inquiry $inquiry)
    {
        Inquiry::escalateOverdueUrgency();

        if ($inquiry->user_id !== $request->user()->id) {
            abort(404);
        }

        $inquiry->load(['inquirable', 'technician', 'technicians', 'pendingCheckout.order']);

        return Inertia::render('inquiry_details', [
            'inquiry' => [
                'id' => $inquiry->id,
                'inquiry_number' => $inquiry->inquiry_number,
                'item_name' => $inquiry->item_name,
                'item_type' => $inquiry->inquirable_type === Package::class
                    ? 'package'
                    : ($inquiry->inquirable_type === Product::class ? 'product' : null),
                'item_image' => $inquiry->inquirable?->image,
                'customer_name' => $inquiry->customer_name,
                'customer_phone' => $inquiry->customer_phone,
                'customer_email' => $inquiry->customer_email,
                'street_address' => $inquiry->street_address,
                'address_details' => $inquiry->address_details,
                'city' => $inquiry->city,
                'service_latitude' => $inquiry->service_latitude,
                'service_longitude' => $inquiry->service_longitude,
                'google_place_id' => $inquiry->google_place_id,
                'service_type' => $inquiry->service_type,
                'urgency' => $inquiry->urgency,
                'urgency_fee' => (float) $inquiry->urgency_fee,
                'technician' => $inquiry->technician
                    ? [
                        'name' => $inquiry->technician->name,
                        'email' => $inquiry->technician->email,
                    ]
                    : null,
                'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                    'name' => $technician->name,
                    'email' => $technician->email,
                ])->values(),
                'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                'preferred_time' => $inquiry->preferred_time,
                'reschedule_requested_date' => $inquiry->reschedule_requested_date?->format('Y-m-d'),
                'reschedule_requested_time' => $inquiry->reschedule_requested_time,
                'reschedule_request_status' => $inquiry->reschedule_request_status ?? 'none',
                'reschedule_request_note' => $inquiry->reschedule_request_note,
                'notes' => $inquiry->notes,
                'status' => $inquiry->status,
                'payment_status' => $inquiry->pendingCheckout?->order?->payment_status ?? 'not_applicable',
                'payment_method' => $inquiry->pendingCheckout?->order?->payment_method,
                'order_id' => $inquiry->pendingCheckout?->order?->id,
                'order_number' => $inquiry->pendingCheckout?->order?->order_number,
                'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                'created_date' => $inquiry->created_at?->format('M d, Y'),
                'created_time' => $inquiry->created_at?->format('h:i A'),
            ],
            'success' => $request->session()->get('success'),
        ]);
    }
    public function requestReschedule(Request $request, Inquiry $inquiry)
    {
        abort_unless($inquiry->user_id === $request->user()->id, 404);

        if ($inquiry->status !== 'confirmed') {
            throw ValidationException::withMessages([
                'reschedule' => 'Only confirmed services can be rescheduled by customers.',
            ]);
        }

        if (($inquiry->reschedule_request_status ?? 'none') === 'pending') {
            throw ValidationException::withMessages([
                'reschedule' => 'You already have a reschedule request awaiting review.',
            ]);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', Rule::in(self::BOOKING_TIME_SLOTS)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if (BlockedBookingDate::query()->whereDate('booking_date', $validated['preferred_date'])->exists()) {
            throw ValidationException::withMessages([
                'preferred_date' => 'That date is marked fully booked. Please choose another date.',
            ]);
        }

        if ($this->dateUnavailableByTechnicianCapacity($validated['preferred_date'], $inquiry->id)) {
            throw ValidationException::withMessages([
                'preferred_date' => 'No technicians are available on that date. Every technician is already scheduled for another service.',
            ]);
        }

        if (BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', $validated['preferred_date'])
            ->where('booking_time', $validated['preferred_time'])
            ->exists()) {
            throw ValidationException::withMessages([
                'preferred_time' => 'That time slot is marked fully booked. Please choose another time.',
            ]);
        }

        $technicianIds = User::query()->where('role', 'technician')->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($technicianIds) {
            $busyIds = Inquiry::query()
                ->where('id', '!=', $inquiry->id)
                ->whereDate('preferred_date', $validated['preferred_date'])
                ->where('preferred_time', $validated['preferred_time'])
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->whereHas('technicians', fn ($query) => $query->whereIn('users.id', $technicianIds))
                ->with('technicians:id')
                ->get()
                ->flatMap(fn (Inquiry $job) => $job->technicians->pluck('id'))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->all();

            if (count(array_diff($technicianIds, $busyIds)) === 0) {
                throw ValidationException::withMessages([
                    'preferred_time' => 'No technicians are available for that time slot. Please choose another slot.',
                ]);
            }
        } else {
            throw ValidationException::withMessages([
                'preferred_time' => 'There are no technicians available for scheduling right now.',
            ]);
        }

        $inquiry->update([
            'reschedule_requested_date' => $validated['preferred_date'],
            'reschedule_requested_time' => $validated['preferred_time'],
            'reschedule_request_status' => 'pending',
            'reschedule_request_note' => $validated['note'] ?? null,
            'reschedule_requested_at' => now(),
        ]);

        CustomerNotification::create([
            'user_id' => $inquiry->user_id,
            'type' => 'reschedule_request',
            'title' => 'Reschedule request submitted',
            'message' => 'Your requested change for ' . $inquiry->inquiry_number . ' is awaiting technician/admin approval. Your current appointment remains unchanged until approval.',
            'action_url' => route('inquiries.show', $inquiry),
            'related_type' => Inquiry::class,
            'related_id' => $inquiry->id,
        ]);

        return redirect()->route('inquiries.show', $inquiry)
            ->with('success', 'Reschedule request submitted. Your current appointment remains active until the request is approved.');
    }

    private function dateUnavailableByTechnicianCapacity(string $date, ?int $exceptInquiryId = null): bool
    {
        $technicianCount = User::query()->where('role', 'technician')->count();
        if ($technicianCount === 0) {
            return true;
        }

        $techniciansBusyThatDay = User::query()
            ->where('role', 'technician')
            ->where(function ($technicianQuery) use ($date, $exceptInquiryId) {
                $applyActiveDate = function ($query) use ($date, $exceptInquiryId) {
                    $query->whereDate('preferred_date', $date)
                        ->whereIn('status', ['pending', 'confirmed', 'in_progress']);
                    if ($exceptInquiryId !== null) {
                        $query->where('inquiries.id', '!=', $exceptInquiryId);
                    }
                };

                $technicianQuery
                    ->whereHas('assignedInquiries', $applyActiveDate)
                    ->orWhereHas('technicianInquiries', $applyActiveDate);
            })
            ->count();

        return $techniciansBusyThatDay >= $technicianCount;
    }

    private function slotUnavailableByTechnicianCapacity(string $date, string $time): bool
    {
        $technicianCount = User::query()->where('role', 'technician')->count();
        if ($technicianCount === 0) {
            return true;
        }

        $busyTechnicianCount = User::query()
            ->where('role', 'technician')
            ->where(function ($technicianQuery) use ($date, $time) {
                // A technician assigned to any service that day cannot take another slot.
                $applyActiveSlot = function ($query) use ($date, $time) {
                    $query->whereDate('preferred_date', $date)
                        ->whereIn('status', ['pending', 'confirmed', 'in_progress']);
                };

                $technicianQuery
                    ->whereHas('assignedInquiries', $applyActiveSlot)
                    ->orWhereHas('technicianInquiries', $applyActiveSlot);
            })
            ->count();

        return $busyTechnicianCount >= $technicianCount;
    }

}
