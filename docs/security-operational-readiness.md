# Security and operational readiness

This checklist is for SecureView's Laravel/Inertia application deployed on Vercel with an external database and PayMongo. It complements, rather than replaces, provider-specific documentation and an actual backup/restore test.

## 1. Production environment and secrets

In Vercel project settings, verify the production environment has:

- `APP_ENV=production`, `APP_DEBUG=false`, and the canonical HTTPS `APP_URL`.
- A generated `APP_KEY` stored only as an environment secret. Never regenerate it casually on a live deployment; doing so invalidates encrypted application data and sessions.
- `SESSION_DRIVER=database` (or another persistent supported store), `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`, and `SESSION_SAME_SITE=lax`.
- Persistent external database credentials, not the default SQLite database or function-local files. Use a dedicated database account with only the privileges the application requires.
- A PayMongo secret key and webhook signing secret from the correct environment. Keep test and live credentials separate; never log or commit either secret.
- Persistent object storage for catalog images, as described in [the Vercel deployment guide](vercel-deployment.md).

Only give production environment access to people who need it. If a secret is committed, printed in logs, or shared unintentionally, treat it as compromised and rotate it with the provider; deleting the visible copy is not enough.

## 2. Release checklist

Before deploying a feature branch to production:

1. Review the PR and confirm GitHub Actions passed, including `php artisan test` and `npm run build`.
2. Read every migration's `up()` and `down()` method. Prefer backward-compatible changes and identify changes that can lock or rewrite large tables.
3. Make a fresh database backup and confirm it completed successfully. For a schema-changing release, verify a restoration to a separate non-production database before relying on the backup.
4. Merge only the reviewed commit to `main`, wait for Vercel to report a completed deployment, and inspect its build/runtime logs.
5. Confirm the deployed application responds at `/up`, assets return HTTP 200, and login, admin authorization, a customer purchase page, and the main admin dashboard work.
6. For payment-related releases, run PayMongo test-mode checkout and webhook tests before switching to live credentials. A browser return URL is not proof of payment; only server-side PayMongo confirmation should mark an order paid.

Do not run `php artisan migrate:fresh` against any database containing real data. Do not run a migration from your local terminal unless you have verified which database the active environment points to. Production migrations should be applied once, deliberately, with the approved production configuration and backup in place.

## 3. Backups and recovery

- Configure database backups using the managed database provider or a controlled MySQL export process. Set a retention period that meets the business's recovery needs.
- Keep backup files outside the Git repository and restrict access to them. Backups contain customer details, addresses, order history, and operational data; protect them like production data.
- Record who can restore backups and where the required credentials are kept. Do not place passwords in shell history, source control, tickets, or screenshots.
- Test restoring a recent backup into a separate database periodically. A backup that has never been restored is not a verified recovery plan.
- Before a risky migration or bulk inventory/order operation, take an additional backup and write down the rollback/repair steps.

## 4. Payments, orders, and inventory monitoring

- Review Vercel runtime logs after deployment and investigate repeated 5xx responses or unexpected authentication failures.
- Confirm the PayMongo webhook URL is the intended HTTPS production URL and the webhook signing secret matches the configured endpoint. Investigate rejected signatures and repeated webhook failures.
- Reconcile PayMongo transactions against SecureView orders. Do not manually mark PayMongo orders paid just because a customer shows a success page or screenshot.
- Review failed/duplicate payment events, stock deduction errors, and unexpected order-state transitions. Preserve event/transaction history when investigating; do not repair production data with ad-hoc SQL without a backup and a documented reason.
- Check that email delivery works for account verification and password resets, and that reset/verification messages do not expose secrets in logs.

## 5. Scheduler and reminders

Laravel schedules are defined in `routes/console.php`, including upcoming-job reminders and overdue-inquiry urgency escalation. Vercel does not run a persistent Laravel scheduler process merely because these schedule definitions exist.

The application exposes `GET /api/scheduler/run` for a trusted cron integration. It fails closed unless the `CRON_SECRET` environment variable is configured and the caller sends the matching `Authorization: Bearer <CRON_SECRET>` header. The route returns only a generic status, never Artisan output or exception details, and disables response caching.

Setup:

1. Generate a random secret of at least 32 characters. Add it as `CRON_SECRET` in the Vercel **Production** environment variables; do not put the real value in Git or documentation.
2. Configure a scheduler to request `https://YOUR_DOMAIN/api/scheduler/run` using **GET** and the header `Authorization: Bearer YOUR_CRON_SECRET`.
3. Invoke it every minute so Laravel can evaluate its own schedule frequency. If using Vercel Cron, first check your plan's minimum interval: Vercel's Hobby plan currently allows only daily cron execution, while Pro and Enterprise support per-minute scheduling. See [Vercel Cron usage limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [how to secure cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs). On a plan that does not allow per-minute scheduling, use a trusted external scheduler that supports the required frequency.
4. After setting `CRON_SECRET`, redeploy if required for the production function to receive the environment value. Test the endpoint with the correct bearer token, check the runtime logs, and confirm reminder/urgency behavior using a controlled test record. Requests without a valid token must return HTTP 401.

Do not configure a cron to invoke this endpoint at an interval more frequent than your hosting plan allows. Do not expose an unauthenticated public route that triggers the scheduler.

## 6. Routine maintenance

- Keep Composer, npm, and GitHub Actions dependencies patched. Review automated dependency-update PRs and run the full CI checks before merging.
- Run `composer audit` and `npm audit` periodically, review the findings, and prioritize exploitable production dependencies rather than blindly forcing version upgrades.
- Review admin and technician account roles periodically; remove access when staff no longer need it and retain at least one tested, authorized admin account.
- Limit access to activity logs, production logs, backups, and invoice/profile exports. Never include customer passwords, session IDs, payment secrets, or full webhook signing headers in logs.
- After incidents, preserve relevant logs, rotate exposed credentials, review role changes and payment/order history, and document recovery actions.

## 7. Post-deployment smoke test

- [ ] `/up` responds successfully.
- [ ] Login and logout work; repeated invalid login attempts are throttled.
- [ ] Admin-only pages reject a non-admin account; technician-only pages reject a customer account.
- [ ] Customer order and invoice pages show only that customer's records.
- [ ] Product images load from persistent storage.
- [ ] PayMongo test payment and webhook produce the expected single order transition and inventory deduction.
- [ ] Verification/reset emails arrive.
- [ ] Scheduled reminders and overdue urgency escalation run in the deployed environment.
- [ ] A recent database backup exists and its restore procedure is known.
