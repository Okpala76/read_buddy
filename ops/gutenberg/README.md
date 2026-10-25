# Lightweight Gutenberg catalog — staged rollout

This replaces the Gutendex service with a small PostgreSQL table containing
only validated, directly downloadable EPUB references. It does not store EPUB
files, launch Docker containers, or change VPS SSH permissions.

## Import contract

Source records must come from Project Gutenberg's published catalog. For each
record, retain only Gutenberg ID, title, author, language, a real EPUB URL,
and optional cover URL. Validate the EPUB URL using a bounded HTTP request
before inserting; do not infer availability from metadata alone.

Use a separate staging table and transaction for imports. Cap batch sizes,
timeouts, disk consumption, and concurrency. Do not replace a healthy catalog
with an empty or partially downloaded import. Never execute bulk imports
inside a Vercel request.

## Rollout gate

The schema and read-only query implementation are preparatory only.
The importer, authenticated ingestion, EPUB-to-R2 download, and in-app EPUB
reader are not yet implemented. Do not expose the catalog search in
production until those pieces have passed end-to-end tests.

The current Gutendex PR #26 is superseded by this approach and should remain
unmerged.
