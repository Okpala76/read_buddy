# ReadOn improvements — Batch 4/6

The offline screen checks a fresh, non-cached server response before returning to the last app path. Retry shows its pending state, prevents duplicate requests, handles failed connections, and retries when the device reconnects. Only app paths are accepted for recovery; query strings are never stored.

Shared buttons and existing feature controls now have press feedback that respects reduced motion. ReadOn branding is consistent across navigation, metadata, install prompts, notifications, and reminder copy. The landing page describes the shipped reading formats, catalogue, progress, friends, and notification features.

No database migration or schema change is required. Existing document progress and migration requirements remain unchanged. Admin controls and community book sharing remain separate batches.

Validation: pnpm verify; CI also runs the existing database integration suite. Focused tests cover connection probes, unsuccessful retries, duplicate requests, nonce validation, and safe recovery paths.
