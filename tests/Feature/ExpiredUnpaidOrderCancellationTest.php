<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExpiredUnpaidOrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_expiry_cancels_only_unpaid_orders_past_the_configured_deadline(): void
    {
        config(['services.secureview.unpaid_order_expiry_hours' => 48]);
        $customer = User::factory()->create(['role' => 'user']);

        $expired = $this->makeOrder($customer, 'SV-EXPIRED-' . $customer->id, 'pending', 'pending');
        DB::table('orders')->where('id', $expired->id)->update([
            'created_at' => now()->subHours(49),
            'updated_at' => now()->subHours(49),
        ]);

        $notExpired = $this->makeOrder($customer, 'SV-NEW-' . $customer->id, 'pending', 'awaiting_payment');
        $paid = $this->makeOrder($customer, 'SV-PAID-' . $customer->id, 'paid', 'processing');
        DB::table('orders')->where('id', $paid->id)->update(['paid_at' => now()]);

        Artisan::call('secureview:cancel-expired-unpaid-orders');

        $this->assertDatabaseHas('orders', [
            'id' => $expired->id,
            'order_status' => 'cancelled',
            'cancellation_reason' => 'Automatically cancelled after 48 hours without confirmed payment.',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'order_cancelled',
            'related_id' => $expired->id,
        ]);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $expired->id,
            'event_key' => 'unpaid_order_auto_cancelled',
        ]);
        $this->assertDatabaseHas('orders', ['id' => $notExpired->id, 'order_status' => 'awaiting_payment']);
        $this->assertDatabaseHas('orders', ['id' => $paid->id, 'order_status' => 'processing', 'payment_status' => 'paid']);
    }

    private function makeOrder(User $customer, string $number, string $paymentStatus, string $orderStatus): Order
    {
        return Order::create([
            'user_id' => $customer->id,
            'order_number' => $number,
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'cash',
            'payment_status' => $paymentStatus,
            'order_status' => $orderStatus,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
    }
}
