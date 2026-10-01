<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index()
    {
        $packages = Package::all();

        return Inertia::render('packages', [
            'packages' => $packages,
        ]);
    }

    public function show($id)
    {
        $package = Package::with('packageItems.product')->findOrFail($id);
        $reviews = $package->reviews()->with('user')->latest()->get();

        return Inertia::render('package_details', [
            'package' => $package,
            'reviews' => $reviews,
        ]);
    }
}