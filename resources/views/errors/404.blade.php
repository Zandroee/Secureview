<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, follow">
    <title>Page not found | SecureView</title>
    <style>
        :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #152238; background: #f4f7fb; }
        * { box-sizing: border-box; }
        body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 1.25rem; }
        main { width: min(100%, 42rem); padding: clamp(1.5rem, 5vw, 3rem); background: #fff; border: 1px solid #dbe3ee; border-radius: 1.25rem; box-shadow: 0 1rem 3rem rgba(23, 42, 75, .08); }
        .brand { color: #4f46e5; font-size: .9rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
        .code { margin: 2rem 0 .5rem; color: #64748b; font-size: .85rem; font-weight: 700; letter-spacing: .12em; }
        h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.08; letter-spacing: -.04em; }
        p { max-width: 34rem; color: #475569; line-height: 1.7; }
        nav { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.75rem; }
        a { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; padding: .7rem 1rem; border: 1px solid #cbd5e1; border-radius: .7rem; color: #27364b; background: #fff; font-weight: 700; text-decoration: none; }
        a.primary { border-color: #4f46e5; color: #fff; background: #4f46e5; }
        a:focus-visible { outline: 3px solid #0ea5e9; outline-offset: 3px; }
        a:hover { filter: brightness(.97); }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
    </style>
</head>
<body>
    <main id="main-content" tabindex="-1">
        <div class="brand">SecureView Portal</div>
        <div class="code">ERROR 404 · PAGE NOT FOUND</div>
        <h1>We couldn't find that page.</h1>
        <p>The link may be outdated or the page may have moved. Choose one of the links below to continue browsing SecureView.</p>
        <nav aria-label="Helpful navigation">
            <a class="primary" href="{{ url('/') }}">Go to Home</a>
            <a href="{{ url('/products') }}">Browse Products</a>
            <a href="{{ url('/packages') }}">Browse Packages</a>
            <a href="{{ url('/services') }}">View Services</a>
        </nav>
    </main>
</body>
</html>
