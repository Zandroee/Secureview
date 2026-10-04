<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class PayMongoWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (!$webhookSecret || !$signatureHeader) {
            return response()->json([
                'message' => 'Webhook signature is not configured.',
            ], 401);
        }

        $parts = [];

        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $testSignature = $parts['te'] ?? null;
        $liveSignature = $parts['li'] ?? null;

        if (!$timestamp) {
            return response()->json([
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return response()->json([
                'message' => 'Webhook signature has expired.',
            ], 401);
        }

        $signedPayload = $timestamp . '.' . $rawBody;

        $expectedSignature = hash_hmac(
            'sha256',
            $signedPayload,
            $webhookSecret
        );

        $signatureMatches =
            ($testSignature && hash_equals($expectedSignature, $testSignature)) ||
            ($liveSignature && hash_equals($expectedSignature, $liveSignature));

        if (!$signatureMatches) {
            return response()->json([
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        $payload = json_decode($rawBody, true);

        if (!is_array($payload)) {
            return response()->json([
                'message' => 'Invalid webhook payload.',
            ], 400);
        }

        $event = $payload['data']['type'] ?? null;

        if ($event !== 'checkout_session.payment.paid') {
            return response()->json([
                'received' => true,
            ]);
        }

        $sessionId = $payload['data']['data']['id'] ?? null;
        $attributes = $payload['data']['data']['attributes'] ?? [];
        $referenceNumber = $attributes['reference_number'] ?? null;

        $order = null;

        if ($referenceNumber) {
            $order = Order::where('order_number', $referenceNumber)->first();
        }

        if (!$order && $sessionId) {
            $order = Order::where(
                'paymongo_checkout_session_id',
                $sessionId
            )->first();
        }

        if (!$order) {
            return response()->json([
                'received' => true,
            ]);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'received' => true,
            ]);
        }

        $paymentId = data_get($attributes, 'payments.0.id');

        $order->update([
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paymongo_payment_id' => $paymentId,
            'paid_at' => now(),
        ]);

        $order->user?->cart?->items()->delete();

        return response()->json([
            'received' => true,
        ]);
    }
}
