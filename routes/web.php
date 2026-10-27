<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\InquiryController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TechnicianWorkspaceController;
use App\Http\Controllers\Admin\InquiryController as AdminInquiryController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\ScheduleController as AdminScheduleController;
use App\Http\Controllers\Admin\PurchaseController as AdminPurchaseController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Admin\PackageController as AdminPackageController;
use App\Http\Controllers\Admin\CatalogOptionController as AdminCatalogOptionController;
use App\Http\Controllers\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InventoryAdjustmentController as AdminInventoryAdjustmentController;
use App\Http\Controllers\Admin\WarrantyController as AdminWarrantyController;
use App\Http\Controllers\Admin\InvoiceSettingsController as AdminInvoiceSettingsController;
use App\Http\Controllers\Admin\InvoiceIssuanceController as AdminInvoiceIssuanceController;
use App\Http\Controllers\Admin\VoucherController as AdminVoucherController;
use App\Http\Controllers\WarrantyClaimController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

Route::get('/', [LandingController::class, 'index']);

Route::get('/search/suggestions', [SearchController::class, 'suggestions'])
    ->middleware('throttle:60,1')
    ->name('search.suggestions');

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

Route::get('/packages', [PackageController::class, 'index']);
Route::get('/packages/{id}', [PackageController::class, 'show']);

Route::get('/services', function () {
    return Inertia::render('services');
})->name('services');

Route::get('/about', function () {
    return Inertia::render('about');
})->name('about');

Route::post('/chatbot/message', [ChatbotController::class, 'reply'])
    ->middleware('throttle:10,1')
    ->name('chatbot.reply');

Route::get('/login', function () {
    return Inertia::render('login');
})->name('login');

Route::get('/signup', function () {
    return Inertia::render('signup');
})->name('signup');

Route::post('/login', [AuthController::class, 'authenticate'])->middleware('throttle:login')->name('login.authenticate');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register')->name('register');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/email/verify', [EmailVerificationController::class, 'show'])
    ->name('verification.notice');

Route::post('/email/verify', [EmailVerificationController::class, 'verify'])
    ->middleware('throttle:10,1')
    ->name('verification.code.verify');

Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'redirectLegacyLink'])
    ->middleware('signed')
    ->name('verification.verify');

Route::post('/email/verification-code/resend', [EmailVerificationController::class, 'resend'])
    ->middleware('throttle:5,1')
    ->name('verification.code.resend');

// Keep the previous resend URL working for customers with a cached older page.
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware('throttle:5,1')
    ->name('verification.send');

Route::get('/auth/google', [AuthController::class, 'redirectGoogle'])
    ->name('auth.google');

Route::get('/auth/google/callback', [AuthController::class, 'googleCallback'])
    ->name('auth.google.callback');

Route::get('/auth/facebook', [AuthController::class, 'redirectFacebook'])
    ->name('auth.facebook');

Route::get('/auth/facebook/callback', [AuthController::class, 'facebookCallback'])
    ->name('auth.facebook.callback');

Route::get('/forgot-password', function () {
    return Inertia::render('forgot-password');
})->middleware('guest')->name('password.request');

Route::post('/forgot-password', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
    ]);

    $status = Password::sendResetLink(
        $request->only('email')
    );

    return $status === Password::ResetLinkSent
        ? back()->with('status', __($status))
        : back()->withErrors([
            'email' => __($status),
        ]);
})->middleware(['guest', 'throttle:1,1'])->name('password.email');

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    return Inertia::render('reset-password', [
        'token' => $token,
        'email' => $request->query('email', ''),
    ]);
})->middleware('guest')->name('password.reset');

Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token' => ['required'],
        'email' => ['required', 'email'],
        'password' => [
            'required',
            'confirmed',
            PasswordRule::min(8)
                ->mixedCase()
                ->numbers()
                ->symbols(),
        ],
    ]);

    $status = Password::reset(
        $request->only(
            'email',
            'password',
            'password_confirmation',
            'token'
        ),
        function ($user, $password) {
            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();

            event(new PasswordReset($user));
        }
    );

    return $status === Password::PasswordReset
        ? redirect()->route('login')->with('status', __($status))
        : back()->withErrors([
            'email' => [__($status)],
        ]);
})->middleware(['guest', 'throttle:5,1'])->name('password.update');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::patch('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile.update');
    Route::patch('/settings/preferences', [SettingsController::class, 'updatePreferences'])->name('settings.preferences.update');
    Route::patch('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password.update');
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('/cart/items', [CartController::class, 'store'])->name('cart.items.store');
    Route::patch('/cart/items/{cartItem}', [CartController::class, 'update'])->name('cart.items.update');
    Route::delete('/cart/items/{cartItem}', [CartController::class, 'destroy'])->name('cart.items.destroy');
    Route::delete('/cart', [CartController::class, 'clear'])->name('cart.clear');

    Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::post('/checkout/voucher', [CheckoutController::class, 'applyVoucher'])->name('checkout.voucher');
    Route::post('/checkout/buy-now', [CheckoutController::class, 'buyNow'])->name('checkout.buy-now');
    Route::get('/checkout/payment/{order}/success', [CheckoutController::class, 'paymentSuccess'])->name('checkout.payment.success');
    Route::get('/checkout/payment/{order}/cancel', [CheckoutController::class, 'paymentCancel'])->name('checkout.payment.cancel');

    Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::get('/purchases/{order}/invoice', [InvoiceController::class, 'customer'])->name('purchases.invoice');
    Route::get('/purchases/{order}/items/{orderItem}/review', [ReviewController::class, 'create'])->name('purchases.items.review');
    Route::get('/purchases/{order}', [PurchaseController::class, 'show'])->name('purchases.show');
    Route::post('/purchases/{order}/pay', [PurchaseController::class, 'pay'])->name('purchases.pay');
    Route::patch('/purchases/{order}/cancel', [PurchaseController::class, 'cancel'])->name('purchases.cancel');
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');

    Route::get('/warranty-claims', [WarrantyClaimController::class, 'index'])->name('warranty-claims.index');
    Route::post('/warranty-claims', [WarrantyClaimController::class, 'store'])->name('warranty-claims.store');

    Route::get('/inquiry', [InquiryController::class, 'create'])->name('inquiries.create');
    Route::post('/inquiries', [InquiryController::class, 'store'])->name('inquiries.store');
    Route::get('/inquiries', [InquiryController::class, 'index'])->name('inquiries.index');
    Route::get('/inquiries/{inquiry}', [InquiryController::class, 'show'])->name('inquiries.show');
    Route::post('/inquiries/{inquiry}/reschedule', [InquiryController::class, 'requestReschedule'])->name('inquiries.reschedule');
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::delete('/notifications', [NotificationController::class, 'destroySelected'])->name('notifications.destroy-selected');
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

});

