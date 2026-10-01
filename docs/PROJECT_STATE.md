# Project State

## Current phase

Phase 7: Reminders complete. Product feature implementation continues to Phase 8.

## Implemented

- Next.js App Router and TypeScript project shell.
- pnpm scripts for development, quality checks, builds, and Drizzle migrations.
- Tailwind CSS and shadcn/ui configuration with semantic design tokens.
- Zod-validated server environment and pooled Drizzle PostgreSQL client.
- Initial schemas for users, books, reading sessions, reminder preferences, and reminder deliveries.
- Auth.js adapter tables (accounts, sessions, verification_tokens).
- PostgreSQL/PgBouncer Docker Compose foundation.
- Vitest and Testing Library foundation.
- Architecture, database, design system, and phased implementation contracts.
- Auth.js with GitHub OAuth provider and database sessions.
- Protected routes with middleware-based authentication.
- Server-side user resolution via `getCurrentUser()` and `requireAuth()`.
- Sign-in page with GitHub OAuth.
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
- **Dashboard/UI layer**: Responsive desktop/mobile shell with sidebar/header/content layout (`DashboardLayout`, `Sidebar`, `Header`, `MobileNav`). Dashboard page (`DashboardContent`) showing current reading book as primary visual element, daily target progress, quick actions, queued books list, and recent sessions list. Sign-out via Server Action. Mobile-first responsive navigation with Sheet-based drawer.
- **Analytics domain layer**: `toUserTimezoneDate`, `getDayStartInTimezone`, `getDayEndInTimezone`, `groupSessionsByDay`, `calculateStreak`, `filterSessionsByDateRange`, `getWeeklyData`, `getMonthlyData`, `computeAnalytics`, `toUserDateString`, `getDateRangePreset` — all using user's IANA timezone.
- **Analytics application layer**: `GetAnalyticsUseCase` (presets: week/month/quarter/year/all + custom ranges), `GetStreakUseCase`, `GetDateRangeAnalyticsUseCase` with Zod validation.
- **Analytics infrastructure layer**: `DrizzleAnalyticsRepository` implementing `AnalyticsRepository` port with `findSessionsByUserId` and `findSessionsByUserIdAndDateRange`.
- **Analytics UI layer**: `DailyPagesChart` (area), `WeeklyChart` (bar), `MonthlyChart` (line) using Recharts; `StreakDisplay` cards. `AnalyticsPage` component fetching from `/api/analytics` and `/api/analytics/streak`.
- **Analytics API routes**: `GET /api/analytics` (with preset/date-range query params), `GET /api/analytics/streak` — both resolving user's timezone from profile.
- **Analytics Server Actions**: `getAnalytics`, `getStreak`, `getDateRangeAnalytics` using user's timezone.
- **Reminders domain layer**: `ReminderPreference` entity with HH:MM:SS time validation, enable/disable/time update methods; `ReminderDelivery` entity with status transitions (PENDING → SENT/FAILED/SKIPPED), retry logic, attempt counting; `ReminderPreferenceRepository` and `ReminderDeliveryRepository` ports.
- **Reminders application layer**: `GetReminderPreferenceUseCase`, `UpdateReminderPreferenceUseCase`, `GetReminderDeliveriesUseCase`, `ScheduleReminderDeliveryUseCase`, `ProcessReminderDeliveriesUseCase` (idempotent scheduling, preference-gated dispatch, batch processing), `RetryFailedDeliveriesUseCase` (max-attempt retry policy) with Zod validation.
- **Reminders infrastructure layer**: `DrizzleReminderPreferenceRepository` (upsert), `DrizzleReminderDeliveryRepository` (find by user/scheduled, pending before date, status, save many), `ResendEmailService` (HTML/text email templates, dashboard link).
- **Reminders UI layer**: `RemindersPage` with tabs for Settings and History; `ReminderSettingsForm` (enable toggle, time picker, toast notifications); `DeliveryHistory` (table with status badges, attempt count, error codes, provider message IDs).
- **Reminders API routes**: `GET/POST /api/reminders` (preference CRUD with Zod), `GET /api/reminders/deliveries` (paginated, filterable history), `GET /api/cron/reminders` (authenticated cron, Bearer token, processes pending deliveries in batches).
- **Reminders Server Actions**: `getReminderPreference`, `updateReminderPreference` (user-scoped, Zod-validated).

## Verification

- `pnpm verify`: passed (format, lint, typecheck, 147 tests, and production build).
- `docker compose config --quiet`: passed with an injected local development password.
- Baseline migration generation and SQL review: passed.
- Auth.js adapter migration generation and SQL review: passed.
- Migration application: applied to local PostgreSQL (all 3 migrations successful).

## Migrations

- `0000_giant_callisto.sql` - Baseline schema (users, books, reading_sessions, reminder_preferences, reminder_deliveries)
- `0001_burly_sasquatch.sql` - Auth.js adapter tables (accounts, sessions, verification_tokens)
- `0002_sly_fox.sql` - Schema adjustments (users.image, sessions primary key, reading_sessions FK)

## Tests

- Unit tests for `cn` utility (1 test)
- Unit tests for server auth utilities (4 tests: getCurrentUser null/session, requireAuth throws/returns)
- Unit tests for Book domain entity (25 tests: creation, validation, status transitions, progress, edge cases)
- Unit tests for Books application use cases (22 tests: all CRUD operations, validation, error cases, one-READING invariant)
- Unit tests for ReadingSession domain entity (9 tests: creation, validation, mood, reconstitution, persistence)
- Unit tests for Reading Sessions application use cases (26 tests: log reading, get sessions, recent sessions, daily target, validation, error cases, transactional invariant)
- Unit tests for Analytics domain (16 tests: timezone conversion, day boundaries, streak calculation, date-range filtering, weekly/monthly aggregation, computeAnalytics, presets)
- Unit tests for Analytics application use cases (4 tests: all sessions, preset range, custom range, Zod validation)
- Unit tests for Reminders domain (20 tests: preference creation/validation, enable/disable/time update, delivery creation/status transitions, attempt counting, retry logic)
- Unit tests for Reminders application use cases (20 tests: preference CRUD, delivery history, scheduling idempotency, processing with preference gating, batch size limits, retry logic with max attempts)
- All tests passing (147 total)

## Intentionally absent

- Redis.

## Known deployment inputs

- OAuth provider and credentials (GitHub).
- Public PgBouncer hostname and TLS certificate chain.
- Production secret-management mechanism and database credentials.
- Encrypted off-host backup destination and retention policy owner.
- Resend API key and verified sender domain.
- CRON_SECRET for authenticated reminder dispatch.

## Known issues

- Middleware uses deprecated file convention (Next.js warns but functions correctly).
- Build uses dummy DATABASE_URL and AUTH_SECRET; production requires real values.

## Next phase

Phase 8: Production hardening/deployment. Vercel reaches PgBouncer over verified TLS; migrations run once during deployment; observability and alerts cover app/database failures; encrypted off-host backups run automatically; a restore drill and production smoke test succeed.
