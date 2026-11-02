# Reader alignment — Batch 3/6

Uploaded and catalogue EPUBs use the same reader; PDFs and EPUBs share header/navigation components and a Finish / Close flow. PDF pages remain fixed; EPUB locations remain reflow-safe. Both preserve a viewing position independently from confirmed reading.

EPUB navigation saves its CFI bookmark without recording a session. Finish / Close asks for the last completed location, or lets the reader close without logging. At the end, an explicit finished-book confirmation is required. The final location alone does not imply the last content was read. One generated location spans a fixed character interval; locations are not presented as paper pages.

Confirmed EPUB progress is monotonic and separate from the last viewed position. Confirmation locks the owned book and its EPUB state, validates reached locations, records only the new delta, and deduplicates concurrent confirmations. A positive EPUB delta records locations_read with pages_read/start_page/end_page all zero. Physical/PDF page constraints remain unchanged. Session history labels locations accurately; page totals are not inflated. These sessions qualify for reading-day streaks, the first-daily-reading celebration, nudges and 10/50/100-day milestones through the existing shared mechanisms.

The library and dashboard show confirmed EPUB percentage. The dashboard recognizes an EPUB reading day even when no paper/PDF pages were logged. EPUB books route readers to the digital reader instead of the physical-page form, and manual page mutations reject EPUB documents on the server. Bookmarks remain available for queued and completed books; new reading sessions require READING status.

Completing either digital format marks the book COMPLETED and frees the one-active-book slot. A completed_via_document marker permits this while preserving a physical edition's independent saved page. PDF completion does not overwrite that physical cursor. Existing internal EPUB page placeholders never become reading credit. A fresh rereading/reset workflow is not introduced; confirmed digital progress remains furthest-position progress.

## Migration and history

Apply committed migration 0023_confirmed_digital_reading before deploying. It adds EPUB confirmed state, reading-session location deltas, and the digital-completion marker. Existing EPUB bookmarks become a progress baseline without creating historical sessions, streak credit or notifications. Historical physical/PDF sessions and physical cursors remain intact. Legacy EPUBs at the final baseline can be explicitly marked finished without fabricating a new session.

Use the existing backup/migration reconciliation/release pipeline; never schema push. Run pnpm verify and database CI. PostgreSQL tests cover EPUB units, ownership, unseen-location rejection, duplicate confirmations, explicit completion, daily celebration/streak credit, and PDF completion with an independent physical cursor.

Production checks: add/open a catalogue or uploaded EPUB; navigate and close without logging (bookmark only); reopen and confirm a session (location history/streak/celebration); reopen at the saved view while confirmed progress stays intact; explicitly finish at the end. For a PDF, confirm the last page and check completed status and preservation of any physical cursor. Compare reader headers/footers on mobile and desktop.
