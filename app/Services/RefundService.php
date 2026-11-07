<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\PendingInquiryCheckout;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RefundService
{
    private const RESERVED_STATUSES = ['pending', 'approved', 'processing', 'completed'];

    public function availableAmount(Order $order, ?int $excludeRefundId = null): float
    {
        $reservedQuery = Refund::query()
            ->where('order_id', $order->id)
            ->whereIn('status', self::RESERVED_STATUSES);

        if ($excludeRefundId !== null) {
            $reservedQuery->where('id', '!=', $excludeRefundId);
        }

        $reserved = (float) $reservedQuery
            ->sum(DB::raw('COALESCE(amount_approved, amount_requested)'));

        return round(max(0, (float) $order->total - $reserved), 2);
    }

    public function requestCustomerRefund(Order $order, User $customer, float $amount, string $reason): Refund
    {
        return DB::transaction(function () use ($order, $customer, $amount, $reason) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (
                !in_array($lockedOrder->payment_status, ['paid', 'partially_refunded'], true) ||
                !$lockedOrder->paid_at
            ) {
                throw ValidationException::withMessages([
                    'refund' => 'Only a confirmed paid order can be refunded.',
                ]);
            }

            if ($lockedOrder->order_status === 'cancelled') {
                throw ValidationException::withMessages([
                    'refund' => 'This order was cancelled by Netmax Trading and its automatic refund is already being handled.',
                ]);
            }

            $amount = round($amount, 2);
            $available = $this->availableAmount($lockedOrder);

            if ($amount <= 0 || $amount > $available) {
                throw ValidationException::withMessages([
                    'amount' => 'The requested amount exceeds the remaining refundable balance of ₱' . number_format($available, 2) . '.',
                ]);
            }

            $pendingCheckout = PendingInquiryCheckout::query()
                ->where('order_id', $lockedOrder->id)
                ->first();

            $refund = Refund::create([
                'order_id' => $lockedOrder->id,
                'inquiry_id' => $pendingCheckout?->inquiry_id,
                'customer_id' => $customer->id,
                'requested_by_user_id' => $customer->id,
                'source' => 'customer_request',
                'amount_requested' => $amount,
                'reason_code' => 'others',
                'reason' => trim($reason),
                'status' => 'pending',
                'provider' => $this->providerFor($lockedOrder),
                'idempotency_key' => 'refund-order-' . $lockedOrder->id . '-' . Str::uuid(),
                'requested_at' => now(),
            ]);

            $this->recordEvent(
                $lockedOrder,
                $refund,
                'refund_requested',
                'Refund requested',
                'Customer requested a refund of ₱' . number_format($amount, 2) . '.',
                $customer->id
            );
            $this->notifyCustomer($refund, 'pending');

            return $refund;
        });
    }

    public function approve(
        Refund $refund,
        User $admin,
        ?float $approvedAmount = null,
        ?string $adminNotes = null
    ): Refund {
        $approved = DB::transaction(function () use ($refund, $admin, $approvedAmount, $adminNotes) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if ($lockedRefund->status !== 'pending') {
                throw ValidationException::withMessages([
                    'refund' => 'Only pending refund requests can be approved.',
                ]);
            }

            $amount = round($approvedAmount ?? (float) $lockedRefund->amount_requested, 2);
            $available = $this->availableAmount($order, $lockedRefund->id);

            if ($amount <= 0 || $amount > (float) $lockedRefund->amount_requested || $amount > $available) {
                throw ValidationException::withMessages([
                    'approved_amount' => 'The approved amount must be positive and cannot exceed the requested amount or remaining refundable balance of ₱' . number_format($available, 2) . '.',
                ]);
            }

            $provider = $this->providerFor($order);

            $lockedRefund->update([
                'amount_approved' => $amount,
                'status' => 'approved',
                'provider' => $provider,
                'processed_by_user_id' => $admin->id,
                'admin_notes' => $adminNotes ? trim($adminNotes) : $lockedRefund->admin_notes,
                'approved_at' => now(),
                'provider_error' => null,
            ]);

            $this->recordEvent(
                $order,
                $lockedRefund,
                'refund_approved',
                'Refund approved',
                'Netmax Trading approved a refund of ₱' . number_format($amount, 2) . '.',
                $admin->id
            );
            $this->notifyCustomer($lockedRefund, 'approved');

            return $lockedRefund->fresh();
        });

        return $approved->provider === 'paymongo'
            ? $this->submitApprovedRefund($approved)
            : $approved;
    }

    public function reject(Refund $refund, User $admin, string $reason): Refund
    {
        return DB::transaction(function () use ($refund, $admin, $reason) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if ($lockedRefund->status !== 'pending') {
                throw ValidationException::withMessages([
                    'refund' => 'Only pending refund requests can be rejected.',
                ]);
            }

            $lockedRefund->update([
                'status' => 'rejected',
                'processed_by_user_id' => $admin->id,
                'rejection_reason' => trim($reason),
                'approved_at' => now(),
            ]);

            $this->recordEvent(
                $order,
                $lockedRefund,
                'refund_rejected',
                'Refund request rejected',
                'Netmax Trading rejected the refund request. Reason: ' . trim($reason),
                $admin->id
            );
            $this->notifyCustomer($lockedRefund, 'rejected');

            return $lockedRefund->fresh();
        });
    }

    public function markManualCompleted(Refund $refund, User $admin, string $reference): Refund
    {
        return DB::transaction(function () use ($refund, $admin, $reference) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if (
                $lockedRefund->provider !== 'manual' ||
                !in_array($lockedRefund->status, ['approved', 'failed'], true)
            ) {
                throw ValidationException::withMessages([
                    'refund' => 'Only an approved manual refund can be marked completed. Verify that the money has actually been returned first.',
                ]);
            }

            $lockedRefund->update([
                'status' => 'completed',
                'processed_by_user_id' => $admin->id,
                'admin_notes' => trim(($lockedRefund->admin_notes ? $lockedRefund->admin_notes . "\n" : '') . 'Manual refund confirmation: ' . trim($reference)),
                'provider_status' => 'succeeded',
                'provider_error' => null,
                'completed_at' => now(),
            ]);

            $this->syncOrderPaymentStatus($order);
            $this->recordEvent(
                $order,
                $lockedRefund,
                'refund_completed',
                'Manual refund completed',
                'Netmax Trading recorded that ₱' . number_format((float) $lockedRefund->amount_approved, 2) . ' was physically returned. Reference: ' . trim($reference),
                $admin->id
            );
            $this->notifyCustomer($lockedRefund, 'completed');

            return $lockedRefund->fresh();
        });
    }

    public function retry(Refund $refund): Refund
    {
        $approved = DB::transaction(function () use ($refund) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            $retryUnknownOutcome = $lockedRefund->status === 'processing'
                && $lockedRefund->provider_refund_id === null
                && $lockedRefund->provider_error !== null;

            if (
                $lockedRefund->provider !== 'paymongo' ||
                ($lockedRefund->status !== 'failed' && !$retryUnknownOutcome)
            ) {
                throw ValidationException::withMessages([
                    'refund' => 'Only a failed refund or a PayMongo attempt with an unknown outcome and no refund ID can be retried.',
                ]);
            }

            if (
                $retryUnknownOutcome &&
                (!$lockedRefund->submitted_at || $lockedRefund->submitted_at->lte(now()->subHours(23)))
            ) {
                throw ValidationException::withMessages([
                    'refund' => 'The safe PayMongo idempotency retry window has expired. Check the PayMongo Dashboard and reconcile the original refund before submitting another payment return.',
                ]);
            }

            $available = $this->availableAmount($order, $lockedRefund->id);
            if ((float) $lockedRefund->amount_approved > $available) {
                throw ValidationException::withMessages([
                    'refund' => 'The order no longer has enough refundable balance for this retry. Reconcile the other refunds first.',
                ]);
            }

            $updates = [
                'status' => 'approved',
                'provider_error' => null,
                'provider_refund_id' => null,
                // A definite failed attempt gets a new key and a new time window.
                // An ambiguous attempt keeps both its original key and timestamp.
                'submitted_at' => $retryUnknownOutcome ? $lockedRefund->submitted_at : null,
            ];

            // Reuse the same idempotency key after an ambiguous timeout so
            // PayMongo can return the original request instead of creating a
            // second refund. A definite failure gets a new attempt key.
            if (!$retryUnknownOutcome) {
                $updates['idempotency_key'] = 'refund-' . $lockedRefund->id . '-retry-' . Str::uuid();
            }

            $lockedRefund->update($updates);

            return $lockedRefund->fresh();
        });

        return $this->submitApprovedRefund($approved);
    }

    public function reconcileUnknownPayMongoRefund(
        Refund $refund,
        User $admin,
        string $providerRefundId
    ): Refund {
        $refundSnapshot = Refund::query()->with('order')->findOrFail($refund->id);

        if (
            $refundSnapshot->provider !== 'paymongo' ||
            $refundSnapshot->status !== 'processing' ||
            $refundSnapshot->provider_refund_id !== null ||
            !$refundSnapshot->provider_error
        ) {
            throw ValidationException::withMessages([
                'refund' => 'Only an unresolved PayMongo refund with no saved provider refund ID can be reconciled.',
            ]);
        }

        $secretKey = config('services.paymongo.secret_key');
        if (!$secretKey) {
            throw ValidationException::withMessages([
                'refund' => 'PayMongo is not configured. Verify the provider refund manually before taking any action.',
            ]);
        }

        $baseUrl = rtrim((string) config('services.paymongo.base_url'), '/');

        try {
            $response = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->timeout(20)
                ->get($baseUrl . '/refunds/' . rawurlencode($providerRefundId));
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'provider_refund_id' => 'PayMongo could not be reached. No local refund record was changed; try reconciliation again.',
            ]);
        }

        if (!$response->successful()) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'PayMongo could not retrieve that refund ID. Confirm the ID and that it belongs to the currently configured PayMongo account and mode.',
            ]);
        }

        $body = $response->json();
        $resource = is_array($body) ? ($body['data'] ?? []) : [];
        $attributes = is_array($resource) ? ($resource['attributes'] ?? []) : [];

        if (
            !is_array($resource) ||
            ($resource['id'] ?? null) !== $providerRefundId ||
            !is_array($attributes)
        ) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'PayMongo returned an unexpected refund resource. No local record was changed.',
            ]);
        }

        $order = $refundSnapshot->order;
        $providerPaymentId = $attributes['payment_id'] ?? null;
        $providerAmount = isset($attributes['amount']) ? (int) $attributes['amount'] : null;
        $expectedAmount = (int) round((float) $refundSnapshot->amount_approved * 100);

        if (!$order || !$order->paymongo_payment_id || $providerPaymentId !== $order->paymongo_payment_id) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'The PayMongo refund belongs to a different payment. No local record was changed.',
            ]);
        }

        if ($providerAmount !== $expectedAmount) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'The PayMongo refund amount does not match the approved SecureView refund amount. No local record was changed.',
            ]);
        }

        if (
            array_key_exists('livemode', $attributes) &&
            (bool) $attributes['livemode'] !== str_starts_with($secretKey, 'sk_live_')
        ) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'The PayMongo refund belongs to a different payment mode (test/live). No local record was changed.',
            ]);
        }

        $providerStatus = (string) ($attributes['status'] ?? '');
        if (!in_array($providerStatus, ['pending', 'processing', 'succeeded', 'failed'], true)) {
            throw ValidationException::withMessages([
                'provider_refund_id' => 'PayMongo returned an unrecognized refund status. No local record was changed.',
            ]);
        }

        return DB::transaction(function () use ($refund, $admin, $providerRefundId, $attributes, $body, $providerStatus) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if (
                $lockedRefund->provider !== 'paymongo' ||
                $lockedRefund->status !== 'processing' ||
                $lockedRefund->provider_refund_id !== null
            ) {
                throw ValidationException::withMessages([
                    'refund' => 'This refund changed while reconciliation was in progress. Refresh the page and review its current status.',
                ]);
            }

            $duplicate = Refund::query()
                ->where('provider_refund_id', $providerRefundId)
                ->where('id', '!=', $lockedRefund->id)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'provider_refund_id' => 'That PayMongo refund ID is already linked to another SecureView refund.',
                ]);
            }

            $newStatus = $this->mapProviderStatus($providerStatus);
            $lockedRefund->update([
                'provider_refund_id' => $providerRefundId,
                'provider_status' => $providerStatus,
                'provider_response' => is_array($body) ? $body : null,
                'provider_error' => null,
                'status' => $newStatus,
                'processed_by_user_id' => $admin->id,
                'admin_notes' => trim(
                    ($lockedRefund->admin_notes ? $lockedRefund->admin_notes . "\n" : '') .
                    'PayMongo refund reconciled by admin. Provider refund ID: ' . $providerRefundId
                ),
                'completed_at' => $newStatus === 'completed'
                    ? ($lockedRefund->completed_at ?? now())
                    : null,
            ]);

            if ($newStatus === 'completed') {
                $this->syncOrderPaymentStatus($lockedOrder);
            }

            $freshRefund = $lockedRefund->fresh();
            $this->recordEvent(
                $lockedOrder,
                $freshRefund,
                'refund_reconciled',
                'PayMongo refund reconciled',
                'Admin verified PayMongo refund ' . $providerRefundId . ' against the original payment and approved amount. Provider status: ' . $providerStatus . '.',
                $admin->id
            );
            $this->notifyCustomer($freshRefund, $newStatus);

            return $freshRefund;
        });
    }

    public function convertFailedPayMongoToManual(Refund $refund, User $admin, string $notes): Refund
    {
        return DB::transaction(function () use ($refund, $admin, $notes) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if ($lockedRefund->provider !== 'paymongo' || $lockedRefund->status !== 'failed') {
                throw ValidationException::withMessages([
                    'refund' => 'Only a failed PayMongo refund can be moved to manual processing. Verify its provider status first.',
                ]);
            }

            $lockedRefund->update([
                'provider' => 'manual',
                'status' => 'approved',
                'provider_status' => null,
                'provider_error' => null,
                'processed_by_user_id' => $admin->id,
                'admin_notes' => trim(($lockedRefund->admin_notes ? $lockedRefund->admin_notes . "\n" : '') . 'Moved to manual refund processing: ' . trim($notes)),
            ]);

            $this->recordEvent(
                $order,
                $lockedRefund,
                'refund_manual_processing',
                'Refund moved to manual processing',
                'The failed PayMongo refund was moved to manual processing. Netmax Trading must return the money and record the actual reference.',
                $admin->id
            );
            $this->notifyCustomer($lockedRefund, 'approved');

            return $lockedRefund->fresh();
        });
    }

    public function submitApprovedRefund(Refund $refund): Refund
    {
        $submission = DB::transaction(function () use ($refund) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if ($lockedRefund->provider !== 'paymongo' || $lockedRefund->status !== 'approved') {
                return null;
            }

            if (!$order->paymongo_payment_id || !config('services.paymongo.secret_key')) {
                $lockedRefund->update([
                    'provider' => 'manual',
                    'status' => 'approved',
                    'provider_error' => 'PayMongo payment details are unavailable. Process the return manually and record the actual transfer.',
                ]);

                return null;
            }

            $lockedRefund->update([
                'status' => 'processing',
                'submitted_at' => $lockedRefund->submitted_at ?? now(),
                'provider_error' => null,
            ]);

            return [
                'refund' => $lockedRefund->fresh(),
                'order' => $order,
            ];
        });

        if (!$submission) {
            return $refund->fresh();
        }

        /** @var Refund $processingRefund */
        $processingRefund = $submission['refund'];
        /** @var Order $order */
        $order = $submission['order'];

        try {
            $response = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
                ->acceptJson()
                ->asJson()
                ->timeout(25)
                ->withHeaders([
                    'Idempotency-Key' => $processingRefund->idempotency_key,
                ])
                ->post(rtrim(config('services.paymongo.base_url'), '/') . '/v1/refunds', [
                    'data' => [
                        'attributes' => [
                            'amount' => (int) round((float) $processingRefund->amount_approved * 100),
                            'payment_id' => $order->paymongo_payment_id,
                            'reason' => $processingRefund->reason_code,
                            'notes' => mb_substr(
                                'Netmax Trading refund for order ' . $order->order_number . ': ' . $processingRefund->reason,
                                0,
                                255
                            ),
                        ],
                    ],
                ]);

            $body = $response->json();
            $resource = is_array($body) ? ($body['data'] ?? []) : [];
            $attributes = is_array($resource) ? ($resource['attributes'] ?? []) : [];
            $providerStatus = is_array($attributes) ? ($attributes['status'] ?? null) : null;

            $providerError = $response->successful()
                ? null
                : mb_substr((string) ($response->json('errors.0.detail') ?? $response->body()), 0, 4000);

            // 5xx, rate-limit, and idempotency-in-progress responses can have an
            // ambiguous outcome. Keep the same key and reconcile instead of
            // treating the request as a definite failure.
            $ambiguousResponse = $response->serverError()
                || in_array($response->status(), [409, 429], true);

            $nextStatus = $response->successful()
                ? $this->mapProviderStatus($providerStatus)
                : ($ambiguousResponse ? 'processing' : 'failed');

            if ($response->successful() && empty($resource['id'])) {
                $providerError = 'PayMongo accepted the refund request but did not return a refund ID. Reconciliation is required; do not submit a new refund.';
            }

            return $this->persistSubmissionResult(
                $processingRefund,
                is_array($body) ? $body : [],
                $nextStatus,
                $providerError
            );
        } catch (\\Throwable $exception) {
            report($exception);

            return $this->persistSubmissionResult(
                $processingRefund,
                [],
                'processing',
                mb_substr($exception->getMessage(), 0, 4000)
            );
        }
    }

    private function persistSubmissionResult(
        Refund $submittedRefund,
        array $providerResponse,
        string $nextStatus,
        ?string $providerError
    ): Refund {
        $refundOrderId = Refund::query()->whereKey($submittedRefund->id)->value('order_id');

        return DB::transaction(function () use ($submittedRefund, $providerResponse, $nextStatus, $providerError, $refundOrderId) {
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $refund = Refund::query()->lockForUpdate()->findOrFail($submittedRefund->id);

            // A retry may have started while an earlier HTTP request was still
            // returning. Never let an old attempt overwrite the newer attempt.
            if ($refund->idempotency_key !== $submittedRefund->idempotency_key) {
                return $refund;
            }

            // Terminal states are authoritative. A late API response must not
            // downgrade a completed/failed result from a webhook or prior response.
            if (in_array($refund->status, ['completed', 'failed'], true)) {
                return $refund;
            }

            $resource = $providerResponse['data'] ?? [];
            $attributes = is_array($resource) ? ($resource['attributes'] ?? []) : [];
            $resourceId = is_array($resource) ? ($resource['id'] ?? null) : null;
            $providerStatus = is_array($attributes) ? ($attributes['status'] ?? null) : null;
            $oldStatus = $refund->status;

            if ($resourceId) {
                $responsePaymentId = $attributes['payment_id'] ?? null;
                $responseAmount = isset($attributes['amount']) ? (int) $attributes['amount'] : null;
                $expectedAmount = (int) round((float) $refund->amount_approved * 100);

                if ($responsePaymentId !== $order->paymongo_payment_id || $responseAmount !== $expectedAmount) {
                    $resourceId = null;
                    $providerStatus = null;
                    $nextStatus = 'processing';
                    $providerError = 'PayMongo returned a refund resource that did not match the original payment and approved amount. Reconciliation is required; no completed status was accepted.';
                }
            }

            $refund->update([
                'provider_refund_id' => $resourceId ?: $refund->provider_refund_id,
                'provider_status' => $providerStatus,
                'provider_response' => $providerResponse ?: null,
                'provider_error' => $providerError,
                'status' => $nextStatus,
                'completed_at' => $nextStatus === 'completed'
                    ? ($refund->completed_at ?? now())
                    : null,
            ]);

            if ($nextStatus === 'completed') {
                $this->syncOrderPaymentStatus($order);
            }

            $freshRefund = $refund->fresh();

            $eventKey = match ($nextStatus) {
                'completed' => 'refund_completed',
                'failed' => 'refund_failed',
                default => 'refund_processing',
            };

            $title = match ($nextStatus) {
                'completed' => 'Refund sent to payment partner',
                'failed' => 'Refund processing failed',
                default => 'Refund outcome requires verification',
            };

            $description = match ($nextStatus) {
                'completed' => 'PayMongo confirmed the refund of ₱' . number_format((float) $freshRefund->amount_approved, 2) . ' as succeeded.',
                'failed' => 'PayMongo rejected the refund request. Review the provider response before retrying.',
                default => $providerError
                    ? 'The refund request was sent, but its outcome still needs verification. The amount remains reserved to prevent a duplicate submission.'
                    : 'The refund was submitted to PayMongo and is awaiting its final status.',
            };

            if ($oldStatus !== $nextStatus || $resourceId || $providerError) {
                $this->recordEvent($order, $freshRefund, $eventKey, $title, $description, null);
                $this->notifyCustomer($freshRefund, $nextStatus);
            }

            return $freshRefund;
        });
    }

    public function hasProviderRefundId(string $providerRefundId): bool
    {
        return Refund::query()
            ->where('provider_refund_id', $providerRefundId)
            ->exists();
    }

    public function hasUnlinkedSubmittedRefundForPayment(string $paymentId): bool
    {
        return Refund::query()
            ->where('provider', 'paymongo')
            ->where('status', 'processing')
            ->whereNull('provider_refund_id')
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '>', now()->subHours(23))
            ->whereHas('order', fn ($query) => $query->where('paymongo_payment_id', $paymentId))
            ->exists();
    }

    public function syncProviderStatus(string $providerRefundId, array $attributes): ?Refund
    {
        $refund = Refund::query()->where('provider_refund_id', $providerRefundId)->first();

        if (!$refund) {
            return null;
        }

        return DB::transaction(function () use ($refund, $attributes) {
            $refundOrderId = Refund::query()->whereKey($refund->id)->value('order_id');
            $order = Order::query()->lockForUpdate()->findOrFail($refundOrderId);
            $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);

            if ($lockedRefund->provider !== 'paymongo') {
                return null;
            }

            $providerStatus = (string) ($attributes['status'] ?? '');

            $providerPaymentId = $attributes['payment_id'] ?? null;
            $providerAmount = isset($attributes['amount']) ? (int) $attributes['amount'] : null;
            $expectedAmount = (int) round((float) $lockedRefund->amount_approved * 100);

            if (
                $providerPaymentId !== $order->paymongo_payment_id ||
                $providerAmount !== $expectedAmount
            ) {
                report(new \RuntimeException('PayMongo refund webhook payment ID or amount does not match the linked SecureView refund.'));
                return null;
            }

            if ($providerStatus === '') {
                return $lockedRefund;
            }

            $newStatus = $this->mapProviderStatus($providerStatus);
            $oldStatus = $lockedRefund->status;

            // Provider webhooks may arrive out of order. A succeeded refund
            // must never be downgraded by a delayed processing/failed event.
            if ($oldStatus === 'completed' && $newStatus !== 'completed') {
                return $lockedRefund;
            }

            if ($oldStatus === 'failed' && $newStatus === 'processing') {
                return $lockedRefund;
            }

            $lockedRefund->update([
                'provider_status' => $providerStatus,
                'provider_response' => $attributes,
                'status' => $newStatus,
                'completed_at' => $newStatus === 'completed'
                    ? ($lockedRefund->completed_at ?? now())
                    : null,
                'provider_error' => $newStatus === 'failed'
                    ? (string) ($attributes['failure_message'] ?? 'PayMongo reported that this refund failed.')
                    : null,
            ]);

            if ($oldStatus !== $newStatus) {
                $this->syncOrderPaymentStatus($order);
                $this->recordEvent(
                    $order,
                    $lockedRefund,
                    'refund_' . $newStatus,
                    $newStatus === 'completed' ? 'Refund completed' : 'Refund status updated',
                    'PayMongo updated this refund to ' . $newStatus . '.',
                    null
                );
                $this->notifyCustomer($lockedRefund, $newStatus);
            }

            return $lockedRefund->fresh();
        });
    }

    public function cancelPaidOrderForBusiness(Order $order, string $reason, ?int $actorId, InventoryService $inventory): ?Refund
    {
        $refund = DB::transaction(function () use ($order, $reason, $actorId, $inventory) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $existing = Refund::query()
                ->where('idempotency_key', 'business-order-cancellation-' . $lockedOrder->id)
                ->first();

            if ($existing) {
                return $existing;
            }

            if (
                !in_array($lockedOrder->payment_status, ['paid', 'partially_refunded'], true) ||
                !$lockedOrder->paid_at
            ) {
                throw ValidationException::withMessages([
                    'order' => 'Only a confirmed paid order can be cancelled with an automatic refund.',
                ]);
            }

            if ($lockedOrder->order_status !== 'processing') {
                throw ValidationException::withMessages([
                    'order' => 'Automatic paid-order cancellation is limited to orders that have not been delivered. Delivered orders must go through return inspection and refund review.',
                ]);
            }

            $this->cancelUnsubmittedRequests($lockedOrder, $actorId);

            $beforePayment = $lockedOrder->payment_status;
            $beforeOrder = $lockedOrder->order_status;
            $lockedOrder->update([
                'order_status' => 'cancelled',
                'cancellation_reason' => trim($reason),
            ]);

            $pendingCheckout = PendingInquiryCheckout::query()
                ->with('inquiry')
                ->where('order_id', $lockedOrder->id)
                ->first();

            if ($pendingCheckout?->inquiry && $pendingCheckout->inquiry->status !== 'completed') {
                $pendingCheckout->inquiry->update(['status' => 'cancelled']);
            }
            if ($pendingCheckout) {
                $pendingCheckout->update(['status' => 'cancelled']);
            }

            // A full paid-order cancellation returns all sold catalog stock.
            // Service-only cancellations do not restore the product portion.
            if ($lockedOrder->stock_deducted_at) {
                $inventory->restoreForCancelledOrder($lockedOrder->fresh());
            }

            $amount = $this->availableAmount($lockedOrder);

            if ($amount <= 0) {
                OrderEvent::create([
                    'order_id' => $lockedOrder->id,
                    'actor_user_id' => $actorId,
                    'event_key' => 'order_cancelled_no_refund_balance',
                    'title' => 'Paid order cancelled',
                    'description' => 'Order cancelled by Netmax Trading. No refundable balance remained.',
                    'payment_status_before' => $beforePayment,
                    'payment_status_after' => $lockedOrder->payment_status,
                    'order_status_before' => $beforeOrder,
                    'order_status_after' => 'cancelled',
                ]);

                return null;
            }

            $refund = Refund::create([
                'order_id' => $lockedOrder->id,
                'inquiry_id' => $pendingCheckout?->inquiry_id,
                'customer_id' => $lockedOrder->user_id,
                'requested_by_user_id' => $actorId,
                'processed_by_user_id' => $actorId,
                'source' => 'business_cancellation',
                'amount_requested' => $amount,
                'amount_approved' => $amount,
                'reason_code' => 'others',
                'reason' => trim($reason),
                'admin_notes' => 'Automatically approved because Netmax Trading cancelled the paid order.',
                'status' => 'approved',
                'provider' => $this->providerFor($lockedOrder),
                'idempotency_key' => 'business-order-cancellation-' . $lockedOrder->id,
                'requested_at' => now(),
                'approved_at' => now(),
            ]);

            $this->recordEvent(
                $lockedOrder,
                $refund,
                'business_refund_created',
                'Automatic refund created',
                'Netmax Trading cancelled the paid order and initiated a refund of ₱' . number_format($amount, 2) . '.',
                $actorId
            );
            $this->notifyCustomer($refund, 'approved');

            return $refund;
        });

        return $refund && $refund->provider === 'paymongo' && $refund->status === 'approved'
            ? $this->submitApprovedRefund($refund)
            : $refund;
    }

    public function refundCancelledService(Inquiry $inquiry, ?int $actorId = null): ?Refund
    {
        $pending = PendingInquiryCheckout::query()
            ->where('inquiry_id', $inquiry->id)
            ->first();

        if (!$pending) {
            return null;
        }

        $refund = DB::transaction(function () use ($pending, $inquiry, $actorId) {
            $order = Order::query()->lockForUpdate()->findOrFail($pending->order_id);
            $idempotencyKey = 'business-service-cancellation-' . $inquiry->id;
            $existing = Refund::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing) {
                return $existing;
            }

            if (
                !in_array($order->payment_status, ['paid', 'partially_refunded'], true) ||
                !$order->paid_at
            ) {
                return null;
            }

            $serviceFee = round((float) $order->installation_fee + (float) $order->service_priority_fee, 2);
            $hasCatalogItems = $order->items()->exists();

            if ($serviceFee <= 0) {
                $pending->update(['status' => 'cancelled']);

                if (!$hasCatalogItems) {
                    $order->update([
                        'order_status' => 'cancelled',
                        'cancellation_reason' => 'Related service cancelled by Netmax Trading.',
                    ]);
                }

                return null;
            }

            $pending->update(['status' => 'cancelled']);

            // Keep unrelated customer refund requests active. The service-fee
            // refund is limited to the balance that remains after those
            // requests have reserved their amounts.

            // Priority-only bookings create a fee-only order. Once their
            // service is cancelled, that entire order is cancelled and refunded.
            if (!$hasCatalogItems) {
                $order->update([
                    'order_status' => 'cancelled',
                    'cancellation_reason' => 'Related service cancelled by Netmax Trading.',
                ]);
            }
            $amount = min($serviceFee, $this->availableAmount($order));

            if ($amount <= 0) {
                return null;
            }

            $refund = Refund::create([
                'order_id' => $order->id,
                'inquiry_id' => $inquiry->id,
                'customer_id' => $order->user_id,
                'requested_by_user_id' => $actorId,
                'processed_by_user_id' => $actorId,
                'source' => 'business_cancellation',
                'amount_requested' => $amount,
                'amount_approved' => $amount,
                'reason_code' => 'others',
                'reason' => 'Netmax Trading cancelled the service.',
                'admin_notes' => $hasCatalogItems
                    ? 'Automatically approved for installation and priority fees only. The product portion of the order remains unchanged.'
                    : 'Automatically approved because Netmax Trading cancelled the fee-only service booking.',
                'status' => 'approved',
                'provider' => $this->providerFor($order),
                'idempotency_key' => $idempotencyKey,
                'requested_at' => now(),
                'approved_at' => now(),
            ]);

            $this->recordEvent(
                $order,
                $refund,
                'service_refund_created',
                'Service fee refund created',
                'Netmax Trading cancelled the service and initiated an automatic refund of ₱' . number_format($amount, 2) . ($hasCatalogItems ? '. The product portion of the order remains unchanged.' : ' for the fee-only service booking.'),
                $actorId
            );
            $this->notifyCustomer($refund, 'approved');

            return $refund;
        });

        return $refund && $refund->provider === 'paymongo' && $refund->status === 'approved'
            ? $this->submitApprovedRefund($refund)
            : $refund;
    }

    private function cancelUnsubmittedRequests(Order $order, ?int $actorId): void
    {
        $requests = Refund::query()
            ->where('order_id', $order->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('submitted_at')
            ->get();

        foreach ($requests as $request) {
            $request->update([
                'status' => 'cancelled',
                'processed_by_user_id' => $actorId,
                'admin_notes' => trim(($request->admin_notes ? $request->admin_notes . "\n" : '') . 'Superseded by an automatic business-initiated cancellation refund.'),
            ]);
            $this->notifyCustomer($request, 'cancelled');
        }
    }

    private function providerFor(Order $order): string
    {
        if ($order->payment_method === 'cash') {
            return 'manual';
        }

        return $order->paymongo_payment_id && config('services.paymongo.secret_key')
            ? 'paymongo'
            : 'manual';
    }

    private function mapProviderStatus(?string $status): string
    {
        return match ($status) {
            'succeeded' => 'completed',
            'failed' => 'failed',
            'pending', 'processing' => 'processing',
            default => 'processing',
        };
    }

    private function syncOrderPaymentStatus(Order $order): void
    {
        $completed = (float) Refund::query()
            ->where('order_id', $order->id)
            ->where('status', 'completed')
            ->sum('amount_approved');

        $total = (float) $order->total;
        $newStatus = $completed >= $total - 0.009
            ? 'refunded'
            : ($completed > 0 ? 'partially_refunded' : 'paid');

        if ($order->payment_status !== $newStatus) {
            $order->update(['payment_status' => $newStatus]);
        }
    }

    private function recordEvent(
        Order $order,
        Refund $refund,
        string $eventKey,
        string $title,
        string $description,
        ?int $actorId
    ): void {
        $order->refresh();

        OrderEvent::create([
            'order_id' => $order->id,
            'actor_user_id' => $actorId,
            'event_key' => $eventKey,
            'title' => $title,
            'description' => $description,
            'payment_status_before' => $order->payment_status,
            'payment_status_after' => $order->payment_status,
            'order_status_before' => $order->order_status,
            'order_status_after' => $order->order_status,
            'metadata' => [
                'refund_id' => $refund->id,
                'requested_amount' => (float) $refund->amount_requested,
                'approved_amount' => $refund->amount_approved === null ? null : (float) $refund->amount_approved,
                'refund_status' => $refund->status,
                'source' => $refund->source,
            ],
        ]);
    }

    private function notifyCustomer(Refund $refund, string $status): void
    {
        $labels = [
            'pending' => ['Refund request received', 'Your refund request is waiting for Netmax Trading review.'],
            'approved' => ['Refund approved', 'Your refund was approved. The return is awaiting processing.'],
            'processing' => ['Refund processing', 'Your refund has been submitted or is being processed by the payment provider.'],
            'completed' => ['Refund completed', 'Your refund has been sent to the payment partner or recorded as physically returned.'],
            'rejected' => ['Refund request rejected', 'Your refund request was not approved. Review the reason in your order details.'],
            'failed' => ['Refund processing failed', 'Your refund could not be completed yet. Netmax Trading has been notified.'],
            'cancelled' => ['Refund request updated', 'Your earlier refund request was superseded by a business-initiated cancellation refund.'],
        ];
        [$title, $message] = $labels[$status] ?? ['Refund status updated', 'Your refund status has been updated.'];

        CustomerNotification::firstOrCreate(
            ['dedupe_key' => 'refund:' . $refund->id . ':' . $status],
            [
                'user_id' => $refund->customer_id,
                'type' => 'refund_update',
                'title' => $title,
                'message' => $message . ' Order: ' . $refund->order?->order_number . '.',
                'action_url' => route('purchases.show', $refund->order_id),
                'related_type' => Order::class,
                'related_id' => $refund->order_id,
            ]
        );
    }
}
