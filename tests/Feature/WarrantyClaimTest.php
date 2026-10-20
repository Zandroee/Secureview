<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\WarrantyClaim;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WarrantyClaimTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_view_eligible_purchase_and_submit_a_warranty_claim(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $item = $this->createPaidOrderItem($customer, '1 year', now()->subMonths(2));

        $this->actingAs($customer)
            ->get(route('warranty-claims.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('warranty_claims')
                ->has('eligibleItems', 1)
                ->where('eligibleItems.0.id', $item->id)
                ->where('eligibleItems.0.warranty_period', '1 year')
                ->has('claims.data', 0));

        $this->actingAs($customer)
            ->post(route('warranty-claims.store'), [
                'order_item_id' => $item->id,
                'issue_description' => 'The camera loses its signal several times each day.',
            ])
            ->assertRedirect(route('warranty-claims.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('warranty_claims', [
            'user_id' => $customer->id,
            'order_item_id' => $item->id,
            'status' => 'submitted',
            'issue_description' => 'The camera loses its signal several times each day.',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'warranty_claim',
        ]);
    }

    public function test_customer_cannot_submit_a_warranty_claim_for_an_expired_warranty(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $item = $this->createPaidOrderItem($customer, '1 year', now()->subYears(2));

        $this->actingAs($customer)
            ->post(route('warranty-claims.store'), [
                'order_item_id' => $item->id,
                'issue_description' => 'The camera no longer powers on after installation.',
            ])
            ->assertSessionHasErrors('order_item_id');

        $this->assertDatabaseCount('warranty_claims', 0);
    }

    public function test_customer_cannot_claim_an_order_item_owned_by_another_customer(): void
    {
        $owner = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $otherCustomer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $item = $this->createPaidOrderItem($owner, '1 year', now()->subMonths(1));

        $this->actingAs($otherCustomer)
            ->post(route('warranty-claims.store'), [
                'order_item_id' => $item->id,
                'issue_description' => 'I am trying to claim an item from another account.',
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('warranty_claims', 0);
    }

    public function test_admin_can_update_claim_status_and_customer_receives_a_notification(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $item = $this->createPaidOrderItem($customer, '1 year', now()->subMonths(1));

        $claim = WarrantyClaim::create([
            'user_id' => $customer->id,
            'order_id' => $item->order_id,
            'order_item_id' => $item->id,
            'claim_number' => 'WCL-TEST-000001',
            'issue_description' => 'The camera has stopped recording.',
            'status' => 'submitted',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.warranty.update', $claim), [
                'status' => 'under_review',
                'admin_notes' => 'We are checking the reported issue.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('warranty_claims', [
            'id' => $claim->id,
            'status' => 'under_review',
            'admin_notes' => 'We are checking the reported issue.',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'warranty_claim_update',
            'related_id' => $claim->id,
        ]);
    }

    public function test_warranty_page_shows_only_the_signed_in_customers_claims(): void
    {
        $owner = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $otherCustomer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $item = $this->createPaidOrderItem($owner, '1 year', now()->subMonths(1));

        WarrantyClaim::create([
            'user_id' => $owner->id,
            'order_id' => $item->order_id,
            'order_item_id' => $item->id,
            'claim_number' => 'WCL-TEST-000002',
            'issue_description' => 'The camera has stopped recording.',
            'status' => 'submitted',
        ]);

        $this->actingAs($otherCustomer)
            ->get(route('warranty-claims.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('warranty_claims')
                ->has('claims.data', 0)
                ->has('eligibleItems', 0));
    }

    private function createPaidOrderItem(User $customer, string $warranty, $paidAt): OrderItem
    {
        $product = Product::create([
            'name' => 'Warranty Test Camera',
            'category' => 'CCTV',
            'warranty' => $warranty,
            'price' => 2500,
            'stock_quantity' => 3,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-WARRANTY-' . fake()->unique()->numerify('######'),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'total' => 2500,
            'payment_method' => 'gcash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
            'paid_at' => $paidAt,
        ]);

        return $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'warranty_period' => $warranty,
            'price' => 2500,
            'quantity' => 1,
            'subtotal' => 2500,
        ]);
    }
}
