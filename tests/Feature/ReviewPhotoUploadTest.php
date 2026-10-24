<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReviewPhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_review_link_from_a_paid_order_opens_the_correct_order_item_review_form(): void
    {
        $customer = $this->customer();
        $product = $this->product();
        [$order, $orderItem] = $this->paidOrderWithItem($customer, $product);

        $this->actingAs($customer)
            ->get(route('purchases.items.review', [$order, $orderItem]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('review_create')
                ->where('order.order_number', $order->order_number)
                ->where('orderItem.id', $orderItem->id)
                ->where('item.id', $product->id)
                ->where('itemType', 'product'));

        $otherCustomer = $this->customer();

        $this->actingAs($otherCustomer)
            ->get(route('purchases.items.review', [$order, $orderItem]))
            ->assertNotFound();
    }

    public function test_customer_can_submit_a_review_with_a_photo_and_the_photo_is_visible_on_the_product_page(): void
    {
        Storage::fake('public');
        $customer = $this->customer();
        $product = $this->product();
        [$order, $orderItem] = $this->paidOrderWithItem($customer, $product);
        $photo = UploadedFile::fake()->image('camera-review.jpg', 900, 700);

        $this->actingAs($customer)
            ->from(route('purchases.items.review', [$order, $orderItem]))
            ->post(route('reviews.store'), [
                'item_type' => 'product',
                'item_id' => $product->id,
                'rating' => 5,
                'comment' => 'The camera image is clear and installation was straightforward.',
                'images' => [$photo],
                'remove_images' => [],
            ])
            ->assertRedirect(route('purchases.items.review', [$order, $orderItem]))
            ->assertSessionHasNoErrors();

        $review = Review::query()
            ->where('user_id', $customer->id)
            ->where('reviewable_type', Product::class)
            ->where('reviewable_id', $product->id)
            ->firstOrFail();

        $this->assertSame(5, (int) $review->rating);
        $this->assertCount(1, $review->images);
        Storage::disk('public')->assertExists($review->images[0]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'rating' => 5,
        ]);

        $this->actingAs($customer)
            ->get('/products/' . $product->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('product_details')
                ->has('reviews', 1)
                ->where('reviews.0.images.0', $review->images[0]));
    }

    public function test_customer_cannot_open_review_form_for_an_unpaid_order(): void
    {
        $customer = $this->customer();
        $product = $this->product();
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-REVIEW-' . uniqid(),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 2500,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
        $orderItem = $this->orderItem($order, $product);

        $this->actingAs($customer)
            ->get(route('purchases.items.review', [$order, $orderItem]))
            ->assertRedirect(route('purchases.show', $order))
            ->assertSessionHasErrors('review');

        $this->assertDatabaseMissing('reviews', [
            'user_id' => $customer->id,
            'reviewable_type' => Product::class,
            'reviewable_id' => $product->id,
        ]);
    }

    private function customer(): User
    {
        return User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
    }

    private function product(): Product
    {
        return Product::create([
            'name' => 'Review Test CCTV Camera',
            'brand' => 'SecureView Test',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'installation_fee' => 0,
            'stock_quantity' => 10,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    /**
     * @return array{0: Order, 1: OrderItem}
     */
    private function paidOrderWithItem(User $customer, Product $product): array
    {
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-REVIEW-' . uniqid(),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 2500,
            'payment_method' => 'gcash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        return [$order, $this->orderItem($order, $product)];
    }

    private function orderItem(Order $order, Product $product): OrderItem
    {
        return $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'warranty_period' => $product->warranty,
            'price' => $product->price,
            'quantity' => 1,
            'subtotal' => $product->price,
        ]);
    }
}
