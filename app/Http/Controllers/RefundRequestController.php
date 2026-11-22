<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\RefundService;
use Illuminate\Http\Request;

class RefundRequestController extends Controller
{
    public function store(Request $request, Order $order, RefundService $refunds)
    {
        if ((int) $order->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $refunds->requestCustomerRefund(
            $order,
            $request->user(),
            (float) $validated['amount'],
            $validated['reason']
        );

        return back()->with('success', 'Your refund request was submitted and is awaiting review.');
    }
}
