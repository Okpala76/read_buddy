# Project State

## Current phase

Phase 7: Reminders complete. Timezone-aware scheduling, concurrency-safe dispatch, deterministic Resend requests, provider idempotency, bounded retries, production migrations, deployment, and protected VPS scheduling are implemented and verified.

## Implemented

- Next.js App Router and TypeScript project shell.
- pnpm scripts for development, quality checks, builds, and Drizzle migrations.
- Tailwind CSS and shadcn/ui configuration with semantic design tokens.
- Zod-validated server environment and pooled Drizzle PostgreSQL client.
- Initial schemas for users, books, reading sessions, reminder preferences, and reminder deliveries.
- Legacy Auth.js adapter tables retained for rollback (accounts, sessions, verification_tokens).
- PostgreSQL/PgBouncer Docker Compose foundation.
- Vitest and Testing Library foundation.
- Architecture, database, design system, and phased implementation contracts.
- Clerk authentication linked to the configured Clerk application.
- Protected routes with Clerk proxy authentication.
- Server-side Clerk identity resolution to local UUID users via `getCurrentUser()` and `requireAuth()`.
- Clerk sign-in and sign-up pages with visible landing-page controls.
- Dynamic dashboard page showing authenticated user.
- Books domain layer: `Book` entity with status transitions (QUEUED → READING → COMPLETED), progress tracking, business rule validation.
- Books application layer: use cases for create, list, get current reading, start, update progress, complete, requeue, delete with Zod validation.
- Books infrastructure layer: `DrizzleBookRepository` implementing the repository port.
- Books UI layer: `BooksPage` component with `BookCard`, `BookList`, `CreateBookForm`; Server Actions for all mutations.
- Zod validation at all runtime boundaries (Server Actions, use case inputs).
- Ownership isolation: all queries and mutations scoped to authenticated user ID.
- One-READING invariant enforced at domain and application layers.
- **Reading Sessions domain layer**: `ReadingSession` entity with mood tracking, page range validation, immutable session records.
- **Reading Sessions application layer**: `LogReadingUseCase` (transactional session logging with book progress update), `GetReadingSessionsUseCase`, `GetRecentSessionsUseCase`, `GetDailyTargetUseCase`, `UpdateDailyTargetUseCase` with Zod validation.
- **Reading Sessions infrastructure layer**: `DrizzleReadingSessionRepository` with transactional `logReadingSession` using row-level locking (`FOR UPDATE`), overrun clamping, and atomic book progress update.
- **Reading Sessions UI layer**: `ReadingPage` with `LogReadingForm` (mood selector, page input with daily target hint), `SessionList` with mood badges; Server Actions for all mutations.
- **Dashboard/UI layer**: Responsive desktop/mobile shell with sidebar/header/content layout (`DashboardLayout`, `Sidebar`, `Header`, `MobileNav`). Dashboard page (`DashboardContent`) showing current reading book as primary visual element, daily target progress, quick actions, queued books list, and recent sessions list. Clerk user and sign-out controls. Mobile-first responsive navigation with Sheet-based drawer.
- **Analytics domain layer**: `toUserTimezoneDate`, `getDayStartInTimezone`, `getDayEndInTimezone`, `groupSessionsByDay`, `calculateStreak`, `filterSessionsByDateRange`, `getWeeklyData`, `getMonthlyData`, `computeAnalytics`, `toUserDateString`, `getDateRangePreset` — all using user's IANA timezone.
- **Analytics application layer**: `GetAnalyticsUseCase` (presets: week/month/quarter/year/all + custom ranges), `GetStreakUseCase`, `GetDateRangeAnalyticsUseCase` with Zod validation.
- **Analytics infrastructure layer**: `DrizzleAnalyticsRepository` implementing `AnalyticsRepository` port with `findSessionsByUserId` and `findSessionsByUserIdAndDateRange`.
- **Analytics UI layer**: `DailyPagesChart` (area), `WeeklyChart` (bar), `MonthlyChart` (line) using Recharts; `StreakDisplay` cards. `AnalyticsPage` component fetching from `/api/analytics` and `/api/analytics/streak`.
- **Analytics API routes**: `GET /api/analytics` (with preset/date-range query params), `GET /api/analytics/streak` — both resolving user's timezone from profile.
- **Analytics Server Actions**: `getAnalytics`, `getStreak`, `getDateRangeAnalytics` using user's timezone.
- **Reminders domain layer**: guarded `PENDING → PROCESSING → SENT/FAILED/SKIPPED` transitions, claim recovery, skip reasons, and provider-attempt accounting.
- **Reminders application layer**: preference/settings and delivery-history use cases, timezone-aware scheduling, stale-claim recovery, atomic batch claiming, current-state eligibility checks, bounded retry policy, sanitized failure handling, and claimed-delivery processing.
- **Reminders infrastructure layer**: transactional preference/timezone persistence, tenant-scoped history, idempotent scheduling, PostgreSQL `FOR UPDATE SKIP LOCKED` claiming, guarded terminal writes, and an official-SDK `ResendEmailService` with deterministic provider idempotency keys and HTML/text payloads.
- **Reminders UI layer**: `RemindersPage` with tabs for Settings and History; `ReminderSettingsForm` (enable toggle, time picker, toast notifications); `DeliveryHistory` (table with status badges, attempt count, error codes, provider message IDs).
- **Reminders API routes**: `GET/POST /api/reminders` (preference and IANA timezone settings), `GET /api/reminders/deliveries` (tenant-scoped, paginated, filterable history), `GET /api/cron/reminders` (authenticated scheduling, stale recovery, atomic claiming, eligibility checks, and dispatch).
- **Reminders Server Actions**: `getReminderPreference`, `updateReminderPreference` (user-scoped, Zod-validated).
- **Resend production provider**: verified sending domain, domain-scoped send-only key, Vercel production variables, and one delivered controlled test email.
- **Production reminder scheduler**: authenticated five-minute VPS cron with overlap protection, strict HTTPS invocation, protected secret storage, concise system logs, and no additional application checkout or service.
- **Production reminder acceptance**: one due occurrence reached `SENT` with one provider attempt, remained one row across later scheduler cycles, and was independently reported as `delivered` by Resend.

