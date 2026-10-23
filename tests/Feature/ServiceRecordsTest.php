<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\Product;
use App\Models\ServiceRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ServiceRecordsTest extends TestCase
{
    use RefreshDatabase;

    private function makeInquiry(User $customer, User $technician, string $number = 'INQ-TEST-SRV001', array $attributes = []): Inquiry
    {
        $inquiry = Inquiry::create(array_merge([
            'user_id' => $customer->id,
            'inquiry_number' => $number,
            'customer_name' => 'Test Customer',
            'customer_phone' => '09123456789',
            'customer_email' => 'test@example.com',
            'street_address' => 'Test Street 10',
            'city' => 'Taguig',
            'service_type' => 'Repair',
            'urgency' => 'normal',
            'preferred_date' => today()->toDateString(),
            'preferred_time' => '08:00 AM - 11:00 AM',
            'status' => 'in_progress',
        ], $attributes));

        $inquiry->technicians()->attach($technician->id, ['assigned_by' => $technician->id]);

        return $inquiry;
    }

    public function test_technician_post_service_record_deducts_used_inventory_and_keeps_income_pending_for_admin_confirmation(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);
        $product = Product::create([
            'name' => 'Replacement camera',
            'brand' => 'Dahua',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => 4,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
        $inquiry = $this->makeInquiry($customer, $technician);

        $this->actingAs($technician)
            ->post(route('technician.jobs.records.store', $inquiry), [
                'service_outcome' => 'repaired_with_replacement',
                'work_summary' => 'Replaced the faulty camera and tested the new unit.',
                'recommendations' => 'Inspect the cable conduit during the next maintenance visit.',
                'service_charge' => '1200.00',
                'payment_method' => 'cash',
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1, 'notes' => 'Used to replace the faulty camera'],
                ],
            ])
            ->assertRedirect();

        $recordId = ServiceRecord::where('inquiry_id', $inquiry->id)->value('id');

        $this->assertNotNull($recordId);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 3]);
        $this->assertDatabaseHas('service_records', [
            'id' => $recordId,
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technician->id,
            'service_charge' => 1200,
            'payment_status' => 'pending',
        ]);
        $this->assertDatabaseHas('service_record_items', [
            'service_record_id' => $recordId,
            'product_id' => $product->id,
            'quantity' => 1,
        ]);
        $this->assertDatabaseHas('inventory_adjustments', [
            'product_id' => $product->id,
            'user_id' => $technician->id,
            'quantity_change' => -1,
            'reason' => 'Used for service ' . $inquiry->inquiry_number . ' (post-service record #' . $recordId . ')',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'service_record',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_technician_cannot_complete_a_job_without_a_post_service_record(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);
        $inquiry = $this->makeInquiry($customer, $technician, 'INQ-TEST-SRV002');

        $this->actingAs($technician)
            ->patch(route('technician.jobs.status', $inquiry), ['status' => 'completed'])
            ->assertSessionHasErrors(['status']);

        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'in_progress']);
    }

    public function test_pending_installation_payment_blocks_technician_status_updates(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-TEST-PAY001',
            'subtotal' => 1000,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 1000,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => 'Test Customer',
            'customer_phone' => '09123456789',
            'customer_email' => 'test@example.com',
            'delivery_address' => 'Test Street 10, Taguig',
        ]);
        $inquiry = $this->makeInquiry($customer, $technician, 'INQ-TEST-SRV003', [
            'order_id' => $order->id,
            'payment_status' => 'pending',
            'status' => 'confirmed',
        ]);

        $this->actingAs($technician)
            ->patch(route('technician.jobs.status', $inquiry), ['status' => 'in_progress'])
            ->assertSessionHasErrors(['status']);

        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'confirmed']);
    }

    public function test_admin_can_confirm_service_income_and_it_becomes_paid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);
        $inquiry = $this->makeInquiry($customer, $technician, 'INQ-TEST-SRV004');
        $record = ServiceRecord::create([
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technician->id,
            'service_outcome' => 'completed_as_requested',
            'work_summary' => 'Installed and tested the requested device.',
            'service_charge' => 1500,
            'payment_status' => 'pending',
            'payment_method' => 'gcash',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.service-records.confirm-payment', $record), ['payment_method' => 'gcash'])
            ->assertRedirect();

        $this->assertDatabaseHas('service_records', [
            'id' => $record->id,
            'payment_status' => 'paid',
            'payment_method' => 'gcash',
        ]);
        $this->assertNotNull($record->fresh()->paid_at);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'service_payment',
            'related_id' => $record->id,
        ]);
    }

    public function test_expired_unpaid_orders_are_cancelled_and_the_customer_is_notified(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-TEST-OLD001',
            'subtotal' => 500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 500,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'customer_name' => 'Test Customer',
            'customer_phone' => '09123456789',
            'customer_email' => 'test@example.com',
            'delivery_address' => 'Test Street 10, Taguig',
        ]);
        $order->forceFill(['created_at' => now()->subDays(15), 'updated_at' => now()->subDays(15)])->save();

        Artisan::call('secureview:cancel-expired-unpaid-orders');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'cancelled',
            'payment_status' => 'pending',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'dedupe_key' => 'order-payment-expired:' . $order->id,
            'type' => 'order_cancelled',
        ]);
    }
}
