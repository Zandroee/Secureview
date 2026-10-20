<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminTransactionLogFiltersExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_transaction_logs_by_created_date_and_order_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);

        $matchingOrder = $this->createOrder($customer, [
            'order_number' => 'ORD-TODAY-COMPLETED',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'total' => 1500,
            'created_at' => now()->setTime(10, 0),
        ]);

        $this->createOrder($customer, [
            'order_number' => 'ORD-TODAY-PENDING',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'created_at' => now()->setTime(11, 0),
        ]);

        $this->createOrder($customer, [
            'order_number' => 'ORD-YESTERDAY-COMPLETED',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'created_at' => now()->subDay()->setTime(10, 0),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.transactions.index', [
                'date_from' => today()->toDateString(),
                'date_to' => today()->toDateString(),
                'order_status' => 'completed',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transactions')
                ->has('transactions.data', 1)
                ->where('transactions.data.0.id', $matchingOrder->id)
                ->where('transactions.total', 1)
                ->where('summary.total', 1)
                ->where('summary.paid', 1)
                ->where('summary.paid_amount', 1500)
                ->where('filters.order_status', 'completed')
                ->where('filters.date_from', today()->toDateString())
                ->where('filters.date_to', today()->toDateString())
            );
    }

    public function test_admin_can_export_csv_using_the_same_transaction_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create([
            'role' => 'user',
            'name' => '=2+2',
        ]);

        $this->createOrder($customer, [
            'order_number' => 'ORD-CSV-MATCH',
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'paymongo_checkout_session_id' => 'cs_test_session_123',
        ]);

        $this->createOrder($customer, [
            'order_number' => 'ORD-CSV-EXCLUDED',
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.transactions.index', [
            'payment_status' => 'pending',
            'payment_method' => 'gcash',
            'export' => 'csv',
        ]));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $response->assertHeader('content-disposition');

        $csv = $response->streamedContent();

        $this->assertStringContainsString('Order Number,Payment Transaction ID,Checkout Session ID', $csv);
        $this->assertStringContainsString('ORD-CSV-MATCH', $csv);
        $this->assertStringContainsString('cs_test_session_123', $csv);
        $this->assertStringContainsString("'=2+2", $csv);
        $this->assertStringNotContainsString('ORD-CSV-EXCLUDED', $csv);
    }

    private function createOrder(User $customer, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'user_id' => $customer->id,
            'order_number' => 'ORD-TEST-' . uniqid(),
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
        ], $overrides));
    }
}
