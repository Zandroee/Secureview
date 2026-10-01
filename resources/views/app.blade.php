<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet">

        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @inertiaHead
    </head>

    <body>
        @inertia
    </body>
</html>