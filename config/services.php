<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => rtrim((string) env('APP_URL', 'http://localhost'), '/') . '/auth/google/callback',
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => rtrim((string) env('APP_URL', 'http://localhost'), '/') . '/auth/facebook/callback',
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-3.5-flash-lite'),
    ],

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
        'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com'),
    ],

    'secureview' => [
        // Unpaid orders are automatically cancelled 48 hours after placement.
        // Host administrators may override this only by setting the hour-based
        // value explicitly; the legacy *_DAYS setting is no longer used.
        'unpaid_order_expiry_hours' => max(1, (int) env('SECUREVIEW_UNPAID_ORDER_EXPIRY_HOURS', 48)),

        // Proposed default priority surcharges (PHP, charged once per booking).
        // Confirm the business amounts before configuring these on production.
        'booking_fees' => [
            'urgent' => max(0, (float) env('SECUREVIEW_URGENT_BOOKING_FEE', 500)),
            'emergency' => max(0, (float) env('SECUREVIEW_EMERGENCY_BOOKING_FEE', 1500)),
        ],
    ],

];
