# Production Migrations

Production migrations are approval-gated and coordinated with Vercel by
`.github/workflows/deploy.yml`. They do not use the runtime PgBouncer pool.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for setup, operation, recovery,
backup, restore, and rollback procedures.

To request migration-only reconciliation for the current `main` commit:

```bash
CONFIRM_PRODUCTION_MIGRATION=READ_BUDDY_PRODUCTION pnpm db:migrate:prod
```

This command dispatches the GitHub workflow. It does not connect to PostgreSQL
from the development machine.
