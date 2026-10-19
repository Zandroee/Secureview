<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $schedules = $request->user()
            ->inquiries()
            ->with('inquirable')
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->latest('preferred_date')
            ->get()
            ->map(function ($inquiry) {
                return [
                    'id' => $inquiry->id,
                    'receipt_id' => $inquiry->inquiry_number,
                    'service_type' => $inquiry->service_type,
                    'date' => $inquiry->preferred_date?->format('M d, Y'),
                    'time' => $inquiry->preferred_time,
                    'status' => $inquiry->status === 'in_progress' ? 'In Progress' : 'Confirmed',
                    'item_name' => $inquiry->item_name,
                    'item_type' => $inquiry->inquirable_type === \App\Models\Package::class
                        ? 'package'
                        : 'product',
                    'item_image' => $inquiry->inquirable?->image,
                ];
            })->values();

        return Inertia::render('schedules', [
            'schedules' => $schedules,
        ]);
    }
}
