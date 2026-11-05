<?php

namespace Tests\Feature;

use App\Mail\PendingPaymentReminderMail;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ExpiredUnpaidOrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_expiry_cancels_only_unpaid_orders_past_the_configured_deadline(): void
    {
        config(['services.secureview.unpaid_order_expiry_hours' => 48]);
        $customer = User::factory()->create(['role' => 'user']);

        $expired = $this->makeOrder($customer, 'SV-EXPIRED-' . $customer->id, 'pending', 'pending');
        DB::table('orders')->where('id', $expired->id)->update([
            'created_at' => now()->subHours(49),
            'updated_at' => now()->subHours(49),
        ]);

        $notExpired = $this->makeOrder($customer, 'SV-NEW-' . $customer->id, 'pending', 'awaiting_payment');
        $paid = $this->makeOrder($customer, 'SV-PAID-' . $customer->id, 'paid', 'processing');
        DB::table('orders')->where('id', $paid->id)->update(['paid_at' => now()]);

        Artisan::call('secureview:cancel-expired-unpaid-orders');

        $this->assertDatabaseHas('orders', [
            'id' => $expired->id,
            'order_status' => 'cancelled',
            'cancellation_reason' => 'Automatically cancelled after 48 hours without confirmed payment.',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'order_cancelled',
            'related_id' => $expired->id,
        ]);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $expired->id,
            'event_key' => 'unpaid_order_auto_cancelled',
        ]);
        $this->assertDatabaseHas('orders', ['id' => $notExpired->id, 'order_status' => 'awaiting_payment']);
        $this->assertDatabaseHas('orders', ['id' => $paid->id, 'order_status' => 'processing', 'payment_status' => 'paid']);
    }


    public function test_scheduled_payment_reminder_emails_only_eligible_unpaid_orders_once(): void
    {
        config([
            'services.secureview.unpaid_order_expiry_hours' => 48,
            'services.secureview.unpaid_order_reminder_after_hours' => 24,
        ]);
        Mail::fake();

        $customer = User::factory()->create(['role' => 'user']);

        $due = $this->makeOrder($customer, 'SV-REMINDER-' . $customer->id, 'pending', 'pending');
        DB::table('orders')->where('id', $due->id)->update([
            'created_at' => now()->subHours(30),
            'updated_at' => now()->subHours(30),
        ]);

        $tooRecent = $this->makeOrder($customer, 'SV-RECENT-' . $customer->id, 'pending', 'awaiting_payment');
        DB::table('orders')->where('id', $tooRecent->id)->update([
            'created_at' => now()->subHours(12),
            'updated_at' => now()->subHours(12),
        ]);

        $alreadyExpired = $this->makeOrder($customer, 'SV-REMINDER-EXPIRED-' . $customer->id, 'pending', 'pending');
        DB::table('orders')->where('id', $alreadyExpired->id)->update([
            'created_at' => now()->subHours(50),
            'updated_at' => now()->subHours(50),
        ]);

        $paid = $this->makeOrder($customer, 'SV-REMINDER-PAID-' . $customer->id, 'paid', 'processing');
        DB::table('orders')->where('id', $paid->id)->update([
            'paid_at' => now(),
            'created_at' => now()->subHours(30),
            'updated_at' => now()->subHours(30),
        ]);

        Artisan::call('secureview:send-unpaid-order-payment-reminders');

        Mail::assertSent(PendingPaymentReminderMail::class, function (PendingPaymentReminderMail $mail) use ($due, $customer) {
            return $mail->order->id === $due->id
                && $mail->hasTo($customer->email)
                && $mail->paymentDeadline->isFuture();
        });
        Mail::assertSentTimes(PendingPaymentReminderMail::class, 1);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $due->id,
            'event_key' => 'unpaid_payment_reminder_sent',
        ]);
        $this->assertDatabaseMissing('order_events', [
            'order_id' => $tooRecent->id,
            'event_key' => 'unpaid_payment_reminder_sent',
        ]);
        $this->assertDatabaseMissing('order_events', [
            'order_id' => $alreadyExpired->id,
            'event_key' => 'unpaid_payment_reminder_sent',
        ]);
        $this->assertDatabaseMissing('order_events', [
            'order_id' => $paid->id,
            'event_key' => 'unpaid_payment_reminder_sent',
        ]);

        Artisan::call('secureview:send-unpaid-order-payment-reminders');
        Mail::assertSentTimes(PendingPaymentReminderMail::class, 1);
    }

    private function makeOrder(User $customer, string $number, string $paymentStatus, string $orderStatus): Order
    {
        return Order::create([
            'user_id' => $customer->id,
            'order_number' => $number,
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'cash',
            'payment_status' => $paymentStatus,
            'order_status' => $orderStatus,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
    }
}
