<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminTransactionPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_transaction_logs_are_paginated_and_keep_payment_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);

        for ($index = 1; $index <= 13; $index++) {
            Order::create([
                'user_id' => $customer->id,
                'order_number' => sprintf('ORD-PAGE-%03d', $index),
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
        }

        $this->actingAs($admin)
            ->get(route('admin.transactions.index', [
                'payment_status' => 'pending',
                'page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transactions')
                ->has('transactions.data', 1)
                ->where('transactions.total', 13)
                ->where('transactions.current_page', 2)
                ->where('filters.payment_status', 'pending')
            );
    }
}
