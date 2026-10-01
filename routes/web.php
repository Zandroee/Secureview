<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\AuthController;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;

Route::get('/', [LandingController::class, 'index']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

Route::get('/packages', [PackageController::class, 'index']);
Route::get('/packages/{id}', [PackageController::class, 'show']);

Route::get('/about', function () {
    return Inertia::render('about');
})->name('about');

Route::get('/login', function () {
    return Inertia::render('login');
})->name('login');

Route::get('/signup', function (Request $request) {
    return Inertia::render('signup', [
        'verificationSent' => $request->session()->get('verificationSent', false),
        'verificationEmail' => $request->session()->get('verificationEmail', ''),
    ]);
})->name('signup');

Route::post('/login', [AuthController::class, 'authenticate'])->name('login.authenticate');
Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/email/verify', function (Request $request) {
    return redirect()->route('signup')->with([
        'verificationSent' => true,
        'verificationEmail' => $request->user()->email,
    ]);
})->middleware('auth')->name('verification.notice');

Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill();

    return redirect('/');
})->middleware(['auth', 'signed'])->name('verification.verify');

Route::post('/email/verification-notification', function (Request $request) {
    $request->user()->sendEmailVerificationNotification();

    return back()->with('message', 'Verification link sent!');
})->middleware(['auth', 'throttle:6,1'])->name('verification.send');

Route::get('/auth/google', [AuthController::class, 'redirectGoogle'])
    ->name('auth.google');

Route::get('/auth/google/callback', [AuthController::class, 'googleCallback'])
    ->name('auth.google.callback');


Route::get('/auth/facebook', [AuthController::class, 'redirectFacebook'])
    ->name('auth.facebook');

Route::get('/auth/facebook/callback', [AuthController::class, 'facebookCallback'])
    ->name('auth.facebook.callback');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified']);

