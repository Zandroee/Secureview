# Deploy SecureView to Hostinger

SecureView is a Laravel 12.64 application using PHP, MySQL, React, Inertia, and Vite. This guide targets Hostinger Web/Cloud hosting and VPS. The exact file layout depends on your plan.

## 1. Confirm the hosting plan and requirements

Before uploading the app, confirm the plan supports:

- PHP 8.2 or newer (the project requires PHP `^8.2`) and Laravel's required PHP extensions, including PDO MySQL, OpenSSL, Mbstring, Fileinfo, Ctype, Tokenizer, XML/DOM, cURL, and GD for the image-related workflows.
- A persistent MySQL database and enough disk space for `vendor/`, uploads, logs, and generated assets.
- PHP CLI access is strongly recommended because SecureView needs Composer, safe Artisan migrations, cache management, and scheduled jobs. Hostinger's current documentation says SSH is unavailable on Single Web Hosting; SSH and preinstalled Composer 2 are available on Premium Web and above. Check the exact plan in hPanel before proceeding.
- HTTPS for the site and the PayMongo webhook.

**Plan note:** Premium or Business Web Hosting is the safer choice for this Laravel application because routine deployment and recovery require CLI commands. If your plan is Single and has no supported CLI command runner, the local package script below can prepare the files, but it does not itself apply database migrations. Do not create a public unauthenticated route to execute Artisan; confirm a supported migration path with Hostinger or upgrade to a plan with SSH/CLI access.

