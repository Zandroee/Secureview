<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('landing');
})->name('home');

Route::get('/products', function () {
    return view('products');
})->name('products');

Route::get('/packages', function () {
    return view('packages');
})->name('packages');

Route::get('/about', function () {
    return view('about');
})->name('about');

Route::get('/login', function () {
    return Inertia::render('login');
})->name('login');

Route::get('/signup', function () {
    return Inertia::render('signup');
})->name('signup');