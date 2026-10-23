<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use App\Models\ServiceRecord;
use App\Models\ServiceRecordItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostServiceRecordTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigned_technician_completes_job_with_audited_part_usage_and_service_income(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $product = Product::create([
            'name' => 'Replacement IP Camera',
            'brand' => 'Dahua',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 550,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $inquiry = $this->makeInquiry($customer, 'in_progress');
        $inquiry->technicians()->attach($technician->id, ['assigned_by' => $technician->id]);

        $this->actingAs($technician)
            ->post(route('technician.jobs.post-service-record', $inquiry), [
                'work_summary' => 'Replaced the failed camera and tested live view and recording.',
                'customer_notes' => 'Check the camera view again after cleaning the lens.',
                'labor_charge' => 1000,
                'additional_charge' => 100,
                'items' => [
                    [
                        'action' => 'used',
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => 2,
                        'unit_price' => 550,
                        'notes' => 'Replacement cameras installed',
                    ],
                    [
                        'action' => 'removed',
                        'product_id' => null,
                        'product_name' => 'Old damaged camera',
                        'quantity' => 1,
                        'unit_price' => 0,
                        'notes' => 'Returned to customer',
                    ],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'completed']);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 3]);
        $this->assertDatabaseHas('inventory_adjustments', [
            'product_id' => $product->id,
            'user_id' => $technician->id,
            'quantity_change' => -2,
        ]);
        $this->assertDatabaseHas('service_records', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technician->id,
            'total_income' => 2200,
        ]);
        $this->assertSame(2, ServiceRecordItem::query()->whereHas('serviceRecord', fn ($query) => $query->where('inquiry_id', $inquiry->id))->count());
        $this->assertDatabaseHas('service_record_items', [
            'product_name' => 'Old damaged camera',
            'action' => 'removed',
            'quantity' => 1,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'service_completed',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_service_cannot_be_started_while_its_related_order_is_unpaid(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, 'confirmed');
        $inquiry->technicians()->attach($technician->id, ['assigned_by' => $technician->id]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-PENDING-' . $customer->id,
            'subtotal' => 1000,
            'shipping_fee' => 0,
            'total' => 1000,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        PendingInquiryCheckout::create([
            'user_id' => $customer->id,
            'order_id' => $order->id,
            'payload' => ['service_type' => 'Installation'],
            'status' => 'pending_payment',
            'inquiry_id' => $inquiry->id,
        ]);

        $this->actingAs($technician)
            ->patch(route('technician.jobs.status', $inquiry), ['status' => 'in_progress'])
            ->assertRedirect()
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'confirmed']);
    }

    private function makeInquiry(User $customer, string $status): Inquiry
    {
        return Inquiry::create([
            'user_id' => $customer->id,
            'inquiry_number' => 'INQ-POST-' . strtoupper(bin2hex(random_bytes(3))),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Repair',
            'urgency' => 'normal',
            'preferred_date' => today()->addDays(2)->toDateString(),
            'preferred_time' => '08:00 AM - 11:00 AM',
            'status' => $status,
        ]);
    }
}
