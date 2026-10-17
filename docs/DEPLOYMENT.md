# Production Deployment

## Release Contract

Production releases follow one path:

```text
CI succeeds for the current main commit
  -> GitHub Production environment approval
  -> validate all committed and applied migration hashes
  -> if pending: verified local and encrypted off-host backup
  -> if pending: host lock + PostgreSQL advisory lock + transactional migrations
  -> build the exact commit with Vercel CLI
  -> deploy without assigning the production domain
  -> database-backed candidate health check
  -> promote the candidate
  -> canonical-domain health check
```

GitHub Actions concurrency permits one production release at a time. The VPS
reconciler independently uses `flock` and a PostgreSQL session advisory lock. Each
migration file and its history row run in one transaction. A failed migration rolls
back that file and prevents application deployment; earlier files completed in the
same release remain applied and are skipped safely on retry. A failed Vercel
deployment leaves the migrated, backward-compatible schema in place; rerunning the
release finds no pending migration and retries the application deployment.

The workflow always reconciles the full journal. It does not rely only on changed
files, so a pending migration from a skipped or failed release is rediscovered.

## One-Time Activation

These steps change production infrastructure or deployment behavior. Perform them
only in the approved activation window and in this order.

### 1. Configure encrypted off-host backups

Install `rclone` on the VPS. Configure an object-storage remote and an `rclone
crypt` remote named by `BACKUP_REMOTE`. Keep the rclone configuration readable
only by root. Enable object versioning and an object-lock/lifecycle policy retaining
daily database objects for at least 35 days. Do not put provider credentials in
Git, GitHub Actions, or `release.env`.

Copy `ops/vps/read-buddy-release.env.example` to
`/home/gochi/read_buddy/release.env`, set the crypt remote path, and install it as
`root:root` mode `600`. The example container/database/role names are the values
verified on the current VPS; re-audit them before copying this configuration to a
different host.

### 2. Install the fixed VPS commands

Review the files from the release commit before installation, then install:

```bash
sudo install -o root -g root -m 750 ops/vps/backup-database.sh \
  /home/gochi/read_buddy/bin/backup-database
sudo install -o root -g root -m 750 ops/vps/reconcile-migrations.sh \
  /home/gochi/read_buddy/bin/reconcile-migrations
sudo install -o root -g root -m 750 ops/vps/verify-backup-restore.sh \
  /home/gochi/read_buddy/bin/verify-backup-restore
```

The host requires Bash, Python 3, OpenSSL, `flock`, Docker, and `rclone`. Generate a
random migration-bundle HMAC key through a trusted channel, install it at the
`BUNDLE_HMAC_KEY_FILE` path as `root:root` mode `600`, and store the same value in
the GitHub environment secret described below. The key signs the release SHA and
archive; a stolen SSH deploy key therefore cannot fabricate migration SQL.

Create a dedicated `read_buddy_deploy` Unix account without Docker-group
membership. Its SSH key should use `restrict` (or explicit no-forwarding/no-PTY
options), and `/home/read_buddy_deploy/releases` must be owned by that account with
mode `700`. Grant passwordless sudo only for the fixed
`/home/gochi/read_buddy/bin/reconcile-migrations` command. The reconciler rejects
paths outside that staging root, non-commit directory names, invalid hashes, and
psql meta-commands. It verifies the HMAC before extracting the archive into a
root-owned temporary directory.

### 3. Harden database roles

Review `ops/vps/bootstrap-release-roles.sql`, then run it directly inside the
Reading Buddy PostgreSQL container as the current owner. It creates a read-only
backup role and removes cluster-wide superuser, role-creation, and database-creation
privileges from the existing migration owner. Confirm afterward:

- `read_buddy_admin` owns the Reading Buddy schemas/tables and can perform required
  DDL, but is not superuser, `CREATEDB`, `CREATEROLE`, replication, or `BYPASSRLS`.
- `read_buddy_backup` has `CONNECT`, schema usage, and read-only table/sequence
  privileges only for the Reading Buddy schemas, including matching defaults.
- `read_buddy_app` remains the only Vercel runtime role, has no DDL privileges, and
  has explicit current/default table and sequence grants. These grants must be
  recreated before a disaster restore made with `--no-owner --no-acl`.
- PostgreSQL port 5432 remains unpublished; migrations and backups use the local
  container socket, never PgBouncer.

### 4. Prove backup restoration

Run `backup-database`, confirm both local and off-host checksum verification, fetch
the stored object back, and run `verify-backup-restore` against it. The restore
drill creates a temporary PostgreSQL 16 container with no network and removes it on
exit. It never connects to or overwrites production.

Install and enable `ops/vps/read-buddy-backup.service` and
`ops/vps/read-buddy-backup.timer`. Verify the timer and the first service result.
Alert on a failed unit and on a backup age greater than 26 hours.

### 5. Configure GitHub

Keep the existing `main` ruleset checks `Verify` and `Database integration`.
Configure the `Production` environment to allow only `main`, add required reviewers,
prevent administrator bypass where the repository plan permits it, and add:

