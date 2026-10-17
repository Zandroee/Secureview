# Technician workspace and job notifications

## Roles and access

- Administrators use the existing admin area to confirm inquiries and assign one or more technicians. All assigned technicians have equal status; no lead/helper hierarchy is used.
- Technicians use `/technician/dashboard`. Server-side middleware protects these routes; technician accounts are not allowed into admin-only user management, transaction logs, activity logs, product editing, or package management.
- Technicians see customer contact/location details only for jobs assigned to them. Available jobs show limited scheduling and service information until a technician joins the team.
- Any technician assigned to a job can start it and mark it completed, provided the job follows the normal status workflow.
- Stock changes are quantity adjustments with a required reason. Each adjustment is recorded in `inventory_adjustments`; administrators can review the history at `/admin/inventory-adjustments`.

## Job notifications

- Confirmation sends an upcoming-job notification to administrators and every assigned technician.
- Starting or completing a job notifies administrators and the other assigned technicians.
- The scheduler sends reminders about 24 hours and 1 hour before confirmed appointments. Reminder notifications are deduplicated per recipient and job.

## Enable the scheduler in deployment

Laravel's scheduler must be invoked by the hosting environment for reminders to run. Configure the server's cron to run the scheduler every minute:

```cron
* * * * * cd /path/to/Secureview && php artisan schedule:run >> /dev/null 2>&1
```

Replace `/path/to/Secureview` with the deployed project directory. For local development, `php artisan schedule:work` can be used while the application is running.

## Database migrations

Run `php artisan migrate` after deploying this feature. The multi-technician migration copies existing `technician_id` assignments into the new pivot table. The existing `technician_id` column is retained only for compatibility with older screens and does not designate a lead technician.
