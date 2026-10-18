<?php

namespace App\Http\Controllers;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
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
            'customer' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone ?? '',
            ],
            'item' => $item,
            'catalogItems' => $catalogItems,
            'cartItems' => $cartItems,
            'initialServiceType' => $initialServiceType,
        ]);
    }

    public function store(Request $request, InventoryService $inventory)
    {
        $validated = $request->validate([
            'item_type' => ['nullable', 'required_if:service_type,Installation', 'in:product,package'],
            'item_id' => ['nullable', 'required_if:service_type,Installation', 'integer', 'min:1'],
            'item_quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'customer_name => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'customer_email' => ['required', 'email', 'max:255'],
            'street_address' => ['required', 'string', 'max:255'],
            'address_details' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:120'],
            'service_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'service_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'service_type' => ['required', 'string', 'in:Installation,Site Inspection,Maintenance,Repair,Consultation,Other'],
            'urgency' => ['required', 'in:normal,urgent,emergency'],
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'preferred_time' => ['required', 'string', Rule::in(self::BOOKING_TIME_SLOTS)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'required_if:service_type,Installation', 'in:gcash,card,maya'],
        ]);

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

        if (BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', $validated['preferred_date'])
            ->where('booking_time', $validated['preferred_time'])
            ->exists()) {
            throw ValidationException::withMessages([
                'preferred_time' => 'This time slot is fully booked. Please choose another time.',
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

            return $this->startInstallationPayment($request, $validated, $inquirable, $inventory);
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
            'preferred_date' => $validated['preferred_date'],
            'preferred_time' => $validated['preferred_time'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        CustomerNotification::create([
            'user_id' => $request->user()->id,
            'type' => 'inquiry',
            'title' => 'Inquiry received',
            'message' => 'Your inquiry ' . $inquiry->inquiry_number . ' has been received.',
            'action_url' => route('inquiries.show', $inquiry),
            'related_type' => Inquiry::class,
            'related_id' => $inquiry->id,
        ]);

        return redirect()->route('inquiries.show', $inquiry)->with(
            'success',
            'Your inquiry has been submitted successfully.'
        );
    }

    private function startInstallationPayment(
        Request $request,
        array $validated,
        Product|Package $item,
        InventoryService $inventory
    ) {
        $secretKey = config('services.paymongo.secret_key');
        if (!$secretKey) {
            return back()->withErrors([
                'payment' => 'Online payments are not configured yet. Add the PayMongo test secret key before booking an installation.',
            ])->withInput();
        }

        $itemQuantity = max(1, (int) ($validated['item_quantity'] ?? 1));
        $stockError = $inventory->getAvailabilityError($item, $itemQuantity);
        if ($stockError) {
            return back()->withErrors(['item_id' => $stockError])->withInput();
        }

        $paymentMethod = $validated['payment_method'] ?? 'gcash';
        $installationFee = max(0, (float) ($item->installation_fee ?? 0));
        $itemPrice = (float) $item->price;
        $itemSubtotal = $itemPrice * $itemQuantity;
        $totalInstallationFee = $installationFee * $itemQuantity;
        $serviceAddress = trim(implode(', ', array_filter([
            $validated['street_address'],
            $validated['address_details'] ?? null,
            $validated['city'],
        ])));

        $order = DB::transaction(function () use (
            $request, $validated, $item, $paymentMethod, $installationFee, $itemPrice, $itemQuantity, $itemSubtotal, $totalInstallationFee, $serviceAddress
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
                'total' => $itemSubtotal + $totalInstallationFee,
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
                'order_status' => 'awaiting_payment',
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
                'price' => $itemPrice,
                'quantity' => $itemQuantity,
                'subtotal' => $itemSubtotal,
            ]);

            PendingInquiryCheckout::create([
                'user_id' => $request->user()->id,
                'order_id' => $order->id,
                'payload' => $validated,
                'status' => 'pending_payment',
            ]);

            return $order;
        });

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
                    'payment' => 'The payment gateway returned an invalid checkout session. No inquiry has been submitted.',
                ])->withInput();
            }

            $order->update(['paymongo_checkout_session_id' => $checkoutSessionId]);
            return Inertia::location($checkoutUrl);
        } catch (\Throwable $exception) {
            report($exception);
            $order->update(['payment_status' => 'failed', 'order_status' => 'payment_failed']);
            return back()->withErrors([
                'payment' => 'Unable to connect to the payment gateway. No inquiry has been submitted; please try again.',
            ])->withInput();
        }
    }

    public function index(Request $request)
    {
        $inquiries = $request->user()
            ->inquiries()
            ->with(['technician', 'technicians'])
            ->latest()
            ->get()
            ->map(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'item_name' => $inquiry->item_name,
                    'service_type' => $inquiry->service_type,
                    'urgency' => $inquiry->urgency,
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
                    'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                ];
            })->values();

        return Inertia::render('inquiries', [
            'inquiries' => $inquiries,
        ]);
    }

    public function show(Request $request, Inquiry $inquiry)
    {
        if ($inquiry->user_id !== $request->user()->id) {
            abort(404);
        }

        $inquiry->load(['inquirable', 'technician', 'technicians']);

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
                'notes' => $inquiry->notes,
                'status' => $inquiry->status,
                'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
            ],
            'success' => $request->session()->get('success'),
        ]);
    }
}