| Type                 | Name                              | Purpose                                     |
| -------------------- | --------------------------------- | ------------------------------------------- |
| Environment secret   | `PRODUCTION_SSH_PRIVATE_KEY`      | Dedicated deploy account key                |
| Environment secret   | `PRODUCTION_SSH_KNOWN_HOSTS`      | Pinned VPS host key from a trusted channel  |
| Environment secret   | `MIGRATION_BUNDLE_HMAC_KEY`       | Same random key as the root-only VPS file   |
| Environment secret   | `VERCEL_TOKEN`                    | Narrowly scoped Vercel deployment token     |
| Environment secret   | `PRODUCTION_HEALTH_CHECK_SECRET`  | Authenticates the database-backed probe     |
| Environment secret   | `VERCEL_AUTOMATION_BYPASS_SECRET` | Optional deployment-protection health check |
| Environment variable | `PRODUCTION_SSH_HOST`             | VPS SSH hostname or address                 |
| Environment variable | `PRODUCTION_SSH_PORT`             | SSH port, normally `22`                     |
| Environment variable | `PRODUCTION_SSH_USER`             | `read_buddy_deploy`                         |
| Environment variable | `VERCEL_ORG_ID`                   | Vercel team ID                              |
| Environment variable | `VERCEL_PROJECT_ID`               | Reading Buddy project ID                    |

The workflow has only `contents: read` and `actions: read`. It uses strict host-key
checking, commit-pinned third-party Actions, and step-scoped deployment secrets. It
never sends database credentials to GitHub or Vercel.

### 6. Hand production deployment control to GitHub Actions

Vercel currently deploys `main` immediately through its Git integration. Before
merging the CD workflow, set the project's Ignored Build Step command to:

```bash
bash scripts/vercel-ignore-build.sh
```

The script returns Vercel's skip code for `main` and build code for every other
branch. This preserves pull-request previews while preventing an uncontrolled
production deployment race. Confirm the setting through the Vercel API as
`commandForIgnoringBuildStep`, and test one preview build. Do not unlink the GitHub
integration.

Set `HEALTH_CHECK_SECRET` in Vercel's Production environment to the same value as
GitHub's `PRODUCTION_HEALTH_CHECK_SECRET`. The endpoint rejects unauthenticated
requests before acquiring a database connection.

The Actions workflow uses Vercel CLI 62.1.0 to pull production settings, build the
checked-out SHA, deploy it with `--skip-domain`, verify `/api/health`, and only then
promote it to the production domain.

## Routine Operation

An eligible successful `CI` run on `main` starts the release. Approve it in the
GitHub `Production` environment. Useful manual modes are:

```bash
gh workflow run deploy.yml --ref main --field mode=status-only
gh workflow run deploy.yml --ref main --field mode=migrations-only
gh workflow run deploy.yml --ref main --field mode=release
```

Manual runs reject a non-current commit and require a successful CI run for the
same SHA. `status-only` never backs up or writes. `migrations-only` is for controlled
recovery and does not deploy Vercel. `release` safely resumes any partial release.

## Failure And Recovery

- **SSH or host-key failure:** no database or Vercel action occurs. Correct the
  pinned key or connectivity and rerun.
- **History mismatch:** stop. Do not edit `drizzle.__drizzle_migrations`. Compare
  the deployed commit, journal timestamps, and SQL hashes, then document and review
  a repair.
- **Backup or off-host verification failure:** no migration runs. Preserve the
  local backup, repair storage, and rerun.
- **Lock conflict:** exit code 75 means another migration/backup owns the lock.
  Inspect that run; never remove a lock file to interrupt an active process.
- **Migration failure:** PostgreSQL rolls back the migration transaction. Diagnose
  on a disposable restored database, commit a forward fix if necessary, and rerun.
- **Vercel build/candidate health failure:** the production alias remains on the
  old release. Fix or rerun; already applied migrations are skipped after hash
  validation.
- **Canonical health failure after promotion:** stop automated actions. Inspect
  Vercel and database health. Promote the prior Vercel deployment only if its code
  is compatible with the current schema. Never reverse schema blindly.

Application rollback and database rollback are separate. Prefer a forward
application fix. Restore a database backup only for actual data-loss recovery,
because restoration discards all writes after the selected recovery point.

## PR #12 Rollout

PR #12 adds `0010_preserve_removed_books.sql`, a nullable `books.removed_at`
column. It is additive and the old application ignores it, so it is suitable for
migrate-before-deploy ordering.

After this CD pull request is merged and activation is verified:

1. Rebase PR #12 on the activated `main` branch; do not alter the already reviewed
   `0010` SQL or journal timestamp without regenerating and reviewing metadata.
2. Run CI and confirm the disposable migration tests include `0010`, repeated
   reconciliation, and the reading-history regression tests.
3. Merge PR #12 only after explicit production approval.
4. Approve the production release. Confirm the log reports ten applied and one
   pending migration, then a verified backup, migration success, candidate health,
   promotion, and canonical health.
5. Verify `books.removed_at` is nullable, migration history has one `0010` row,
   existing book/session counts are unchanged, and removing a controlled active
   book preserves its reading sessions.

Do not manually apply `0010` before this sequence, merge PR #12 while Vercel still
auto-deploys `main`, or restore production as a rollout test.
