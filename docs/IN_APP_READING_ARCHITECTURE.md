# In-app reading architecture — staged delivery

## Product boundary

Reading Buddy is a **reading-consistency product**, not a Kindle replacement.
A user adds a book through **Physical / personal upload / discover free books**.
One library book may have an optional digital edition. The existing physical
book and manual progress experience must not change for historical users.

Reading evidence is distinct from origin:
- **Off-app / self-reported**: existing physical-book workflow and, later,
  deliberate manual hybrid logging.
- **In-app / page-confirmed**: an explicit confirmation action in the reader.
  Page navigation, scrolling, time-on-screen, and background activity never
  count toward progress or a streak.

Streaks remain user-level and daily, regardless of evidence type. Future friend
features may show evidence labels; they should not describe confirmations as
proof that someone genuinely read or understood content.

## Phase 1 schema foundation

- `books` remains the canonical library record and retains existing ownership,
  status, progress, and historical sessions.
- `book_documents` is an optional **one digital reference per book**. It carries
  format, private storage key, file metadata, and optional PDF page count.
  Existing books have no document. A book with a document may still be read
  physically in hybrid mode.
- `confirmed_book_pages` stores one explicit acknowledgement per document
  page, with uniqueness to prevent reread duplication. Neither opening a page
  nor navigating the reader writes this table.
- The existing `reading_sessions` model and analytics stay unchanged in the
  schema-foundation PR. This is intentional: page confirmations must not become
  streak-earning sessions until the transactional reader use case has been
  implemented and tested.

No production data is backfilled or reinterpreted by the foundation migration.
No PDF bytes are stored in PostgreSQL.

## Follow-up implementation order

1. Private Cloudflare R2 bucket; upload authorization; content validation;
   finalize/check object and authorized retrieval. A failed upload must not
   create a usable document record. Document ownership is enforced server-side.
2. PDF.js reader with explicit **Mark as Read & Continue** and a progress meter
   based only on confirmed pages. First-open guidance explains that navigation
   does not earn credit. Support image-only/scanned pages.
3. Transactional confirmation use case for a page: validate ownership,
   document bounds and book status; idempotently confirm; update canonical
   progress and record a streak-earning activity at most once for the relevant
   daily read. The existing daily streak derivation must remain intact.
4. EPUB (stable content locations rather than misleading device-dependent
   screen page numbers) and rights-compliant public-domain catalog integration.
5. Simple hybrid: digital edition becomes the canonical page reference, and
   self-reported physical reading enters the **digital equivalent** page.
   No automatic reconciliation, temporary unmatched pages, or OCR page mapping.

## Key decisions for UI/UX research

- Keep free page exploration, but display **Confirmed pages / Total** prominently.
- A first-use explanation and an always-accessible help affordance must clearly
  state that scrolling/swiping alone saves **no confirmed reading**.
- Support mobile touch targets, assistive technologies, zoom, landscape mode,
  safe areas, and large scanned PDFs on iPhone PWA.
- Clarify page-label offsets (PDF physical page index vs printed page numbers).
  Canonical location must be unambiguous.
- Do not award streak credit for an unconfirmed view, duplicate confirmation,
  or imported starting position.

## Release safety

This schema is additive. Ship its migration before any code that queries its
new tables. Keep production deployment gated by current GitHub Actions CI and
Hetzner migration reconciliation. No remote storage credential, destructive
migration, or production data modification is needed in the PR itself.
