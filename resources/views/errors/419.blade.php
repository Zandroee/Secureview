<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Session expired | SecureView</title>
    <style>
        :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        * { box-sizing: border-box; }
        body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: #f3f6fa; color: #172033; }
        main { width: min(100%, 520px); padding: clamp(28px, 6vw, 48px); border: 1px solid #dce4ef; border-radius: 22px; background: #fff; box-shadow: 0 18px 55px rgba(15, 35, 65, .10); }
        .brand { margin-bottom: 30px; color: #1458a6; font-size: .9rem; font-weight: 900; letter-spacing: .16em; }
        .eyebrow { margin-bottom: 10px; color: #64748b; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
        h1 { margin: 0 0 14px; font-size: clamp(1.7rem, 6vw, 2.25rem); line-height: 1.12; letter-spacing: -.04em; }
        p { color: #526176; line-height: 1.65; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
        a, button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 17px; border: 1px solid #1458a6; border-radius: 10px; font: inherit; font-size: .9rem; font-weight: 750; text-decoration: none; cursor: pointer; }
        .primary { background: #1458a6; color: #fff; }
        .secondary { background: #fff; color: #1458a6; }
        button { background: #fff; color: #1458a6; }
        a:focus-visible, button:focus-visible { outline: 3px solid rgba(20, 88, 166, .28); outline-offset: 3px; }
    </style>
</head>
<body>
    <main>
        <div class="brand">SECUREVIEW</div>
        <div class="eyebrow">Secure session</div>
        <h1>Your session has expired</h1>
        <p>SecureView could not accept this request because the page's security token is no longer valid. The request was stopped before it could create or update a booking, order, or account record.</p>
        <p>Return to the page you were using, refresh it, and submit again. For account pages, sign in again to start a fresh session.</p>
        <div class="actions">
            <button type="button" onclick="if (window.history.length > 1) { window.history.back(); } else { window.location.assign('/'); }">Return to previous page</button>
            <a class="primary" href="{{ route('login') }}">Sign in</a>
        </div>
    </main>
</body>
</html>
