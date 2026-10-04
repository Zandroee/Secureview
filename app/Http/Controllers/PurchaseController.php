<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $orders = $request->user()
            ->orders()
            ->with(['items.purchasable'])
            ->latest()
            ->get()
            ->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'subtotal' => (float) $order->subtotal,
                    'shipping_fee' => (float) $order->shipping_fee,
                    'total' => (float) $order->total,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
                    'order_status' => $order->order_status,
                    'created_at' => $order->created_at?->format('M d, Y h:i A'),
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name,
                            'price' => (float) $item->price,
                            'quantity' => (int) $item->quantity,
                            'subtotal' => (float) $item->subtotal,
                            'type' => $item->purchasable_type === \App\Models\Package::class
                                ? 'package'
                                : 'product',
                            'image' => $item->purchasable?->image,
                        ];
                    })->values(),
                ];
            })->values();

        return Inertia::render('purchases', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        $order->load('items.purchasable');

        return Inertia::render('purchase_details', [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'subtotal' => (float) $order->subtotal,
                'shipping_fee' => (float) $order->shipping_fee,
                'total' => (float) $order->total,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'order_status' => $order->order_status,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'customer_email' => $order->customer_email,
                'delivery_address' => $order->delivery_address,
                'notes' => $order->notes,
                'created_at' => $order->created_at?->format('M d, Y h:i A'),
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'price' => (float) $item->price,
                        'quantity' => (int) $item->quantity,
                        'subtotal' => (float) $item->subtotal,
                        'type' => $item->purchasable_type === \App\Models\Package::class
                            ? 'package'
                            : 'product',
                        'image' => $item->purchasable?->image,
                    ];
                })->values(),
            ],
        ]);
    }
}
