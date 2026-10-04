# Implementation Plan

## 1. Foundation

Status: complete.

Acceptance criteria: Next.js, TypeScript, pnpm, Tailwind, shadcn/ui configuration, Drizzle, linting, formatting, tests, environment validation, semantic tokens, Docker infrastructure, migration baseline, and architecture documentation exist; `pnpm verify` passes.

## 2. Database/auth

Acceptance criteria: PostgreSQL runs locally; committed migrations apply to a clean database; Clerk supports sign-up, sign-in, and sign-out; protected routes resolve a server-validated Clerk identity to the application's UUID user; ownership isolation has integration coverage.

## 3. Books

Acceptance criteria: authenticated users can create, view, queue, start, and complete their own books through application use cases; Zod validates mutations; the one-`READING` invariant is handled cleanly; no React component imports Drizzle.

## 4. Reading sessions

Acceptance criteria: users set a daily target and log pages/mood; session insertion and book progress update occur in one transaction with a row lock; submitted overruns are clamped; session history is immutable and covered by concurrency/invariant tests.

## 5. Dashboard/UI

Acceptance criteria: responsive desktop/mobile shell exists; current book and daily progress are primary; queue and recent activity are secondary; empty/loading/error states and keyboard/focus behavior meet the design contract.

## 6. Analytics

Acceptance criteria: streaks and charts derive from reading sessions using the user's timezone; date-range queries are tested around day boundaries; no duplicate counters are introduced without profiling evidence.

## 7. Reminders

Acceptance criteria: users can configure daily reminders; authenticated cron dispatch is idempotent; Resend delivery attempts are recorded without sensitive payloads; retries and failure visibility are tested.

## 8. Production hardening/deployment

Acceptance criteria: Vercel reaches PgBouncer over verified TLS; migrations run once during deployment; observability and alerts cover app/database failures; encrypted off-host backups run automatically; a restore drill and production smoke test succeed.
