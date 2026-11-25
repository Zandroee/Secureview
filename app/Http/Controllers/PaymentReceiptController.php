<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentReceiptController extends Controller
{
    public function store(Request $request, Order $order)
    {
        // PayMongo is the source of truth; a screenshot only supplements the receipt.
        abort_unless($order->user_id === $request->user()->id, 404);

        if (($order->sales_channel ?? 'online') !== 'online'
            || !in_array($order->payment_method, ['gcash', 'card', 'maya'], true)
            || !in_array($order->payment_status, ['paid', 'partially_refunded'], true)
            || $order->order_status === 'cancelled') {
            throw ValidationException::withMessages([
                'receipt' => 'You can attach a receipt only to your successfully paid online order.',
            ]);
        }

        $validated = $request->validate([
            'receipt' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $file = $validated['receipt'];
        $oldPath = $order->payment_receipt_path;
        $path = $file->store('payment-receipts/' . $order->id, 'local');
        if (!$path) {
            throw ValidationException::withMessages(['receipt' => 'Unable to save the receipt. Please try again.']);
        }

        try {
            $order->update([
                'payment_receipt_path' => $path,
                'payment_receipt_uploaded_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        $order->events()->create([
            'actor_user_id' => $request->user()->id,
            'event_key' => 'payment_receipt_uploaded',
            'title' => 'Payment receipt attached',
            'description' => 'The customer uploaded a payment screenshot for the shop to review. Payment status was not changed.',
            'payment_status_before' => $order->payment_status,
            'payment_status_after' => $order->payment_status,
            'order_status_before' => $order->order_status,
            'order_status_after' => $order->order_status,
        ]);

        return back()->with('success', 'Receipt saved securely. Netmax Trading can review it along with the verified PayMongo payment.');
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || $order->user_id === $user->id, 404);

        $path = $order->payment_receipt_path;
        abort_unless(is_string($path)
            && str_starts_with($path, 'payment-receipts/' . $order->id . '/')
            && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        ]);
    }
}
