# Project State

## Current phase

Phase 5: Dashboard/UI complete. Product feature implementation has not started.

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

## Verification

- `pnpm verify`: passed (format, lint, typecheck, 87 tests, and production build).
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
- **Unit tests for ReadingSession domain entity (9 tests: creation, validation, mood, reconstitution, persistence)**
- **Unit tests for Reading Sessions application use cases (26 tests: log reading, get sessions, recent sessions, daily target, validation, error cases, transactional invariant)**
- All tests passing (87 total)

## Intentionally absent

- Analytics feature (Phase 6).
- Reminders feature (Phase 7).
- Redis.

## Known deployment inputs

- OAuth provider and credentials (GitHub).
- Public PgBouncer hostname and TLS certificate chain.
- Production secret-management mechanism and database credentials.
- Encrypted off-host backup destination and retention policy owner.

## Known issues

- Middleware uses deprecated file convention (Next.js warns but functions correctly).
- Build uses dummy DATABASE_URL and AUTH_SECRET; production requires real values.

## Next phase

Phase 6: Analytics. Implement streaks and charts derived from reading sessions using the user's timezone; date-range queries tested around day boundaries; no duplicate counters introduced without profiling evidence.
