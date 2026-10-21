<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PayMongoWebhookController;
use App\Http\Controllers\SchedulerController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/scheduler/run', [SchedulerController::class, 'run'])
    ->middleware('throttle:10,1')
    ->name('scheduler.run');

Route::post('/webhooks/paymongo', [PayMongoWebhookController::class, 'handle'])
    ->name('paymongo.webhook');
