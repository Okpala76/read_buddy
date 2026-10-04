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

One row per user. Reminder time is interpreted using `users.timezone`; the enabled flag uses a PostgreSQL boolean.

### `reminder_deliveries`

Delivery audit/idempotency records. `(user_id, scheduled_for)` is unique, and the status/schedule index supports worker scans. No provider payload or message body is persisted.

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
