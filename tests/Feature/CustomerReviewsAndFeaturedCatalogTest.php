<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Mail\EmailVerificationCodeMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerReviewsAndFeaturedCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_customer_sees_verification_guidance_after_entering_correct_password(): void
    {
        Mail::fake();

        $customer = User::factory()->unverified()->create([
            'role' => 'user',
        ]);

        $this->post(route('login.authenticate'), [
            'email' => $customer->email,
            'password' => 'password',
        ])
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('verificationEmail', $customer->email)
            ->assertSessionHas('status');

        $this->assertGuest();
        Mail::assertSent(EmailVerificationCodeMail::class, fn (EmailVerificationCodeMail $mail) => $mail->user->is($customer) && preg_match('/^\d{6}$/', $mail->code) === 1);
    }

    public function test_homepage_featured_items_include_stock_state_and_package_inclusions(): void
    {
        $outOfStockCamera = $this->createProduct('Out of Stock Camera', 0, true);
        $includedCamera = $this->createProduct('Included Camera', 1, false);

        $package = Package::create([
            'name' => 'Featured Test Package',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1500,
            'badge' => null,
            'image' => null,
            'specifications' => ['Night vision'],
            'rating' => 0,
            'is_featured' => true,
        ]);

        PackageItem::create([
            'package_id' => $package->id,
            'product_id' => $includedCamera->id,
            'quantity' => 2,
            'price' => 500,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('landing')
                ->where('cameras.0.id', $outOfStockCamera->id)
                ->where('cameras.0.available', false)
                ->where('cctvPackages.0.id', $package->id)
                ->where('cctvPackages.0.available', false)
                ->where('cctvPackages.0.available_stock', 0)
                ->where('cctvPackages.0.inclusions.0.name', $includedCamera->name)
                ->where('cctvPackages.0.inclusions.0.quantity', 2)
            );
    }

    public function test_only_customer_who_paid_for_an_item_can_review_and_can_update_their_review(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);

        $product = $this->createProduct('Purchased Camera', 5, false);
        $package = Package::create([
            'name' => 'Purchased Package',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2000,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($customer)
            ->from('/products/' . $product->id)
            ->post(route('reviews.store'), [
                'item_type' => 'product',
                'item_id' => $product->id,
                'rating' => 4,
                'comment' => 'Works very well',
            ])
            ->assertRedirect('/products/' . $product->id)
            ->assertSessionHasErrors('review');

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-REVIEW-TEST-001',
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'total' => 2500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Review Test Street',
        ]);

        foreach ([
            [$product, 500],
            [$package, 2000],
        ] as [$item, $price]) {
            OrderItem::create([
                'order_id' => $order->id,
                'purchasable_type' => $item::class,
                'purchasable_id' => $item->id,
                'name' => $item->name,
                'price' => $price,
                'quantity' => 1,
                'subtotal' => $price,
            ]);
        }

        $this->actingAs($customer)
            ->from('/products/' . $product->id)
            ->post(route('reviews.store'), [
                'item_type' => 'product',
                'item_id' => $product->id,
                'rating' => 4,
                'comment' => 'Works very well',
            ])
            ->assertRedirect('/products/' . $product->id)
            ->assertSessionHasNoErrors();

        $this->actingAs($customer)
            ->from('/packages/' . $package->id)
            ->post(route('reviews.store'), [
                'item_type' => 'package',
                'item_id' => $package->id,
                'rating' => 5,
                'comment' => 'Great value and easy to install',
            ])
            ->assertRedirect('/packages/' . $package->id)
            ->assertSessionHasNoErrors();

        $this->actingAs($customer)
            ->get('/products/' . $product->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canReview', true)
                ->where('userReview.rating', 4)
                ->where('reviews.0.comment', 'Works very well')
            );

        $this->actingAs($customer)
            ->from('/products/' . $product->id)
            ->post(route('reviews.store'), [
                'item_type' => 'product',
                'item_id' => $product->id,
                'rating' => 5,
                'comment' => 'Even better after extended use',
            ])
            ->assertRedirect('/products/' . $product->id)
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Review::query()
            ->where('user_id', $customer->id)
            ->where('reviewable_type', Product::class)
            ->where('reviewable_id', $product->id)
            ->count());
        $this->assertSame(5.0, (float) $product->fresh()->rating);
        $this->assertSame(5.0, (float) $package->fresh()->rating);
        $this->assertDatabaseHas('reviews', [
            'user_id' => $customer->id,
            'reviewable_type' => Package::class,
            'reviewable_id' => $package->id,
            'rating' => 5,
            'comment' => 'Great value and easy to install',
        ]);
    }

    private function createProduct(string $name, int $stock, bool $featured): Product
    {
        return Product::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 500,
            'stock_quantity' => $stock,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => $featured,
        ]);
    }
}