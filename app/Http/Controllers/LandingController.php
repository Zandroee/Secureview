<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\Product;
use Inertia\Inertia;

class LandingController extends Controller
{
    public function index()
    {
        $cctvPackages = Package::where('is_featured', true)
            ->orderBy('id')
            ->take(8)
            ->get();

        $cameras = Product::where('is_featured', true)
            ->orderBy('id')
            ->take(8)
            ->get();

        return Inertia::render('landing', [
            'cctvPackages' => $cctvPackages,
            'cameras' => $cameras,
        ]);
    }
}