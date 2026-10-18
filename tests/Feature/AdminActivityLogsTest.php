<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\Inquiry;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminActivityLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_the_activity_logs_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('admin.activity-logs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/ActivityLogs')
                ->has('logs.data', 0)
                ->where('summary.total', 0)
            );
    }


    public function test_activity_logs_keep_pagination_and_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        for ($index = 1; $index <= 21; $index++) {
            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'admin_name' => $admin->name,
                'action' => 'product_created',
                'description' => 'Pagination test event ' . $index,
            ]);
        }

        $this->actingAs($admin)
            ->get(route('admin.activity-logs.index', [
                'action' => 'product_created',
                'page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/ActivityLogs')
                ->has('logs.data', 1)
                ->where('logs.total', 21)
                ->where('logs.current_page', 2)
                ->where('filters.action', 'product_created')
            );
    }

    public function test_non_admin_cannot_view_the_activity_logs_page(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user)
            ->get(route('admin.activity-logs.index'))
            ->assertForbidden();
    }

    public function test_successful_admin_login_is_recorded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->post(route('login.authenticate'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'admin_logged_in',
        ]);
    }

    public function test_admin_logout_is_recorded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('logout'))
            ->assertRedirect('/');

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'admin_logged_out',
        ]);
    }

    public function test_user_role_change_is_recorded_with_before_and_after_values(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'user']);

        $this->actingAs($admin)
            ->patch(route('admin.users.role', $target), ['role' => 'technician'])
            ->assertRedirect();

        $log = AdminActivityLog::query()
            ->where('action', 'user_role_updated')
            ->where('subject_id', $target->id)
            ->firstOrFail();

        $this->assertSame($admin->id, $log->admin_id);
        $this->assertSame($admin->name, $log->admin_name);
        $this->assertSame(['role' => 'user'], $log->old_values);
        $this->assertSame(['role' => 'technician'], $log->new_values);
    }

    public function test_product_stock_change_is_recorded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = Product::create([
            'name' => 'Test Camera',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => 12,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.products.stock', $product), ['stock_quantity' => 8])
            ->assertRedirect();

        $log = AdminActivityLog::query()
            ->where('action', 'product_stock_updated')
            ->where('subject_id', $product->id)
            ->firstOrFail();

        $this->assertSame(['stock_quantity' => 12], $log->old_values);
        $this->assertSame(['stock_quantity' => 8], $log->new_values);
    }

    public function test_inquiry_status_change_is_recorded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $inquiry = $this->createInquiry($customer);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.status', $inquiry), ['status' => 'cancelled'])
            ->assertRedirect();

        $log = AdminActivityLog::query()
            ->where('action', 'inquiry_status_updated')
            ->where('subject_id', $inquiry->id)
            ->firstOrFail();

        $this->assertSame(['status' => 'pending'], $log->old_values);
        $this->assertSame(['status' => 'cancelled'], $log->new_values);
    }

    public function test_technician_assignment_is_recorded(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->createInquiry($customer);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.technician', $inquiry), [
                'technician_id' => $technician->id,
            ])
            ->assertRedirect();

        $log = AdminActivityLog::query()
            ->where('action', 'inquiry_technician_team_updated')
            ->where('subject_id', $inquiry->id)
            ->firstOrFail();

        $this->assertSame(['technician_ids' => []], $log->old_values);
        $this->assertSame(['technician_ids' => [$technician->id]], $log->new_values);
    }

    private function createInquiry(User $customer): Inquiry
    {
        return Inquiry::create([
            'user_id' => $customer->id,
            'inquiry_number' => 'INQ-' . fake()->unique()->numerify('######'),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Installation',
            'preferred_date' => now()->addDay()->toDateString(),
            'status' => 'pending',
        ]);
    }
}
