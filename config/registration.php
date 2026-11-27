<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Email providers accepted for customer email/password registration
    |--------------------------------------------------------------------------
    |
    | Only exact, established mailbox domains may create a new account here.
    | Disposable providers, free-form domains and lookalike subdomains are
    | rejected. This is NOT proof that an inbox exists: users must still
    | confirm the emailed six-digit verification code before signing in.
    |
    | Keep the signup frontend in sync by passing this list from Laravel.
    | OAuth sign-in and existing accounts are handled separately.
    |
    */
    'allowed_email_domains' => [
        'gmail.com',
        'googlemail.com',
        'yahoo.com',
        'yahoo.com.ph',
        'ymail.com',
        'rocketmail.com',
        'outlook.com',
        'outlook.com.ph',
        'hotmail.com',
        'hotmail.com.ph',
        'live.com',
        'live.com.ph',
        'msn.com',
        'icloud.com',
        'me.com',
        'mac.com',
        'aol.com',
        'proton.me',
        'protonmail.com',
        'pm.me',
        'zoho.com',
        'zohomail.com',
        'fastmail.com',
    ],
];
