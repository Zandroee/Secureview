<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Inertia testing
    |--------------------------------------------------------------------------
    |
    | This application resolves React pages with Vite. Page existence is
    | verified by the successful frontend production build, so Laravel's
    | server-side test helper must not look for Blade/Vue page templates.
    |
    */
    'testing' => [
        'ensure_pages_exist' => false,
    ],
];
