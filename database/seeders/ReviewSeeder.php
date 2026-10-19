<?php

namespace Database\Seeders;

use App\Models\Package;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'John Doe',
                'email' => 'john@example.com',
            ],
            [
                'name' => 'Jane Doe',
                'email' => 'jane@example.com',
            ],
            [
                'name' => 'Jack Doe',
                'email' => 'jack@example.com',
            ],
        ];

        $createdUsers = [];

        foreach ($users as $userData) {
            $createdUsers[$userData['name']] = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make('password'),
                ]
            );
        }

        $productReviews = [
            [
                'product' => 'Dahua Bullet HDCVI 5MP',
                'user' => 'John Doe',
                'rating' => 5,
                'comment' => 'The camera quality is great and the image is very clear. Installation was also straightforward.',
            ],
            [
                'product' => 'Dahua Bullet HDCVI 5MP',
                'user' => 'Jane Doe',
                'rating' => 5,
                'comment' => 'Good camera for the price. The image quality and night vision work well for our needs.',
            ],
            [
                'product' => 'Dahua Bullet HDCVI 5MP',
                'user' => 'Jack Doe',
                'rating' => 5,
                'comment' => 'Very satisfied with the camera. It looks durable and the video quality is excellent.',
            ],
            [
                'product' => 'HikVision Dome Camera 5MP',
                'user' => 'John Doe',
                'rating' => 5,
                'comment' => 'The dome design looks clean and the video quality is very good.',
            ],
            [
                'product' => 'HikVision Dome Camera 5MP',
                'user' => 'Jane Doe',
                'rating' => 4,
                'comment' => 'Great indoor camera with clear footage and good night vision.',
            ],
            [
                'product' => 'HikVision Dome Camera 5MP',
                'user' => 'Jack Doe',
                'rating' => 5,
                'comment' => 'Easy to use and the image quality is better than I expected.',
            ],
        ];

        foreach ($productReviews as $reviewData) {
            $product = Product::where('name', $reviewData['product'])->first();

            if (!$product) {
                continue;
            }

            Review::updateOrCreate(
                [
                    'user_id' => $createdUsers[$reviewData['user']]->id,
                    'reviewable_type' => Product::class,
                    'reviewable_id' => $product->id,
                    'comment' => $reviewData['comment'],
                ],
                [
                    'rating' => $reviewData['rating'],
                ]
            );
        }

        $packageReviews = [
            [
                'package' => '4 Channel HikVision Dome Cameras',
                'user' => 'John Doe',
                'rating' => 5,
                'comment' => 'The package has everything we needed for a small home installation. Very satisfied with the setup.',
            ],
            [
                'package' => '4 Channel HikVision Dome Cameras',
                'user' => 'Jane Doe',
                'rating' => 5,
                'comment' => 'Good package for home security. The cameras provide clear footage.',
            ],
            [
                'package' => '4 Channel HikVision Dome Cameras',
                'user' => 'Jack Doe',
                'rating' => 4,
                'comment' => 'A solid package with good coverage and useful features.',
            ],
            [
                'package' => '4 Channel Dahua Bullet Cameras',
                'user' => 'John Doe',
                'rating' => 5,
                'comment' => 'The cameras work well outdoors and the image is clear.',
            ],
            [
                'package' => '4 Channel Dahua Bullet Cameras',
                'user' => 'Jane Doe',
                'rating' => 5,
                'comment' => 'Good outdoor security package with reliable cameras.',
            ],
            [
                'package' => '4 Channel Dahua Bullet Cameras',
                'user' => 'Jack Doe',
                'rating' => 5,
                'comment' => 'Everything worked as expected and the cameras have good coverage.',
            ],
        ];

        foreach ($packageReviews as $reviewData) {
            $package = Package::where('name', $reviewData['package'])->first();

            if (!$package) {
                continue;
            }

            Review::updateOrCreate(
                [
                    'user_id' => $createdUsers[$reviewData['user']]->id,
                    'reviewable_type' => Package::class,
                    'reviewable_id' => $package->id,
                    'comment' => $reviewData['comment'],
                ],
                [
                    'rating' => $reviewData['rating'],
                ]
            );
        }
    }
}