Route::middleware(['auth', 'verified', 'technician'])->prefix('technician')->name('technician.')->group(function () {
    Route::get('/dashboard', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'dashboard')->name('dashboard');
    Route::get('/services', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'services')->name('services');
    Route::get('/available-jobs', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'available-jobs')->name('available-jobs');
    Route::get('/post-service-records', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'post-service-records')->name('post-service-records');
    Route::get('/service-history', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'service-history')->name('service-history');
    Route::get('/products', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'products')->name('products');
    Route::get('/schedule', [TechnicianWorkspaceController::class, 'index'])->defaults('page', 'schedule')->name('schedule');
    Route::post('/jobs/{inquiry}/claim', [TechnicianWorkspaceController::class, 'claimJob'])->name('jobs.claim');
    Route::patch('/jobs/{inquiry}/status', [TechnicianWorkspaceController::class, 'updateJobStatus'])->name('jobs.status');
    Route::post('/jobs/{inquiry}/post-service-record', [TechnicianWorkspaceController::class, 'storePostServiceRecord'])->name('jobs.post-service-record');
    Route::patch('/jobs/{inquiry}/schedule', [TechnicianWorkspaceController::class, 'updateJobSchedule'])->name('jobs.schedule');
    Route::patch('/jobs/{inquiry}/reschedule/{decision}', [TechnicianWorkspaceController::class, 'reviewReschedule'])->whereIn('decision', ['approve', 'decline'])->name('jobs.reschedule.review');
    Route::patch('/inventory/{product}', [TechnicianWorkspaceController::class, 'adjustStock'])->name('inventory.adjust');
});

Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    Route::post('/admin/announcements', [NotificationController::class, 'storeAnnouncement'])
        ->name('admin.announcements.store');
    Route::post('/admin/catalog-options', [AdminCatalogOptionController::class, 'store'])
        ->name('admin.catalog-options.store');

    Route::delete('/admin/catalog-options', [AdminCatalogOptionController::class, 'destroy'])
        ->name('admin.catalog-options.destroy');

    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/admin/activity-logs', [AdminActivityLogController::class, 'index'])
        ->name('admin.activity-logs.index');

    Route::get('/admin/packages', [AdminPackageController::class, 'index'])
        ->name('admin.packages.index');

    Route::post('/admin/packages', [AdminPackageController::class, 'store'])
        ->name('admin.packages.store');

    Route::patch('/admin/packages/{package}', [AdminPackageController::class, 'update'])
        ->name('admin.packages.update');

    Route::delete('/admin/packages/{package}', [AdminPackageController::class, 'destroy'])
        ->name('admin.packages.destroy');

    Route::get('/admin/vouchers', [AdminVoucherController::class, 'index'])->name('admin.vouchers.index');
    Route::post('/admin/vouchers', [AdminVoucherController::class, 'store'])->name('admin.vouchers.store');
    Route::patch('/admin/vouchers/{voucher}', [AdminVoucherController::class, 'update'])->name('admin.vouchers.update');
    Route::delete('/admin/vouchers/{voucher}', [AdminVoucherController::class, 'destroy'])->name('admin.vouchers.destroy');

    Route::get('/admin/transactions', [AdminTransactionController::class, 'index'])
        ->name('admin.transactions.index');
    Route::get('/admin/invoice-settings', [AdminInvoiceSettingsController::class, 'index'])
        ->name('admin.invoice-settings.index');
    Route::patch('/admin/invoice-settings', [AdminInvoiceSettingsController::class, 'update'])
        ->name('admin.invoice-settings.update');

    Route::get('/admin/inquiries', [AdminInquiryController::class, 'index'])
        ->name('admin.inquiries.index');
    Route::patch('/admin/service-booking-fees', [AdminInquiryController::class, 'updateBookingFees'])
        ->name('admin.service-booking-fees.update');

    Route::get('/admin/products', [AdminProductController::class, 'index'])
        ->name('admin.products.index');

    Route::get('/admin/inventory-adjustments', [AdminInventoryAdjustmentController::class, 'index'])
        ->name('admin.inventory-adjustments.index');

    Route::get('/admin/warranty', [AdminWarrantyController::class, 'index'])
        ->name('admin.warranty.index');
    Route::patch('/admin/warranty/{warrantyClaim}', [AdminWarrantyController::class, 'update'])
        ->name('admin.warranty.update');

    Route::post('/admin/products', [AdminProductController::class, 'store'])
        ->name('admin.products.store');

    Route::patch('/admin/products/{product}', [AdminProductController::class, 'update'])
        ->name('admin.products.update');

    Route::delete('/admin/products/{product}', [AdminProductController::class, 'destroy'])
        ->name('admin.products.destroy');

    Route::patch('/admin/products/{product}/stock', [AdminProductController::class, 'updateStock'])
        ->name('admin.products.stock');

    Route::get('/admin/inquiries/{inquiry}', [AdminInquiryController::class, 'show'])
        ->name('admin.inquiries.show');

    Route::patch('/admin/inquiries/{inquiry}/status', [AdminInquiryController::class, 'updateStatus'])
        ->name('admin.inquiries.status');

    Route::patch('/admin/inquiries/{inquiry}/confirm', [AdminInquiryController::class, 'confirm'])
        ->name('admin.inquiries.confirm');

    Route::patch('/admin/inquiries/{inquiry}/technician', [AdminInquiryController::class, 'assignTechnician'])
        ->name('admin.inquiries.technician');

    Route::get('/admin/users', [AdminUserController::class, 'index'])
        ->name('admin.users.index');

    Route::get('/admin/schedules', [AdminScheduleController::class, 'index'])
        ->name('admin.schedules.index');
    Route::get('/admin/service-history', [AdminScheduleController::class, 'history'])
        ->name('admin.service-history.index');
    Route::get('/admin/schedules/{inquiry}', [AdminScheduleController::class, 'show'])
        ->name('admin.schedules.show');
    Route::patch('/admin/schedules/{inquiry}', [AdminScheduleController::class, 'updateSchedule'])->name('admin.schedules.update');
    Route::patch('/admin/reschedule-requests/{inquiry}/approve', [AdminScheduleController::class, 'approveReschedule'])->name('admin.reschedule-requests.approve');
    Route::patch('/admin/reschedule-requests/{inquiry}/decline', [AdminScheduleController::class, 'declineReschedule'])->name('admin.reschedule-requests.decline');

    Route::post('/admin/booking-availability', [AdminScheduleController::class, 'storeBookingDateBlock'])
        ->name('admin.booking-availability.store');

    Route::delete('/admin/booking-availability/{blockedBookingDate}', [AdminScheduleController::class, 'destroyBookingDateBlock'])
        ->name('admin.booking-availability.destroy');

    Route::delete('/admin/booking-time-slots/{blockedBookingTimeSlot}', [AdminScheduleController::class, 'destroyBookingTimeSlot'])
        ->name('admin.booking-time-slots.destroy');

    Route::get('/admin/purchases', [AdminPurchaseController::class, 'index'])
        ->name('admin.purchases.index');
    Route::get('/admin/order-history', [AdminPurchaseController::class, 'history'])
        ->name('admin.order-history.index');
    Route::get('/admin/purchases/{order}/invoice', [InvoiceController::class, 'admin'])
        ->name('admin.purchases.invoice');
    Route::post('/admin/purchases/{order}/invoice-record', [AdminInvoiceIssuanceController::class, 'store'])
        ->name('admin.purchases.invoice-record.store');
    Route::patch('/admin/purchases/{order}/cancel', [AdminPurchaseController::class, 'cancel'])
        ->name('admin.purchases.cancel');
    Route::patch('/admin/purchases/{order}/confirm-cash-payment', [AdminPurchaseController::class, 'confirmCashPayment'])
        ->name('admin.purchases.confirm-cash-payment');
    Route::patch('/admin/purchases/{order}/complete', [AdminPurchaseController::class, 'markCompleted'])
        ->name('admin.purchases.complete');

    Route::patch('/admin/users/{user}/role', [AdminUserController::class, 'updateRole'])
        ->name('admin.users.role');
});
