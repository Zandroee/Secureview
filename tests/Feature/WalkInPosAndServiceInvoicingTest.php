<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\InvoiceRecord;
use App\Models\InvoiceSetting;
use App\Models\Order;
use App\Models\Package;
use App\Models\Product;
use App\Models\ServiceRecord;
use App\Models\ServiceRecordItem;
use App\Models\User;
use App\Services\InvoiceDocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WalkInPosAndServiceInvoicingTest extends TestCase
{
    use RefreshDatabase;

    private const SLOT = '08:00 AM - 11:00 AM';

    public function test_admin_can_record_a_walk_in_sale_for_products_and_packages_with_inventory_audits(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $product = $this->createProduct('Walk-in Camera', 10, 1500);
        $package = $this->createPackage('Walk-in CCTV Kit', 3000);
        $package->packageItems()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => $product->price,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.walk-in.sales.store'), [
                'customer_name' => 'Counter Customer',
                'customer_phone' => '09171234567',
                'customer_email' => 'counter@example.test',
                'payment_method' => 'cash',
                'notes' => 'Collected at the physical store counter.',
                'items' => [
                    ['type' => 'product', 'id' => $product->id, 'quantity' => 1],
                    ['type' => 'package', 'id' => $package->id, 'quantity' => 2],
                ],
            ])
            ->assertRedirect(route('admin.walk-in.index'))
            ->assertSessionHasNoErrors();

        $order = Order::query()->where('sales_channel', 'walk_in')->firstOrFail();

        $this->assertNull($order->user_id);
        $this->assertSame($admin->id, $order->created_by);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('completed', $order->order_status);
        $this->assertEquals(7500, $order->total);
        $this->assertSame(2, $order->items()->count());

        // One standalone camera and four cameras contained in two packages.
        $this->assertSame(5, (int) $product->fresh()->stock_quantity);
        $this->assertSame(1, InventoryAdjustment::query()
            ->where('user_id', $admin->id)
            ->where('reason', 'like', 'Walk-in sale ' . $order->order_number . '%')
            ->count());
        $this->assertDatabaseHas('inventory_adjustments', [
            'user_id' => $admin->id,
            'product_id' => $product->id,
            'previous_quantity' => 10,
            'new_quantity' => 5,
            'quantity_change' => -5,
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'walk_in_sale_completed',
            'payment_status_after' => 'paid',
            'order_status_after' => 'completed',
        ]);
    }

    public function test_admin_can_register_a_walk_in_drop_off_without_creating_a_customer_account(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $technician = User::factory()->create(['role' => 'technician']);

        $this->actingAs($admin)
            ->post(route('admin.walk-in.services.store'), [
                'customer_name' => 'Guest Repair Customer',
                'customer_phone' => '09171234567',
                'customer_email' => null,
                'service_type' => 'Repair',
                'service_location_type' => 'in_shop',
                'preferred_date' => today()->addDays(4)->toDateString(),
                'preferred_time' => self::SLOT,
                'urgency' => 'normal',
                'item_name' => 'Four-channel DVR',
                'notes' => 'Intermittent recording issue.',
            ])
            ->assertRedirect(route('admin.walk-in.index'))
            ->assertSessionHasNoErrors();

        $inquiry = Inquiry::query()->where('intake_channel', 'walk_in')->firstOrFail();

        $this->assertNull($inquiry->user_id);
        $this->assertNull($inquiry->customer_email);
        $this->assertSame('in_shop', $inquiry->service_location_type);
        $this->assertSame('pending', $inquiry->status);
        $this->assertSame('Netmax Trading — In-shop service counter', $inquiry->street_address);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'new_inquiry',
            'related_id' => $inquiry->id,
        ]);

        // Guest walk-ins must remain compatible with the ordinary assignment
        // and confirmation workflow without attempting customer notifications.
        $this->actingAs($admin)
            ->patch(route('admin.inquiries.technician', $inquiry), [
                'technician_ids' => [$technician->id],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $inquiry->preferred_date->format('Y-m-d'),
                'preferred_time' => self::SLOT,
                'technician_ids' => [$technician->id],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('confirmed', $inquiry->fresh()->status);
        $notificationRecipients = \App\Models\CustomerNotification::query()
            ->where('related_type', Inquiry::class)
            ->where('related_id', $inquiry->id)
            ->pluck('user_id')
            ->unique()
            ->all();
        $this->assertNotEmpty($notificationRecipients);
        $this->assertContains($admin->id, $notificationRecipients);
        $this->assertContains($technician->id, $notificationRecipients);
        $this->assertNotContains(null, $notificationRecipients);
    }

    public function test_walk_in_service_intake_rejects_a_day_when_all_technicians_are_busy_across_different_slots(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $date = today()->addDays(9)->toDateString();
        $technicians = [
            User::factory()->create(['role' => 'technician']),
            User::factory()->create(['role' => 'technician']),
            User::factory()->create(['role' => 'technician']),
        ];

        foreach ($technicians as $index => $technician) {
            Inquiry::create([
                'user_id' => null,
                'technician_id' => $technician->id,
                'inquiry_number' => 'INQ-WI-CAPACITY-' . ($index + 1),
                'customer_name' => 'Existing Customer ' . ($index + 1),
                'customer_phone' => '09171234567',
                'customer_email' => null,
                'street_address' => 'Existing service address',
                'city' => 'Taguig',
                'service_type' => 'Repair',
                'urgency' => 'normal',
                'urgency_fee' => 0,
                'preferred_date' => $date,
                'preferred_time' => [
                    '08:00 AM - 11:00 AM',
                    '11:00 AM - 02:00 PM',
                    '02:00 PM - 05:00 PM',
                ][$index],
                'status' => 'confirmed',
            ]);
        }

        $this->actingAs($admin)
            ->post(route('admin.walk-in.services.store'), [
                'customer_name' => 'New Counter Customer',
                'customer_phone' => '09179998888',
                'service_type' => 'Repair',
                'service_location_type' => 'customer_site',
                'street_address' => 'New customer address',
                'city' => 'Taguig',
                'preferred_date' => $date,
                'preferred_time' => self::SLOT,
                'urgency' => 'normal',
            ])
            ->assertSessionHasErrors('preferred_date');

        $this->assertFalse(
            Inquiry::query()
                ->where('intake_channel', 'walk_in')
                ->whereDate('preferred_date', $date)
                ->exists()
        );
    }

    public function test_warranty_covered_replacements_are_not_charged_and_service_invoice_tracks_each_payment(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $technician = User::factory()->create([
            'role' => 'technician',
            'email_verified_at' => now(),
        ]);
        $warrantyProduct = $this->createProduct('Warranty Replacement Camera', 5, 1800);
        $billableProduct = $this->createProduct('Chargeable Power Adapter', 5, 100);

        $inquiry = Inquiry::create([
            'user_id' => null,
            'technician_id' => $technician->id,
            'inquiry_number' => 'INQ-WALKIN-REPORT-001',
            'item_name' => 'Customer CCTV system',
            'customer_name' => 'Walk-in Repair Customer',
            'customer_phone' => '09171234567',
            'customer_email' => null,
            'street_address' => 'Netmax Trading — In-shop service counter',
            'city' => 'In-shop',
            'service_type' => 'Repair',
            'urgency' => 'normal',
            'urgency_fee' => 0,
            'preferred_date' => today()->addDays(2)->toDateString(),
            'preferred_time' => self::SLOT,
            'notes' => 'Device was dropped off at the shop.',
            'status' => 'in_progress',
            'intake_channel' => 'walk_in',
            'service_location_type' => 'in_shop',
        ]);

        $this->actingAs($technician)
            ->post(route('technician.jobs.post-service-record', $inquiry), [
                'work_summary' => 'Replaced the defective camera and restored the power supply.',
                'customer_notes' => 'The camera is recording normally after testing.',
                'labor_charge' => 200,
                'additional_charge' => 50,
                'items' => [
                    [
                        'action' => 'used',
                        'product_id' => $warrantyProduct->id,
                        'product_name' => $warrantyProduct->name,
                        'quantity' => 1,
                        'unit_price' => 1800,
                        'is_warranty_covered' => true,
                        'notes' => 'Approved warranty replacement.',
                    ],
                    [
                        'action' => 'used',
                        'product_id' => $billableProduct->id,
                        'product_name' => $billableProduct->name,
                        'quantity' => 2,
                        'unit_price' => 100,
                        'is_warranty_covered' => false,
                        'notes' => 'Additional adapter supplied.',
                    ],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $record = ServiceRecord::query()->where('inquiry_id', $inquiry->id)->firstOrFail();
        $coveredItem = ServiceRecordItem::query()
            ->where('service_record_id', $record->id)
            ->where('product_id', $warrantyProduct->id)
            ->firstOrFail();

        $this->assertTrue((bool) $coveredItem->is_warranty_covered);
        $this->assertEquals(0, $coveredItem->unit_price);
        $this->assertEquals(450, $record->total_income);
        $this->assertSame('completed', $inquiry->fresh()->status);
        $this->assertSame(4, (int) $warrantyProduct->fresh()->stock_quantity);
        $this->assertSame(3, (int) $billableProduct->fresh()->stock_quantity);

        $snapshot = app(InvoiceDocumentService::class)->buildServiceSnapshot($record->fresh());
        $this->assertEquals(450, $snapshot['total']);
        $this->assertEquals(0, $snapshot['items'][1]['unit_price']);
        $this->assertEquals(0, $snapshot['items'][1]['amount']);
        $this->assertStringContainsString('Warranty-covered', $snapshot['items'][1]['notes']);

        $this->createReadyInvoiceProfile();

        $this->actingAs($admin)
            ->post(route('admin.service-records.invoice-record.store', $record))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $invoiceRecord = InvoiceRecord::query()
            ->where('service_record_id', $record->id)
            ->firstOrFail();

        $this->assertStringStartsWith('SV-INT-SVC-INV-', $invoiceRecord->record_number);
        $this->assertEquals(450, $invoiceRecord->snapshot['total']);

        $this->actingAs($admin)
            ->patch(route('admin.service-records.payment.update', $record), [
                'payment_amount' => 100,
                'payment_method' => 'cash',
                'reference' => 'COUNTER-RECEIPT-001',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('partially_paid', $record->fresh()->payment_status);
        $this->assertDatabaseHas('service_record_payments', [
            'service_record_id' => $record->id,
            'amount' => 100,
            'payment_method' => 'cash',
            'reference' => 'COUNTER-RECEIPT-001',
            'recorded_by_user_id' => $admin->id,
            'is_legacy_import' => false,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.service-records.payment.update', $record), [
                'payment_amount' => 350,
                'payment_method' => 'gcash',
                'reference' => 'GCASH-REF-002',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('paid', $record->fresh()->payment_status);
        $this->assertEquals(450, $record->fresh()->amount_paid);
        $this->assertSame(2, $record->payments()->count());

        $this->actingAs($admin)
            ->get(route('admin.service-records.invoice', $record))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invoice')
                ->where('invoice.is_recorded', true)
                ->where('invoice.total', 450)
                ->where('invoice.amount_paid', 450)
                ->where('invoice.balance_due', 0)
                ->where('invoice.payment_status', 'paid')
                ->has('invoice.payments', 2));

        $this->actingAs($admin)
            ->patch(route('admin.service-records.payment.update', $record), [
                'payment_amount' => 0.01,
                'payment_method' => 'cash',
            ])
            ->assertSessionHasErrors('payment_amount');

        $this->assertSame(2, $record->payments()->count());
    }

    private function createProduct(string $name, int $stock, float $price): Product
    {
        return Product::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => $price,
            'stock_quantity' => $stock,
            'specifications' => [],
            'images' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function createPackage(string $name, float $price): Package
    {
        return Package::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => $price,
            'specifications' => [],
            'images' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function createReadyInvoiceProfile(): InvoiceSetting
    {
        return InvoiceSetting::create([
            'id' => 1,
            'business_name' => 'Netmax Trading',
            'registered_name' => 'Netmax Trading Test Company',
            'address' => '123 Test Street, Taguig City',
            'email' => 'billing@example.test',
            'phone' => '02-8000-0000',
            'tin' => '000-000-000-000',
            'vat_status' => 'non_vat',
            'branch_code' => '000',
            'bir_permit_number' => 'TEST-PERMIT',
            'bir_atp_number' => 'TEST-ATP',
            'serial_number_range' => 'TEST-000001 to TEST-000999',
            'invoice_number_prefix' => 'TEST-',
            'first_invoice_number' => 100,
            'last_invoice_number' => 999,
            'next_invoice_number' => 100,
            'invoice_number_padding' => 6,
        ]);
    }
}
