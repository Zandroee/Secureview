# Security and operational readiness

This checklist applies to SecureView deployed on Hostinger with Laravel, a persistent MySQL database, and PayMongo. It does not replace Hostinger's instructions or an actual backup/restore test.

## 1. Production environment and secrets

- Set `APP_ENV=production`, `APP_DEBUG=false`, the production HTTPS `APP_URL`, and a deliberate `APP_TIMEZONE` matching the business's booking operations.
- Generate `APP_KEY` for a fresh installation and store it in the private `.env`. Do not regenerate it casually on a live deployment; doing so can invalidate encrypted data and sessions.
- Set `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`, `SESSION_SAME_SITE=lax`, and a persistent session store supported by the database.
- Use a production MySQL database, not the default SQLite configuration. Use a database account with only the necessary privileges.
- Keep the production `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, OAuth secrets, SMTP credentials, and database password private. Separate test and live PayMongo credentials.
- Keep Laravel's private application folders, `.env`, and `vendor/` outside the publicly served directory. For split-directory Hostinger shared hosting, follow [the deployment guide](hostinger-deployment.md).
- If any credential is exposed, rotate it with the provider. Deleting the visible copy is not sufficient.

## 2. Release checklist

1. Review the PR and require GitHub Actions to pass the Vite production build and Laravel test suite.
2. Review each migration's `up()` and `down()`; prefer backward-compatible database changes.
3. Export a fresh database backup before production migrations and verify the restore procedure against a separate non-production database.
4. Deploy the reviewed commit to Hostinger, apply migrations once with the correct production configuration, and inspect PHP/web-server logs.
5. Smoke-test HTTPS, assets, login/logout, role-based pages, customer purchase/invoice pages, product images, and core admin pages.
6. Use PayMongo test mode to test checkout, cancellations, and webhook behavior before switching to live credentials. A browser return URL is not proof of payment.

Never run `php artisan migrate:fresh` against data that must be preserved. Do not run a migration from your local terminal unless you have confirmed which database the environment uses. Keep backups before bulk order/inventory repairs and document any manual correction.

## 3. Backups and recovery

- Use Hostinger's hPanel backup feature and/or a controlled MySQL export. Confirm the actual backup frequency and retention included with the purchased plan.
- Store a restricted copy of important database backups outside the hosting account and Git repository.
- Backups include customer contact details, addresses, orders, invoices, and operational data; protect them like production data.
- Periodically restore a recent backup into a separate, non-production database and verify essential records. A backup that has never been restored is not a verified recovery plan.
- Record who is allowed to restore backups and where recovery credentials are securely maintained.

## 4. Payments, orders, and inventory

- Review Hostinger PHP/web-server logs for recurring 5xx errors and authentication failures.
- Confirm the PayMongo webhook URL is the production HTTPS URL and the webhook secret matches the configured webhook. Investigate signature failures and repeated webhook failures.
- Reconcile PayMongo transactions against SecureView orders. Never manually mark PayMongo payments as paid merely because a customer shows a success page or screenshot.
- Investigate stock deduction exceptions, duplicate events, and unexpected order-state changes using the audit trail; avoid ad-hoc SQL changes without a backup and documented reason.
- Confirm account-verification and password-reset emails are delivered through the configured SMTP account; do not put credentials or session data in logs.

## 5. Scheduled jobs

Laravel schedules are defined in `routes/console.php`. On Hostinger, configure hPanel **Cron Jobs** to run `php artisan schedule:run` from the Laravel application root every minute, using the correct PHP CLI binary and absolute paths. Hostinger documents cron schedules as UTC; Laravel schedule events use the configured application timezone. The exact cron command and steps are in [the Hostinger deployment guide](hostinger-deployment.md).

After setup, inspect cron output and runtime logs and verify upcoming-job reminders and overdue-inquiry urgency escalation occur as expected. Do not create a public unauthenticated URL that runs Artisan commands.

## 6. Routine maintenance

- Enable Dependabot updates and review its PRs. Run `composer audit` and `npm audit` periodically; assess and prioritize vulnerabilities rather than blindly upgrading production dependencies.
- Review admin and technician accounts periodically; remove access when it is no longer needed and retain at least one tested administrator account.
- Restrict access to activity logs, hosting logs, backups, invoice/profile exports, and customer data.
- Keep PHP and dependencies patched and remove abandoned or unnecessary packages after assessing their use.
- After an incident, preserve relevant logs, rotate exposed secrets, review role changes and order/payment history, and document recovery actions.

## 7. Post-deployment smoke test

- [ ] HTTPS certificate is active and `/up` responds successfully.
- [ ] Invalid login attempts are throttled; login/logout work as expected.
- [ ] Customers cannot access admin/technician routes; customer order/invoice pages only show their own records.
- [ ] Product and package images load from persistent storage after a new deploy.
- [ ] PayMongo test payment and webhook produce the expected order transition and inventory deduction.
- [ ] Verification and password-reset emails arrive.
- [ ] Hostinger cron runs the Laravel scheduler and reminders/urgency escalation are verified.
- [ ] A recent database backup exists and its restore procedure has been tested.
