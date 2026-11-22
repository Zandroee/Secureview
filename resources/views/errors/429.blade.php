<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Please slow down a moment | Netmax Trading</title>
    <style>
        :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f3f6fa; }
        * { box-sizing: border-box; }
        body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
        main { width: min(100%, 560px); padding: clamp(28px, 6vw, 48px); border: 1px solid #dce4ef; border-radius: 22px; background: #fff; box-shadow: 0 18px 55px rgba(15, 35, 65, .10); }
        .brand { margin-bottom: 30px; color: #1458a6; font-size: .9rem; font-weight: 900; letter-spacing: .12em; }
        .eyebrow { margin-bottom: 10px; color: #64748b; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
        h1 { margin: 0 0 14px; font-size: clamp(1.8rem, 6vw, 2.35rem); line-height: 1.12; letter-spacing: -.04em; }
        p { color: #526176; line-height: 1.65; }
        .hint { margin-top: 18px; padding: 13px 15px; border: 1px solid #f2d69c; border-radius: 12px; background: #fff8e8; color: #77520a; font-size: .92rem; }
        nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
        a, button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 17px; border: 1px solid #1458a6; border-radius: 10px; font: inherit; font-size: .9rem; font-weight: 750; text-decoration: none; cursor: pointer; }
        .primary { background: #1458a6; color: #fff; }
        .secondary { background: #fff; color: #1458a6; }
        button { background: #fff; color: #1458a6; }
        a:focus-visible, button:focus-visible { outline: 3px solid rgba(20, 88, 166, .28); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
    </style>
</head>
<body>
    <main>
        <div class="brand">NETMAX TRADING</div>
        <div class="eyebrow">A short security pause</div>
        <h1>Please slow down a moment.</h1>
        <p>We’ve received several requests in a short period. This temporary limit helps protect customer accounts and keep the site reliable. It does not mean your account is broken.</p>
        <div class="hint">
            Please wait about {{ max(1, (int) ($retryAfter ?? 60)) }} seconds, then return to the previous page and try again. Your account was not changed by the request that was paused.
        </div>
        <nav aria-label="Helpful navigation">
            <button type="button" onclick="if (window.history.length > 1) { window.history.back(); } else { window.location.assign('/'); }">Return to the previous page</button>
            <a class="primary" href="{{ url('/') }}">Go to Home</a>
            <a class="secondary" href="{{ route('login') }}">Sign in</a>
        </nav>
    </main>
</body>
</html>
