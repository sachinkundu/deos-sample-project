## 1. Project and Storage Foundation

- [x] 1.1 Create the Worker application structure, package scripts, and build configuration for a module Worker with built static assets, one `DB` D1 binding, one `BODIES` R2 binding, and an `ASSETS` binding; keep production deployment and CI configuration out of scope.
- [x] 1.2 Add the repeatable D1 migration for `snippet_operations` and `snippets`, including the approved constraints, deterministic-order indexes, capacity trigger, and activation trigger that aborts with `ACTIVATION_PRECONDITION_LOST` unless exactly one matching operation advances.
- [x] 1.3 Build test adapters for D1, R2, asset delivery, request gates, and injected response/store failures so lifecycle races and indeterminate outcomes can be exercised deterministically without adding background recovery behavior.

## 2. Worker API and Validation

- [x] 2.1 Implement Worker routing for the list, save, read, and delete endpoints, JSON `404`/`405` API responses with `Allow` headers, and `GET`/`HEAD` static fallback through `ASSETS.fetch` without allowing API paths or unsupported methods to receive the app shell.
- [x] 2.2 Implement the shared JSON error envelope and authoritative request validation: exact lowercase canonical UUIDv4 IDs before storage access, malformed and over-512-KiB request handling, field-specific blank checks, 200-byte UTF-8 titles, and 65,536-byte UTF-8 text while preserving accepted values exactly.
- [x] 2.3 Implement the D1-backed list query for active and incomplete-delete recovery items, ordered by `created_at DESC, id DESC`, exposing only public metadata and logging rather than returning inconsistent active operations.
- [x] 2.4 Implement the read route so it accepts only active operations, follows the indexed `object_key` into R2, returns the exact plain-text body, and reports missing rows, deleting records, missing objects, and storage failures without stale or internal data.
- [x] 2.5 Add API contract tests proving route/method isolation, validation and byte limits occur before D1/R2 access, list ordering and recovery projection are correct, reads use the D1-selected R2 key, and malformed or internal failures return action-specific non-success responses.

## 3. Replay-Safe Save Lifecycle

- [x] 3.1 Implement payload and body SHA-256 calculation, the isolated `snippets/<id>/<body-sha256>.txt` key, and the single conditional `creating` reservation insert with D1-owned timestamps and the 100-object, 1,048,576-byte, and 1,000-lifetime-operation limits.
- [x] 3.2 Implement the insert-winning owner path with exactly one R2 put of the body and SHA-256 custom metadata, followed by the guarded `INSERT ... SELECT` activation; retain the charged `creating` reservation and return `SAVE_IN_PROGRESS` after any unconfirmed put.
- [x] 3.3 Implement the permanently read/reconcile-only existing-operation path: reject mismatched, deleting, or deleted payloads; return an exact confirmed active replay; inspect but never write an exact creating object; and activate only an already confirmed matching object.
- [x] 3.4 Implement activation-loss handling that reloads authoritative state and returns success only for a matching confirmed active record, maps creating/deleting/deleted states to the approved conflicts, and treats absent or inconsistent state as an internal failure.
- [x] 3.5 Add save tests for first create, exact replay, payload conflict, absent and present creating-object reconciliation, R2 metadata confirmation, response loss, quota/trigger error mapping, and proof that rejected or over-capacity saves add no unreserved R2 data.
- [x] 3.6 Add the deterministic paused-owner race test: hold owner A before its sole put, prove exact retry B and concurrent DELETE cannot touch R2, let a reconciler activate A's completed object, delete it, then prove resumed A cannot report success or recreate the object and leaves reservation totals correct.
- [x] 3.7 Add deterministic tests that an activation-trigger mismatch rolls back the snippet insert and that a rejected/indeterminate owner put remains charged and delete-fenced until enough abandoned reservations produce the approved capacity response.

## 4. Forward-Only Delete Lifecycle