## Verification

- `pnpm verify`: passed (format, lint, typecheck, 200 tests, and production build).
- `docker compose config --quiet`: passed with an injected local development password.
- Baseline migration generation and SQL review: passed.
- Clerk user-mapping migration generation and SQL review: passed.
- Migration application: all committed migrations applied successfully to local PostgreSQL.
- Batch 3 reminder migrations applied successfully to local PostgreSQL.
- Batch 4 reminder snapshot/retry-index migration applied successfully to local PostgreSQL.
- All five committed migrations applied successfully to production PostgreSQL with no unknown migration hashes.
- Production reminder endpoint authentication passed unauthenticated (`401`) and authenticated (`200`) checks.
- PostgreSQL activity showed application connections using only `read_buddy_app`; Vercel Production has no admin database variable.
- Seven opt-in PostgreSQL concurrency integration tests passed against local PostgreSQL.

## Migrations

- `0000_stormy_colossus.sql` - Consolidated baseline schema, including legacy Auth.js adapter tables
- `0001_chilly_unus.sql` - Unique Clerk user ID mapping on application users
- `0002_sloppy_bullseye.sql` - Reminder `PROCESSING` status
- `0003_nice_bromley.sql` - Reminder claim, future retry, and skip metadata
- `0004_oval_sway.sql` - Deterministic email snapshot and retry scan index

## Tests

- Unit tests for `cn` utility (1 test)
- Unit tests for server auth utilities (5 tests: anonymous/existing/provisioned users and requireAuth behavior)
- Unit tests for Book domain entity (25 tests: creation, validation, status transitions, progress, edge cases)
- Unit tests for Books application use cases (22 tests: all CRUD operations, validation, error cases, one-READING invariant)
- Unit tests for ReadingSession domain entity (9 tests: creation, validation, mood, reconstitution, persistence)
- Unit tests for Reading Sessions application use cases (26 tests: log reading, get sessions, recent sessions, daily target, validation, error cases, transactional invariant)
- Unit tests for Analytics domain (16 tests: timezone conversion, day boundaries, streak calculation, date-range filtering, weekly/monthly aggregation, computeAnalytics, presets)
- Unit tests for Analytics application use cases (4 tests: all sessions, preset range, custom range, Zod validation)
- Reminder domain and application tests cover guarded state transitions, timezone settings, due-window scheduling, retry delays, eligibility suppression, crash recovery identity, and attempt accounting.
- Reminder provider tests cover Resend envelopes, deterministic HTML/text payloads and idempotency keys, provider IDs, controlled missing configuration, and sanitized transient/permanent classification.
- Reminder infrastructure integration tests use local PostgreSQL to verify concurrent initial/retry claims, terminal-state exclusion, stale recovery, claim-token protection, active-book checks, and timezone-aware reading suppression.
- Reminder UI and cron tests cover settings validation, authenticated scheduling, and dispatch sequencing.
- All regular tests passing (200 total); 7 PostgreSQL concurrency tests pass through the explicit local integration command.

## Intentionally absent

- Redis.

## Known deployment inputs

- Clerk production instance and production publishable/secret keys.
- Public PgBouncer hostname and TLS certificate chain.
- Production secret-management mechanism and database credentials.
- Encrypted off-host backup destination and retention policy owner.

## Known issues

- Build uses a dummy `DATABASE_URL`; production requires a real value.

## Next phase

Phase 8: Production hardening/deployment. Vercel reaches PgBouncer over verified TLS; migrations run once during deployment; observability and alerts cover app/database failures; encrypted off-host backups run automatically; a restore drill and production smoke test succeed.
