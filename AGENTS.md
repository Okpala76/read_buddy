# Read Buddy Engineering Contract

## Scope

Read Buddy is a single Next.js App Router application backed by PostgreSQL. Build one phase at a time from `docs/IMPLEMENTATION_PLAN.md`. Do not implement later phases opportunistically.

## Commands

- Install with `pnpm install`.
- Run locally with `pnpm dev`; PostgreSQL runs through Docker Compose.
- Before handing off work, run `pnpm verify`.
- Generate migrations with `pnpm db:generate`, review generated SQL, then commit it.
- Apply committed migrations with `pnpm db:migrate`.
- Never use `drizzle-kit push` as a production migration workflow.

## Boundaries

- Organize product code under `src/features/<feature>`.
- Domain modules contain plain TypeScript and must not import React, Next.js, Drizzle, or database schemas.
- Application modules coordinate use cases and define ports needed by the domain.
- Infrastructure modules implement persistence and external-service ports.
- UI modules render state and invoke application use cases; React components never call Drizzle directly.
- Use Server Actions for authenticated internal mutations. Use Route Handlers only for real HTTP boundaries such as auth callbacks, cron, and webhooks.
- Parse every untrusted runtime boundary with Zod.
- Keep server-only code out of client component dependency graphs.

## Data rules

- Scope every user-owned query by the authenticated user ID.
- A user can have at most one `READING` book; the database partial unique index is authoritative.
- Log reading in a PostgreSQL transaction that locks the current book row, clamps the end page to `total_pages`, inserts the historical session, and updates/completes the book.
- Store `start_page`, effective `end_page`, and actual `pages_read`; never store the submitted overrun.
- Derive analytics from `reading_sessions` until profiling demonstrates a need for a read model.
- Store timestamps in UTC and evaluate daily boundaries in the user's IANA timezone.
- Do not hard-delete books that have reading history.

## UI rules

- Use components from `src/components/ui` and semantic tokens from `src/app/globals.css`.
- Do not scatter literal color utilities through feature UI.
- Use Lucide for icons and preserve accessible names, keyboard behavior, focus states, and reduced-motion preferences.
- Desktop product layouts use sidebar, header, and content regions. Mobile product layouts use a compact header and mobile navigation.
- Keep the current reading book visually primary when the dashboard phase begins.

## Operations

- Keep secrets outside Git and document new variables in `.env.example`.
- Vercel connects to PgBouncer over TLS; PgBouncer connects to PostgreSQL on the VPS private Docker network.
- Keep database pools small in serverless functions. Do not add Redis without a measured PostgreSQL limitation.
- Backups are not complete until a restore test succeeds.