- [x] 4.1 Implement the guarded `active` to `deleting` transition that atomically copies `delete_title`, handles creating/unknown/already-deleting/already-deleted states, and reports `DELETE_INDEX_MISSING` without touching R2 when an active operation has lost its index row.
- [x] 4.2 Implement idempotent cleanup of every object under the snippet's isolated R2 prefix and its D1 index row, confirming both are absent before changing the operation to a zero-byte `deleted` tombstone, clearing `delete_title`, and returning `204`.
- [x] 4.3 Preserve `deleting`, its reservation, canonical ID, and copied title after any unconfirmed cleanup so list can expose an actionable recovery item and the same DELETE route can finish cleanup without restoring data or adding a recovery endpoint.
- [x] 4.4 Add delete tests for unknown and creating IDs, concurrent/idempotent calls, partial D1 or R2 failure, missing-index integrity faults, prefix pagination/cleanup, permanent replay fencing, and `204` only after D1-row and R2-prefix absence checks pass.

## 5. One-Screen Browser Experience

- [x] 5.1 Build the single desktop page with an accessible create form, D1-backed title list, selected-snippet reader, loading/empty states, and no login, sharing, search, rich-text, upload, or phone-layout features.
- [x] 5.2 Implement initial list loading and snippet selection through the API, rendering every saved title and body with text-safe DOM APIs in a whitespace-preserving reader, ignoring out-of-order reads, and clearing stale text on read failure or deletion.
- [x] 5.3 Implement client-side blank and UTF-8 byte validation, canonical UUID generation, the immutable pending save tuple, confirmed-save list/selection updates, form clearing only on success, and authoritative list/read refreshes after save.
- [x] 5.4 Implement save recovery messaging and controls for `SAVE_IN_PROGRESS`, `IDEMPOTENCY_CONFLICT`, shelf capacity, and activity capacity; “Check save” must reuse the immutable tuple, while “Start a new save” preserves fields, discards only the old ID, and warns that the old attempt was not canceled and may still finish.
- [x] 5.5 Implement delete interaction state separately from persisted `deletePending`: show and disable “Deleting…” only during a local request, reconcile every non-`204` outcome through a list reload, offer “Retry delete” only for returned recovery items, and offer only “Retry status” when deletion status cannot be loaded.
- [x] 5.6 Add browser-state tests for two-snippet save/read/delete behavior, markup displayed literally, blank-field messages, load/save/read/delete failures without false success, stale-read suppression, save restart with a new ID, incomplete-delete retry after refresh, and lost-`204` reconciliation that removes only the deleted item.

## 6. Verification and Review Proof

- [x] 6.1 Run formatting, static/type checks, the full automated test suite, and the production build; confirm the built Worker and static assets are the only deployable outputs and record any environment limitations without weakening required checks.
- [x] 6.2 Publish the fixed build to the supported temporary Worker environment with exactly one D1 binding, one R2 binding, and built assets, apply the migration, and verify the API does not expose or route to production resources.
- [x] 6.3 Run direct deployed API checks for save, list, read, delete, validation failure, and persistence, then read back matching D1 index/operation state and R2 keys/metadata/body or prefix absence before any fixture reset or cleanup.
- [x] 6.4 Execute one ordered browser proof collection that saves `Greeting` and `Sign-off`, selects and shows the right plain text, refreshes with both snippets intact, deletes `Sign-off`, proves `Greeting` remains readable, and captures a clear blank-input or failed-action message.
- [x] 6.5 Make the immediately following proof scenario a fresh browser context against the same unchanged D1/R2 state, and capture that `Greeting` reloads from cloud storage while deleted `Sign-off` does not return; use and label the approved API-seeded fallback only if the runner cannot retain server state.
- [x] 6.6 Inspect and select the browser, D1, R2, and executable behavior records that jointly prove the required transitions and store consistency, excluding obsolete exploratory evidence.
- [x] 6.7 Publish the selected proof to the implementation pull request, remove the temporary Worker/D1/R2 resources only after proof publication, verify the retained proof remains reviewable, and leave the pull request unmerged and unreleased.
