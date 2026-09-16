<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('landing');
})->name('landing');

Route::get('/products', function () {
    return Inertia::render('products');
})->name('products');

Route::get('/packages', function () {
    return view('packages');
})->name('packages');

Route::get('/about', function () {
    return view('about');
})->name('about');

Route::get('/login', function () {
    return view('login');
})->name('login');

Route::get('/signup', function () {
    return view('signup');
})->name('signup');