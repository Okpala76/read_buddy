# Database

## Model

All IDs are UUIDs and all event timestamps are stored as `timestamptz` in UTC.

### `users`

Application owner record with a UUID primary key, unique Clerk user mapping, normalized unique email, profile fields, IANA timezone, daily page target, and timestamps. Feature tables reference the UUID; Clerk's string user ID is resolved only at the authentication boundary.

### `books`

User-owned books with page progress and `QUEUED`, `READING`, or `COMPLETED` state. Constraints require positive total pages, bound current page to the book, and keep completion timestamp/page state consistent. A partial unique index on `user_id WHERE status = 'READING'` enforces one active reading book per user.

### `reading_sessions`

Append-only reading history. The composite foreign key `(book_id, user_id)` ensures a session cannot reference another user's book. Checks require a forward page range and `pages_read = end_page - start_page`. Analytics query this table by `(user_id, read_at)`.

### `reminder_preferences`

One row per user. `reminder_time` is a local wall-clock time interpreted using the user's IANA `users.timezone`; the enabled flag uses a PostgreSQL boolean. Raw UTC offsets are not accepted because they do not model daylight-saving transitions.

### `reminder_deliveries`

Delivery audit/idempotency records. `scheduled_for` is the absolute UTC instant produced from the user's local date, reminder time, and IANA timezone. `(user_id, scheduled_for)` is unique, and status/schedule plus status/retry indexes support worker scans. Scheduling uses a 15-minute grace window and conflict-safe insertion.

Dispatch transitions due `PENDING` rows and eligible `FAILED` retries to `PROCESSING` through a bounded `FOR UPDATE SKIP LOCKED` claim. `locked_at` identifies the claim and supports recovery after 10 minutes; terminal updates must match the original claim timestamp. `next_attempt_at` schedules bounded retries. `skip_reason` records pre-send suppression separately from sanitized provider `error_code`, and `attempt_count` changes only after an actual provider call.

`recipient_email`, `book_title`, `book_current_page`, `book_total_pages`, and `daily_page_target` form the minimal immutable email snapshot. They keep the Resend request stable across attempts without storing rendered HTML, text, or full provider responses.

### `push_subscriptions`

User-owned browser/device Web Push subscriptions. Each endpoint is globally unique and stores its `p256dh` and `auth` encryption keys, optional user agent, lifecycle timestamps, and soft-revocation timestamp. A user may have multiple active endpoints, while atomic endpoint upsert prevents duplicates and reassigns a shared browser endpoint to the currently authenticated internal user UUID only when its stored encryption keys prove possession. The user FK cascades on account deletion, and `user_id` is indexed for future user-scoped delivery scans.

## Migration workflow

```text
edit schema
  -> pnpm db:generate
  -> review generated SQL and constraints
  -> pnpm verify
  -> commit schema and migration together
  -> pnpm db:migrate in deployment
```

Never use `drizzle-kit push` against production. Take a backup before destructive migrations, make large changes expand-and-contract, and run migration jobs once rather than from every Vercel instance.

## Connections

- Local: Next.js connects directly to Docker PostgreSQL with TLS disabled on loopback.
- Production: Vercel uses a TLS `DATABASE_URL` for VPS PgBouncer and sets `DATABASE_SSL=verify-full` plus `DATABASE_CA_CERT` when using a private CA.
- PgBouncer uses transaction pooling. Do not rely on session-level state, temporary tables across transactions, or session advisory locks.
- Keep `DATABASE_POOL_MAX` low for Vercel instances; start at 2 to 5 and size PgBouncer/PostgreSQL from observed concurrency.

The VPS must expose only PgBouncer, never PostgreSQL. Use a valid server certificate, strong SCRAM credentials, host firewall rules, automated security updates, and Vercel Secure Compute/static egress if IP allowlisting is required.

## Backup and restore

Recommended baseline:

- Nightly custom-format logical backup with `pg_dump -Fc` to storage outside the VPS.
- Encrypt backups, retain daily copies for 14 days and monthly copies according to business needs.
- Monitor backup age and command exit status.
- Run a quarterly restore drill against a separate database.

Example commands, run from a trusted host with secrets provided by its environment:

```bash
pg_dump --format=custom --no-owner --file="read_buddy_$(date +%F).dump" "$DATABASE_URL"
createdb read_buddy_restore_test
pg_restore --no-owner --exit-on-error --dbname="$RESTORE_DATABASE_URL" read_buddy_YYYY-MM-DD.dump
```

After restore, run migration status checks, verify row counts and constraints, and execute an application smoke test before declaring the backup usable.

## Open database decisions

- The production hostname, certificate authority, and backup destination are deployment-specific.
- Legacy Auth.js adapter tables are retained temporarily for rollback and require a later cleanup migration.
- Before the first migration is considered shipped, use the generated SQL review to correct any portability or operational concerns.
