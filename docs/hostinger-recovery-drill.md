# SecureView Hostinger recovery drill

This procedure verifies that a database export is usable without replacing or modifying the live SecureView database. Perform it during a quiet period and retain only the minimum test data needed for verification.

## Safety rules

- Never import a backup into the production database for a restore test.
- Create a separate temporary MySQL database and database user in Hostinger hPanel.
- Do not share SQL dumps, database passwords, environment files, customer records, or screenshots containing private values.
- Do not run destructive database commands against production.
- Test the application against a restored copy only if the temporary environment is isolated from the production URL, emails, and PayMongo webhook.

## A. Create and protect the backup

1. Export the current SecureView production database from phpMyAdmin using Export → Quick → SQL.
2. Confirm the browser downloaded a non-empty .sql file. Record the export time, file size, and approximate table count in your private operational log.
3. Store one restricted copy on your own computer and another copy outside the hosting account (for example, an encrypted drive or approved private storage).
4. Do not upload the dump to GitHub or send it through chat.

## B. Restore to a separate test database

1. In hPanel, create a temporary MySQL database such as a clearly labeled recovery-test database. Create a separate user with access to that database only.
2. Open phpMyAdmin for the temporary database and confirm its name before importing anything.
3. Use Import to load the SQL dump into the temporary database. Do not select the production database.
4. If phpMyAdmin reports size/time limits, stop and use Hostinger's documented database-import path or ask support; do not split or edit the dump blindly.
5. Confirm that the expected SecureView tables exist and that representative structural checks pass (for example, migration/session tables and core product/order tables). Avoid browsing or copying customer personal data unnecessarily.

## C. Verify application recovery safely

A database restore is not a full application restore. Also confirm a known-good release archive and the deployment backup directory exist.

If testing the restored database through Laravel, use a separate staging application or an isolated local copy with a temporary environment file. Point it only at the temporary database, disable outbound email, and ensure payment credentials/webhooks cannot make real changes. Never change the production external environment file just to test a restore.

Record:
- the backup filename, timestamp, and size (no credentials),
- whether import completed without errors,
- the number of tables restored,
- whether the isolated application can read the restored copy,
- any missing media/uploads (the database dump does not include uploaded image files),
- the time taken and any error messages with secrets/personal data removed.

## D. Clean up

After the restore has been verified and the result recorded, delete the temporary database/user through hPanel if no longer needed. Double-check the selected database name before any deletion. Retain the protected original backup according to the project's retention policy.

## Recovery acceptance criteria

- [ ] A recent SQL export exists outside the hosting account.
- [ ] The SQL export imports successfully into a separately named test database.
- [ ] The expected tables and key application structures are present.
- [ ] An isolated app can connect to the restored test copy without touching production.
- [ ] Database and uploads/media recovery are treated as separate items.
- [ ] Temporary test resources are removed safely.
