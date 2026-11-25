<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentReceiptTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(User $customer, string $paymentStatus = 'paid'): Order
    {
        return Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-RECEIPT-' . uniqid(),
            'subtotal' => 650,
            'shipping_fee' => 0,
            'total' => 650,
            'payment_method' => 'gcash',
            'payment_status' => $paymentStatus,
            'paid_at' => $paymentStatus === 'paid' ? now() : null,
            'order_status' => $paymentStatus === 'paid' ? 'processing' : 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'customer_phone' => '09171234567',
            'delivery_address' => 'Taguig, Metro Manila',
        ]);
    }

    public function test_customer_can_upload_receipt_to_paid_paymongo_order_without_changing_payment_status(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $stranger = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $order = $this->makeOrder($customer);

        $this->actingAs($customer)
            ->post(route('purchases.receipt.store', $order), [
                'receipt' => UploadedFile::fake()->image('gcash-receipt.png'),
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNotNull($order->fresh()->payment_receipt_uploaded_at);
        $this->assertNotEmpty($order->fresh()->payment_receipt_path);
        Storage::disk('local')->assertExists($order->fresh()->payment_receipt_path);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'payment_receipt_uploaded',
            'payment_status_after' => 'paid',
        ]);

        $this->actingAs($admin)->get(route('purchases.receipt.show', $order))->assertOk();
        $this->actingAs($customer)->get(route('purchases.receipt.show', $order))->assertOk();
        $this->actingAs($stranger)->get(route('purchases.receipt.show', $order))->assertNotFound();
    }

    public function test_receipts_do_not_prove_payment_or_allow_customer_to_submit_for_an_unpaid_order(): void
    {
        Storage::fake('local');
        $customer = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $order = $this->makeOrder($customer, 'pending');

        $this->actingAs($customer)
            ->post(route('purchases.receipt.store', $order), [
                'receipt' => UploadedFile::fake()->image('unpaid.png'),
            ])
            ->assertSessionHasErrors('receipt');

        $this->assertSame('pending', $order->fresh()->payment_status);
        $this->assertNull($order->fresh()->payment_receipt_path);
    }
}
