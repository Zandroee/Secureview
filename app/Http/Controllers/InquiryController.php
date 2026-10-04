<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InquiryController extends Controller
{
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

        return Inertia::render('inquiry', [
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
            'preferred_date' => [
                'required',
                'date',
                'after_or_equal:today',
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

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
            'preferred_date' => $validated['preferred_date'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
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
            ->latest()
            ->get()
            ->map(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'item_name' => $inquiry->item_name,
                    'service_type' => $inquiry->service_type,
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
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

        $inquiry->load('inquirable');

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
                'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                'notes' => $inquiry->notes,
                'status' => $inquiry->status,
                'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
            ],
            'success' => $request->session()->get('success'),
        ]);
    }
}
