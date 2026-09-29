# Read Buddy

Architecture foundation for a small production reading application.

## Local setup

1. Copy `.env.example` to `.env` and replace local secrets as needed.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `pnpm install`.
4. Apply migrations with `pnpm db:migrate`.
5. Start Next.js with `pnpm dev`.

Run the complete quality gate with `pnpm verify`.

See `AGENTS.md` and `docs/IMPLEMENTATION_PLAN.md` before implementing product behavior.