Official references: [Hostinger SSH access](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/), [Composer at Hostinger](https://www.hostinger.com/support/5792078-how-to-use-composer-at-hostinger/), [Hostinger Composer/PHP version troubleshooting](https://www.hostinger.com/support/5792082-how-to-solve-common-composer-issues-at-hostinger/).

## 2. Test and package the Windows release

From the project root on your Windows computer:

```powershell
cd D:\secureview-project
git status
git switch dev
git pull origin dev
npm ci
npm run build
php artisan test
```

Preserve local uncommitted changes before switching branches. Deploy a reviewed commit that passes GitHub Actions; do not deploy unreviewed feature branches.

For Hostinger Web Hosting, the repository includes a package helper. Run this from PowerShell at the repository root:

```powershell
.\scripts\package-hostinger.ps1
```

The script builds Vite assets, creates a separate staging copy, installs production Composer dependencies in that staging copy, rewrites the public front-controller paths for the split-directory layout, adds a rule blocking script execution inside public catalog uploads, and creates:

```text
dist\secureview-hostinger-release.zip
```

It does not use or copy your local `.env`, development `vendor/`, `node_modules/`, tests, local logs, or cached configuration. It also excludes local catalog uploads by default so future packages do not overwrite live media.

For the **first deployment only**, if you want to move existing local product/package images from `storage/app/public`, inspect that folder first and run:

```powershell
.\scripts\package-hostinger.ps1 -IncludeLocalUploads
```

Only use that option after confirming the folder contains intended public catalog media. For routine releases, do not use it. Never delete or replace `public_html/storage` on a live site during a code update.

The archive contains sibling `secureview_app/` and `public_html/` directories plus deployment instructions. Extract the private app folder outside the public web root. Merge the contents of the archive's `public_html/` folder into the actual domain `public_html/` directory; do not accidentally create `public_html/public_html/`.

The script requires local Node.js/npm, PHP compatible with the project's `^8.2` requirement, Composer, and Windows `robocopy`. If dependency installation fails because your local PHP CLI lacks a required extension or has the wrong PHP version, fix that first rather than ignoring Composer's platform checks.

If you use SSH to build directly on Hostinger instead, follow the server-side Composer commands in section 6.

## 3. Create the database in hPanel

In Hostinger hPanel, create a MySQL database and database user, grant the user access to the database, and record the exact database host, name, username, and password shown by hPanel. Do not assume the database host is `127.0.0.1`; use Hostinger's displayed host.

Export any existing database before importing or migrating it. For a database already containing SecureView data, restore/import it into the production database before the new deployment, then compare the migration status. Never run `php artisan migrate:fresh` against data you need to keep.

## 4. Put application code outside the public web directory

### Hostinger Web/Cloud hosting with `public_html`

Hostinger's web/cloud document root is generally `public_html` and may not be changeable on those plans. Keep the Laravel application code and `.env` outside the public document root.

A recommended split layout is:

```text
domains/YOUR_DOMAIN/
├── secureview_app/       # Full Laravel repository, vendor/, .env, storage/
│   ├── app/
│   ├── bootstrap/
│   ├── public/           # Laravel's source public directory
│   ├── storage/
│   ├── vendor/
│   └── artisan
└── public_html/          # Only the contents of secureview_app/public/
    ├── index.php
    ├── .htaccess
    ├── build/
    └── storage/
```

Use your actual domain folder and Hostinger account paths. Upload the whole project into `secureview_app`, then copy the **contents** of its `public/` folder into `public_html/`. Do not put `.env`, `vendor/`, `storage/`, `app/`, or `bootstrap/` in the public web directory.

Edit the copied `public_html/index.php` so its Laravel paths point to the sibling application directory. Replace the original relative paths:

```php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
```

with the paths to your actual app folder; if your sibling folder is named `secureview_app`, use:

```php
require __DIR__.'/../secureview_app/vendor/autoload.php';
$app = require_once __DIR__.'/../secureview_app/bootstrap/app.php';
```

Also update the maintenance-file path in that copied file, if present, to `__DIR__.'/../secureview_app/storage/framework/maintenance.php'`. Keep the rest of Laravel's front controller intact. Do not blindly replace the source `public/index.php`; only edit the public web-root copy for this layout.

Create `public_html/storage` and make it writable by the PHP process. In the app's private `.env`, set `PUBLIC_STORAGE_PATH` to the absolute path of that directory, for example `/home/u12345678/domains/YOUR_DOMAIN/public_html/storage`. SecureView's public catalog disk will then write public product/package images to that path. Transfer existing uploaded images into it and confirm their database paths still match. Do not run `storage:link` for this split-directory setup; that command would create a link under the app's private `public/` folder, not the actual `public_html/`.

### Hostinger VPS

For a VPS, configure the domain's document root/virtual host to point to the Laravel application's `public/` directory. Keep `.env`, `vendor/`, and `storage/` outside the document root. Set up the PHP version, required extensions, web server, MySQL connection, permissions, and HTTPS for the VPS. If the document root really points to the app's `public/`, leave `PUBLIC_STORAGE_PATH` unset and use Laravel's usual public storage link if needed.

## 5. Configure the production environment

Create the private `.env` in the application root (next to `artisan`), not in `public_html`. Start from `.env.example`, but do not copy your local database credentials or development secrets.

Set the appropriate values, including:

```dotenv
APP_NAME="SecureView"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR_DOMAIN
APP_TIMEZONE=Asia/Manila

DB_CONNECTION=mysql
DB_HOST=HOSTINGER_DATABASE_HOST
DB_PORT=3306
DB_DATABASE=HOSTINGER_DATABASE_NAME
DB_USERNAME=HOSTINGER_DATABASE_USER
DB_PASSWORD=STRONG_DATABASE_PASSWORD

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
CACHE_STORE=database
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=local
CATALOG_STORAGE_DISK=public
# Shared hosting split layout only: absolute path to public_html/storage
# PUBLIC_STORAGE_PATH=/home/u12345678/domains/YOUR_DOMAIN/public_html/storage

MAIL_MAILER=smtp
# Fill the SMTP host, port, username, password, encryption, and verified sender from your email provider.

PAYMONGO_SECRET_KEY=YOUR_PAYMONGO_TEST_SECRET_KEY
PAYMONGO_WEBHOOK_SECRET=YOUR_PAYMONGO_WEBHOOK_SIGNING_SECRET
PAYMONGO_BASE_URL=https://api.paymongo.com
```

Generate a new `APP_KEY` for a fresh production installation and keep it unchanged afterward. With SSH, from the application root run `php artisan key:generate` once after the private `.env` exists. If the application already has encrypted production data/sessions, do not replace its existing key. Never commit the production `.env` or paste any secret into GitHub, logs, screenshots, or chat.

The project code accepts an `APP_TIMEZONE` value. Set the timezone that matches your actual business and booking operations; this guide uses `Asia/Manila` as the Philippines example. If you operate in another timezone, change it deliberately and test booking dates and scheduled tasks.

Use PayMongo **test** credentials first. Configure OAuth callback URLs in Google/Facebook developer settings to match the new domain, if those login providers are enabled. Configure the exact production HTTPS webhook URL as `https://YOUR_DOMAIN/api/webhooks/paymongo` for the `checkout_session.payment.paid` event. Do not mark an order paid from a browser return URL; PayMongo server-side confirmation remains required.

## 6. Install PHP dependencies and run migrations

Use SSH/terminal, change into the Laravel application root, and verify that the CLI PHP version matches the version selected for the site:

```bash
php -v
php -m
composer2 install --no-dev --optimize-autoloader
php artisan about
php artisan config:clear
php artisan migrate:status
```

If Hostinger's configured PHP executable or Composer command has a different name, use the version/path shown by hPanel or SSH. Do not continue if the CLI PHP version is incompatible or the `pdo_mysql` extension is missing.

After verifying that the database backup exists and the intended production database is selected, apply outstanding migrations deliberately:

```bash
php artisan migrate --force
php artisan optimize
```

Do not run these commands until the production `.env` has been checked carefully. Never use `migrate:fresh` against a database containing real user, order, payment, inquiry, invoice, or inventory records.

Make Laravel's `storage/` and `bootstrap/cache/` writable by the account that runs PHP. Do not apply broad world-writable permissions such as `chmod -R 777`.

## 7. Set up Laravel's scheduler in Hostinger

SecureView already defines scheduled tasks in `routes/console.php`: upcoming-job reminders every fifteen minutes and overdue-inquiry urgency escalation daily. Hostinger's Cron Jobs feature should invoke Laravel's scheduler command every minute so Laravel can decide which tasks are due.

In hPanel, open **Websites → Dashboard → Cron Jobs**, add a **Custom** cron job, and use an absolute PHP executable and application path. Example only—replace both paths with the real values from your account:

```bash
/usr/bin/php /home/u12345678/domains/YOUR_DOMAIN/secureview_app/artisan schedule:run
```

Set the cron expression to:

```text
* * * * *
```

Use the PHP CLI executable compatible with your site's selected PHP version. Hostinger says cron schedules use UTC; Laravel uses the timezone configured by `APP_TIMEZONE` for schedule events. Test the command manually first, inspect cron output/logs, and verify reminders and urgency escalation with controlled test data. If your plan does not allow a one-minute interval, ask Hostinger which supported scheduled-task interval is available rather than silently changing reminders to run less often.

Because a regular shared-hosting plan does not keep a queue worker running continuously, `QUEUE_CONNECTION=sync` is the conservative initial setting. If you intentionally use the database queue later, configure and monitor a supported worker/cron strategy and verify that pending jobs are processed.

The repository no longer needs a public HTTP endpoint just to trigger the scheduler; use Hostinger's CLI cron instead.

Official reference: [Hostinger cron jobs](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/).

## 8. Backups and go-live validation

Before go-live:

1. Download/export a fresh MySQL backup from hPanel/phpMyAdmin and store a protected copy outside the hosting account. Do not rely only on automatic hosting backups; confirm the plan's retention and perform a test restore to a separate database.
2. Confirm `APP_DEBUG=false`, HTTPS is enabled, session cookies are secure, and the private `.env` cannot be downloaded from the website.
3. Verify `/up` returns success, hashed CSS/JS assets return HTTP 200, product/package images load, and the site can log in and out.
4. Test role boundaries: customers cannot visit admin/technician pages, and customers can only view their own orders and invoices.
5. In PayMongo test mode, test successful checkout, canceled/failed checkout, and webhook delivery. Confirm the resulting order/payment states and inventory deduction are correct.
6. Test account verification and password-reset email delivery using production SMTP configuration.
7. Confirm cron execution in Hostinger logs and check that reminders/overdue urgency run when expected.
8. Verify that product/package uploads survive a new release and are stored in the configured persistent location.

After the production site is stable, switch to live payment credentials only after validating the production webhook and payment reconciliation process. Review runtime/PHP error logs and keep credentials, database backups, activity logs, and customer exports restricted to authorized administrators.

## Hostinger references

- [Deploying Laravel on Hostinger VPS](https://www.hostinger.com/ph/tutorials/how-to-deploy-laravel/)
- [Hostinger SSH access](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/)
- [Hostinger Composer](https://www.hostinger.com/support/5792078-how-to-use-composer-at-hostinger/)
- [Hostinger Cron Jobs](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/)
- [Hostinger backups](https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/)
