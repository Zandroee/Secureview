# IT expert evaluation remediation

This checklist separates code changes from checks that require a browser, an authorized staging environment, or the Hostinger account. It must not be treated as production sign-off until the manual checks are recorded.

## Addressed in the remediation branch

- [x] Add responsive expand/collapse controls to public Products and Packages filters. Filters start closed on narrow viewports and open on desktop; the control reports its expanded state to assistive technology.
- [x] Collapse duplicate product/package category and brand filter labels that differ only by case or repeated whitespace.
- [x] Normalize repeated whitespace in product/package category labels when they are saved through admin forms.
- [x] Reject stock quantities outside 0–100,000 on the admin product endpoints and validate inline inventory edits in the browser.
- [x] Add keyboard focus styling to public catalog controls for light and dark themes.
- [x] Reserve mobile bottom space for the floating chatbot launcher.
- [x] Add a branded 404 page with navigation links and a feature test.
- [x] Add a low-impact k6 public-page smoke/load script whose default target is localhost.
- [x] Document a safe database restore drill using a temporary, separate database.

## Requires CI and review

- [ ] GitHub Actions passes the Laravel tests and Vite production build for this branch.
- [ ] PR review confirms no production credentials, environment files, database dumps, or production artifacts were introduced.
- [ ] Test category display/matching with existing data that has inconsistent capitalization and spacing.
- [ ] Verify browser validation and server validation for negative, fractional, empty, and excessive stock values.

## Requires browser/manual testing

- [ ] Test Products and Packages on desktop, 768 px, 390 px, and 320 px viewport widths; verify filters can be opened/closed without losing selections and keyboard focus remains visible.
- [ ] Test principal routes in light and dark themes using keyboard only; review contrast, heading order, page title, landmarks, labels, focus order, and zoom/reflow.
- [ ] Verify the chatbot launcher does not obscure essential actions or footer links on real mobile devices and with browser safe areas.
- [ ] Confirm customer, technician, and admin access boundaries using separate test accounts. Review which details are needed for an assigned service and do not expose payment method data unnecessarily.
- [ ] Run the k6 script against local or staging first. Do not run it against production without authorization and a monitoring plan.
- [ ] Run dependency security checks (Composer and npm audit) and review actionable advisories.

## Requires Hostinger access

- [ ] Confirm a fresh SQL export exists and a second protected copy is stored outside Hostinger.
- [ ] Import the export into a separately named temporary database and verify the restored table set.
- [ ] If required, connect an isolated staging copy of the app to the restored database with outbound mail/payment actions disabled.
- [ ] Verify scheduler output/logs and expected task execution, not just the scheduled-task list.
- [ ] Check production /up, compiled asset URLs, public product/package images, login/logout, role-boundary behavior, and email verification/reset.
- [ ] Keep the existing payment-webhook deployment backup until its intended payment regression checks have passed; keep PayMongo in Test mode for the capstone presentation as configured.

## k6 public-page smoke/load check

The script at tests/load/public-smoke.js only sends GET requests to the health check and public-facing routes. It defaults to http://127.0.0.1:8000.

PowerShell local example:

    php artisan serve
    # In another PowerShell window:
    k6 run tests/load/public-smoke.js

For an explicitly approved staging environment:

    $env:BASE_URL = "https://your-staging-host.example"
    k6 run tests/load/public-smoke.js
    Remove-Item Env:BASE_URL

Do not substitute the production URL unless the site owner has approved the test and someone is monitoring server and hosting metrics.
