<?php

namespace Database\Seeders;

use App\Models\Package;
use Illuminate\Database\Seeder;

class PackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name' => '4 Channel HikVision Dome Cameras',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 16450,
                'badge' => 'BEST SELLER',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'HikVision 1080p Wide Display',
                    'Perfect For Indoor Surveillance',
                    'DVR Included',
                    'Free Installation w/ 6 Months Warranty',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '4 Channel Dahua Bullet Cameras',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 15000,
                'badge' => 'OPTIMAL FOR OUTDOOR',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'Dahua 1080p Precision Display',
                    'Perfect For Outdoor Surveillance',
                    'DVR Included',
                    'Free Installation w/ 6 Months Warranty',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '8 Channel HikVision Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 23000,
                'badge' => 'OPTIMAL FOR BUSINESSES',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'HikVision 1080p Precision Display',
                    'Perfect For Business Surveillance',
                    'DVR Included',
                    'Free Installation w/ 6 Months Warranty',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '8 Channel Dahua Security Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 25000,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'Dahua 1080p Precision Display',
                    'Perfect For Business Surveillance',
                    'DVR Included',
                    'Free Installation w/ 6 Months Warranty',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '4 Channel Home Security Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 13500,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'Full HD Cameras',
                    'Perfect For Home Surveillance',
                    'DVR Included',
                    'Installation Available',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '8 Channel Premium Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 28000,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'High Resolution Cameras',
                    'Indoor & Outdoor Coverage',
                    'DVR Included',
                    'Installation Available',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '16 Channel Business Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 42000,
                'badge' => 'FOR BUSINESSES',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '16 Channel DVR',
                    'Business Grade Cameras',
                    'Large Area Coverage',
                    'Installation Available',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'Complete Premium CCTV Package',
                'category' => 'CCTV Package',
                'warranty' => '6 Months',
                'price' => 50000,
                'badge' => 'PREMIUM',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'High Resolution Cameras',
                    'Advanced DVR',
                    'Indoor & Outdoor Coverage',
                    'Professional Installation',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
        ];

        foreach ($packages as $package) {
            Package::updateOrCreate(
                ['name' => $package['name']],
                $package
            );
        }
    }
}