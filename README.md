# SecureView

SecureView is a Laravel 12 + React/Inertia application for Netmax Trading's product catalog, packages, customer inquiries, installation scheduling, orders, payments, inventory, notifications, warranty claims, and internal invoice records.

## Stack

- Laravel 12 / PHP 8.2+
- React, Inertia, Vite, Bootstrap
- MySQL in production
- PayMongo checkout and signed webhook confirmation
- GitHub Actions for the Vite production build and Laravel test suite

## Local development

Prerequisites: PHP and required extensions, Composer, Node.js/npm, and a local database such as MySQL/XAMPP.

```powershell
composer install
npm ci
```

Create `.env` from `.env.example`, set the local database credentials, then generate an application key and run migrations:

```powershell
php artisan key:generate
php artisan migrate
npm run build
php artisan test
```

Do not use `php artisan migrate:fresh` against any database containing data you want to preserve.

## Deployment

Production deployment target: **Hostinger Web Hosting**. Follow [the Hostinger deployment guide](docs/hostinger-deployment.md) for the required PHP/MySQL configuration, secure public directory layout, environment variables, migrations, scheduler cron job, backups, and go-live checks. On Windows, `scripts/package-hostinger.ps1` creates a production ZIP with dependencies and a split `secureview_app` / `public_html` layout; read the guide before uploading it.

Before release, review the changes, require a green GitHub Actions run, back up the production database, and test a restore. Use PayMongo test mode until the deployed webhook and payment workflow have been verified. Keep production secrets in the hosting environment or private `.env`; never commit them.

## Security and operations

See [Security and operational readiness](docs/security-operational-readiness.md) for session settings, authentication hardening, release discipline, backups/recovery, payment monitoring, scheduled jobs, and routine maintenance.

Internal invoice records and printable previews are not, by themselves, confirmation of BIR registration or tax compliance.
