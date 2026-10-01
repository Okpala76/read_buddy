````md
## Database Migration Workflow

Use Drizzle migrations to keep the local and production database schemas synchronized.

Do not use `drizzle-kit push` in production.

### Local development

When the database schema changes:

```bash
pnpm db:generate
```
````

This generates a versioned migration file from the current Drizzle schema.

Apply the migration to the local PostgreSQL database:

```bash
pnpm db:migrate:local
```

Then verify the application:

```bash
pnpm verify
```

If everything passes, commit the schema and migration files:

```bash
git add .
git commit -m "db: add database migration"
git push
```

The normal local flow is:

```text
Update Drizzle schema
        ↓
pnpm db:generate
        ↓
Review generated migration SQL
        ↓
pnpm db:migrate:local
        ↓
pnpm verify
        ↓
Commit and push
```

### Production migration

Production migrations are run separately from the Vercel application deployment.

The production PostgreSQL server is not exposed directly to the internet, so first create the SSH tunnel to the VPS database.

Example:

```bash
ssh -L 55432:<POSTGRES_CONTAINER_IP>:5432 gochi@<VPS_IP>
```

Keep that SSH session open.

In another terminal, set the temporary production migration connection:

```bash
export PRODUCTION_DATABASE_URL='postgresql://read_buddy_admin:<PASSWORD>@127.0.0.1:55432/read_buddy'
```

Enable the explicit production safety confirmation:

```bash
export CONFIRM_PRODUCTION_MIGRATION=READ_BUDDY_PRODUCTION
```

Run:

```bash
pnpm db:migrate:prod
```

Only unapplied versioned migrations are executed.

After the migration succeeds, remove the temporary production credentials from the shell:

```bash
unset PRODUCTION_DATABASE_URL
unset CONFIRM_PRODUCTION_MIGRATION
```

The production flow is therefore:

```text
Migration committed to Git
        ↓
Create SSH tunnel
        ↓
Set temporary admin DATABASE URL
        ↓
pnpm db:migrate:prod
        ↓
Drizzle checks migration history
        ↓
Apply only missing migrations
        ↓
Production PostgreSQL updated
```

### Important rules

- Never use `drizzle-kit push` against production.
- Always generate and review migration SQL before applying it.
- Test migrations locally first.
- Production migrations use `read_buddy_admin`.
- The live Vercel application uses `read_buddy_app`.
- Never place the admin database credentials in Vercel.
- PostgreSQL port `5432` remains private.
- Production migrations connect through the temporary SSH tunnel.

```

```
