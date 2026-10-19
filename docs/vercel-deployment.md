# Deploy SecureView to Vercel

This repository is a Laravel 12 + Inertia React application. Vercel needs the community PHP runtime entry point and routes in `vercel.json`; it cannot treat this project as only a static Vite site.

## What the repository configures

- `api/index.php` forwards requests into Laravel's public front controller.
- `api/assets.php` safely serves Vite's generated `/build/*` files from within the PHP function bundle, because the PHP runtime's build hook does not automatically publish those generated files as browser-accessible static assets.
- `vercel.json` uses `vercel-php@0.9.0` (PHP 8.5) and the static builder for generated assets under `public/`.
- The Composer `vercel` build hook runs `npm ci` and `npm run build` so the Vite manifest/assets are generated during deployment.
- Laravel's logs go to stderr; compiled/cache outputs that may be written by Laravel during requests use `/tmp`; queue processing uses the synchronous driver because Vercel does not run a persistent queue worker.

## Required Vercel Project Environment Variables

Add these in **Vercel → SecureView project → Settings → Environment Variables**. Do not commit production credentials to Git.

### Required app and database values

- `APP_KEY`: generate a Laravel application key and set it as a secret.
- `APP_URL`: the production HTTPS domain.
- `DB_CONNECTION`: `mysql` or `pgsql`.
- Configure the matching external managed database connection values: either `DB_URL` or `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
- `SESSION_DRIVER=database` and `CACHE_STORE=database` are supported when the required Laravel tables exist in the external database.

**Do not deploy with the default SQLite database.** Vercel function filesystems are ephemeral/read-only for application state; a bundled SQLite file is not a production database. Create/use a persistent external database and run `php artisan migrate --force` against it before sending live traffic.

### Payments

- `PAYMONGO_SECRET_KEY`: use a PayMongo test key until test payments are verified; switch to the live key only after the end-to-end tests pass.
- `PAYMONGO_WEBHOOK_SECRET`: set the signing secret from the PayMongo webhook configured for the production domain.
- Configure PayMongo's webhook URL as `https://YOUR_DOMAIN/api/webhooks/paymongo` and subscribe to `checkout_session.payment.paid`.

The code verifies payment server-side. A redirect to the success URL alone does not create an installation inquiry; the payment must be confirmed by PayMongo.

### Persistent catalog image storage

Vercel's function filesystem is not persistent storage for uploaded product/package images. Configure an S3-compatible bucket and set:

- `CATALOG_STORAGE_DISK=s3`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- `AWS_BUCKET`
- `AWS_URL` if using a custom/public asset URL
- `AWS_ENDPOINT` and `AWS_USE_PATH_STYLE_ENDPOINT=true` only if required by your S3-compatible provider

The product/package admin screens now use the configured catalog storage disk. The bucket must serve uploaded catalog images publicly (or the application must be updated to use signed URLs). Existing local `/storage/...` image files must be copied to persistent object storage and the corresponding catalog image URLs updated before production; Vercel will not preserve the local Laravel storage directory.

## Verify deployment

1. Verify the Vercel project root is the repository root, not a subfolder. Let the repository's `vercel.json` control routes/builds; remove dashboard overrides that force a static-only output directory.
2. Confirm Vercel can install Composer and npm dependencies. The `npm run build` step should produce `public/build/manifest.json`. After deployment, verify a hashed file under `/build/assets/` returns HTTP 200 with the expected CSS/JavaScript content type. Check deployment build logs if the Vercel status still fails.
3. Add the environment variables above and run migrations against the external database.
4. Verify login/session persistence, product/package images, inquiry address maps, cart item selection/removal, and admin screens.
5. Test one paid installation and one canceled/unpaid checkout with PayMongo test mode. Confirm the webhook creates exactly one inquiry and does not clear unrelated cart items.
6. Run `npm run build` and `php artisan test` in CI before merging or switching PayMongo to live mode.

## Notes

- OpenStreetMap tiles and the public Nominatim geocoder have usage limits. For meaningful production traffic, select a provider/service that matches expected usage.
- Secrets are intentionally not placed in `vercel.json`.
- This config prepares the repository for Vercel's PHP runtime, but a successful live deployment still depends on valid Vercel environment variables, the external database, object storage and PayMongo webhook configuration.
