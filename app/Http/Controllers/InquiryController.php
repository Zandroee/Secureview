<?php

namespace App\Http\Controllers;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
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

    public function create(Request $request)
    {
        $item = null;

        if ($request->filled('item_type') && $request->filled('item_id')) {
            $validated = $request->validate([
                'item_type' => ['required', 'in:product,package'],
                'item_id' => ['required', 'integer', 'min:1'],
            ]);

            $modelClass = $validated['item_type'] === 'product'
                ? Product::class
                : Package::class;

            $purchasable = $modelClass::findOrFail($validated['item_id']);

            $item = [
                'type' => $validated['item_type'],
                'id' => $purchasable->id,
                'name' => $purchasable->name,
                'image' => $purchasable->image,
            ];
        }

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

        // map() on an Eloquent collection preserves its model-aware collection type,
        // but these items are strings. Convert to a base Support collection before unique().
        $unavailableDates = collect(array_merge(
            $unavailableDates->all(),
            $blockedSlotDates->all()
        ))->unique()->values();

        $unavailableTimeSlots = BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', '>=', today())
            ->orderBy('booking_date')
            ->get(['booking_date', 'booking_time'])
            ->groupBy(fn (BlockedBookingTimeSlot $blockedSlot) => $blockedSlot->booking_date->format('Y-m-d'))
            ->map(fn ($slots) => $slots->pluck('booking_time')->values())
            ->all();

        return Inertia::render('inquiry', [
            'unavailableDates' => $unavailableDates,
            'unavailableTimeSlots' => $unavailableTimeSlots,
            'customer' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone ?? '',
            ],
            'item' => $item,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['nullable', 'in:product,package'],
            'item_id' => ['nullable', 'integer', 'min:1'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => [
                'required',
                'string',
                'regex:/^09\d{9}$/',
            ],
            'customer_email' => ['required', 'email', 'max:255'],
            'street_address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'service_type' => [
                'required',
                'string',
                'in:Installation,Site Inspection,Maintenance,Repair,Consultation,Other',
            ],
            'urgency' => [
                'required',
                'in:normal,urgent,emergency',
            ],
            'preferred_date' => [
                'required',
                'date',
                'after_or_equal:today',
            ],
            'preferred_time' => ['required', 'string', Rule::in(self::BOOKING_TIME_SLOTS)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (BlockedBookingDate::query()
            ->whereDate('booking_date', $validated['preferred_date'])
            ->exists()) {
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

        $inquirable = null;

        if ($validated['item_type'] && $validated['item_id']) {
            $modelClass = $validated['item_type'] === 'product'
                ? Product::class
                : Package::class;

            $inquirable = $modelClass::findOrFail($validated['item_id']);
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
            'city' => $validated['city'],
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
                'city' => $inquiry->city,
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
