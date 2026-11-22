<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_order_notifies_admins_without_notifying_technicians(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $secondAdmin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $technician = User::factory()->create([
            'role' => 'technician',
            'email_verified_at' => now(),
        ]);
        $secondTechnician = User::factory()->create([
            'role' => 'technician',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-ORDER-NOTIFY-001',
            'subtotal' => 1500,
            'shipping_fee' => 0,
            'total' => 1500,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'new_order',
            'title' => 'New order received',
            'related_type' => Order::class,
            'related_id' => $order->id,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $secondAdmin->id,
            'type' => 'new_order',
            'related_id' => $order->id,
        ]);
        $this->assertDatabaseMissing('customer_notifications', [
            'user_id' => $technician->id,
            'type' => 'new_order',
            'related_id' => $order->id,
        ]);
        $this->assertDatabaseMissing('customer_notifications', [
            'user_id' => $secondTechnician->id,
            'type' => 'new_order',
            'related_id' => $order->id,
        ]);

        $adminNotification = CustomerNotification::query()
            ->where('user_id', $admin->id)
            ->where('related_id', $order->id)
            ->firstOrFail();
        $this->assertSame(route('admin.purchases.index'), $adminNotification->action_url);
        $this->assertStringContainsString($customer->name, $adminNotification->message);
        $this->assertStringContainsString('₱1,500.00', $adminNotification->message);

        $this->assertDatabaseMissing('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'new_order',
            'related_id' => $order->id,
        ]);
        $this->assertSame(2, CustomerNotification::query()->where('related_id', $order->id)->count());
    }

    public function test_new_order_notification_service_deduplicates_per_recipient(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $technician = User::factory()->create([
            'role' => 'technician',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-ORDER-NOTIFY-002',
            'subtotal' => 500,
            'shipping_fee' => 0,
            'total' => 500,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $service = app(OrderNotificationService::class);

        $this->assertSame(0, $service->notifyNewOrderPlaced($order));
        $this->assertSame(1, CustomerNotification::query()->where('related_id', $order->id)->count());
        $this->assertSame(1, CustomerNotification::query()->where('user_id', $admin->id)->where('related_id', $order->id)->count());
        $this->assertSame(0, CustomerNotification::query()->where('user_id', $technician->id)->where('related_id', $order->id)->count());
    }
}
