# Upload-first books — Batch 2/6

Add Book offers Physical, PDF, and EPUB. Physical creation is unchanged. Digital creation uploads directly to private R2 staging, reads metadata on the server, lets the reader review/edit title and author, then saves the library book and attached document atomically. PDF pages come from the actual file; EPUBs do not ask for paper page counts. An absent digital author is stored as Unknown author. Files remain private and are not submitted to the free catalogue.

The upload cap remains 50 MB. PDF parsing rejects invalid/encrypted files. EPUB metadata extraction checks its mimetype, container and package, rejects unsafe paths/entity declarations, bounds metadata decompression, and does not execute book content. The server compares storage size/type and a SHA-256 digest, then seals an independent server-owned copy before committing library rows. Client-supplied page counts are ignored.

Each staged upload ID becomes one book ID. Row locking makes duplicate save requests return the same book. Book, document, initial PDF state and completion marker commit in one transaction; existing one-READING-book constraints remain authoritative. A concurrent active-book conflict can be retried into the queue without uploading again. New PDFs start at confirmed page 0/viewed page 1, so opening does not ask to align with a physical edition. No reading sessions or streak credit are created by an upload.

The existing internal books.total_pages nonzero constraint is retained: EPUB rows use the existing internal placeholder, while the library displays EPUB locations/percentage rather than that placeholder. Broader reader/session/progress alignment is Batch 3.

Uploads expire after 30 minutes. Closing a reviewed form requests best-effort cancellation of uncommitted staging/sealed files. Successful saves remove staging on a best-effort basis. Beginning a new upload also attempts cleanup of up to ten expired, uncommitted uploads owned by that reader. Browser/network interruptions can leave staging objects; this is not a scheduled bucket-wide garbage collector. Preserve the staging prefix for future lifecycle cleanup. Completed files are never removed by cancellation.

Apply committed migration 0022_digital_book_uploads through the existing production backup/reconciliation workflow before deployment. Historical migrations are unchanged. No new secrets or storage providers are required; the existing R2 token must allow private object read/write/delete and existing browser PUT CORS must remain configured.

Verification: pnpm verify, metadata/parser tests, action authentication/validation tests, UI upload/review/retry tests, and PostgreSQL atomicity/ownership/concurrency tests. Production smoke: Add Book → PDF/EPUB → choose a file → review details → add to queue/start reading → open the attached document. Verify physical creation, missing metadata, corrupt file errors and retry behaviour.
