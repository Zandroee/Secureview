<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Services\AdminActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryTrackingController extends Controller
{
    public function update(Request $request, Order $order, string $status, AdminActivityLogger $logger)
    {
        abort_unless(in_array($status, ['out_for_delivery', 'delivered'], true), 404);

        DB::transaction(function () use ($request, $order, $status, $logger) {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            $expected = $status === 'out_for_delivery' ? 'processing' : 'out_for_delivery';

            if (($locked->sales_channel ?? 'online') !== 'online'
                || ($locked->fulfillment_method ?? 'delivery') !== 'delivery'
                || !in_array($locked->payment_status, ['paid', 'partially_refunded'], true)
                || $locked->order_status !== $expected) {
                throw ValidationException::withMessages([
                    'order' => 'Only paid delivery orders can move from Processing to Out for Delivery, then Delivered.',
                ]);
            }

            $locked->update(['order_status' => $status]);
            $title = $status === 'out_for_delivery' ? 'Order out for delivery' : 'Order delivered';
            $message = $status === 'out_for_delivery'
                ? 'Your order ' . $locked->order_number . ' is on its way.'
                : 'Your order ' . $locked->order_number . ' was marked delivered by Netmax Trading.';

            $locked->events()->create([
                'actor_user_id' => $request->user()->id,
                'event_key' => 'shipment_status_changed',
                'title' => $title,
                'description' => $message,
                'payment_status_before' => $locked->payment_status,
                'payment_status_after' => $locked->payment_status,
                'order_status_before' => $expected,
                'order_status_after' => $status,
                'metadata' => ['source' => 'admin_order_management'],
            ]);

            if ($locked->user_id) {
                CustomerNotification::create([
                    'user_id' => $locked->user_id,
                    'type' => 'order_status',
                    'title' => $title,
                    'message' => $message,
                    'action_url' => route('purchases.show', $locked),
                    'related_type' => Order::class,
                    'related_id' => $locked->id,
                ]);
            }

            $logger->record(
                $request,
                'shipment_status_changed',
                $title . ': ' . $locked->order_number,
                $locked,
                ['status' => $expected],
                ['status' => $status]
            );
        });

        return back()->with('success', $status === 'delivered'
            ? 'Order marked Delivered; customer notified and tracking updated.'
            : 'Order marked Out for Delivery; customer notified and tracking updated.');
    }
}
