## 1. Client foundation

- [x] 1.1 Create the client-only static app, build, and test structure with one application root and separate state-transition, storage-adapter, and presentation modules; add repeatable development, test, and production-build commands without adding a server or deployment workflow.
- [x] 1.2 Define the version-1 packing-list document and runtime state types, including canonical insertion-ordered items, the `all`/`to-pack` filter, persistence status, rejected raw data, and a pending external document; keep transient UI state out of persisted data.

## 2. Domain transitions and identifiers

- [x] 2.1 Implement immutable add, rename, delete, pack, and unpack transitions keyed only by item ID, preserving packed state and array position on rename, allowing duplicate names, and treating stale or unknown IDs as no-ops.
- [x] 2.2 Implement trimmed non-empty name validation and cryptographic lowercase UUIDv4 generation using `crypto.randomUUID()` first and a correctly bit-masked `crypto.getRandomValues()` fallback; reject adds visibly and without mutation or storage writes when secure generation is unavailable.
- [x] 2.3 Add unit checks for default-unpacked adds, state-preserving renames, ID-targeted deletion with duplicate names, pack/unpack, insertion order, derived All and To pack lists, blank-name and unknown-ID no-ops, both UUID paths, and UUID failure with no `Math.random()` fallback.

## 3. Versioned browser storage and recovery

- [x] 3.1 Implement the `packing-list:v1` storage adapter to read and atomically replace the complete version-1 document, accepting only unique lowercase UUIDv4 IDs, already-trimmed non-empty names, and boolean packed values while rejecting malformed JSON, unsupported versions, invalid shapes, and partial documents.
- [x] 3.2 Model missing, valid, invalid, read-denied, and write-failed outcomes without overwriting unread or rejected primary data; implement write-through saves, full-document retry, and save-status clearing only after a successful write.
- [x] 3.3 Implement safe rejected-data export as a short-lived `text/plain;charset=utf-8` Blob download named `packing-list-rejected.txt`, plus the `packing-list:rejected:v1` single-slot backup flow with prior-copy download and explicit replacement confirmation before reset or restore writes.
- [x] 3.4 Add adapter checks for valid round trips, missing data, malformed JSON, schema/version/UUID/name/duplicate-ID rejection, ignored top-level fields, thrown reads and writes, read and save retries, exact raw-text export, empty and occupied recovery slots, failed backup/primary writes, and confirmed recovery-slot replacement.

## 4. Application orchestration and cross-tab behavior

- [x] 4.1 Load and validate storage before the first list render, always start in All, and route every successful list mutation through one canonical state owner that renders immediately and writes the complete document; ensure filter changes never write storage.
- [x] 4.2 Keep the current tab usable after a failed write, show a persistent unsaved warning with `Retry save`, and retry the complete current document on each later mutation while preserving the warning after repeated failures.
- [x] 4.3 Implement blocked startup recovery for invalid or unreadable storage, including `Retry storage access`, safe download, confirmed reset, and recovery-slot handling; do not enable mutations until a valid read or complete recovery succeeds.
- [x] 4.4 Handle `storage` events for valid replacements and key removal by adopting the external list when local state is saved, retaining the selected filter, canceling rename drafts, announcing the update, and restoring focus by same control, next row, previous row, then list status.
- [x] 4.5 Handle valid external writes during an unsaved local state by preserving and blocking the local list, retaining only the latest pending document, and implementing `Keep my changes` and confirmed `Use other tab's list` outcomes without silently discarding either version.
- [x] 4.6 Handle invalid external writes by keeping the last valid list visible but read-only and offering exact-data download plus confirmed restore-current-list or reset flows through the same recovery-slot policy.
- [x] 4.7 Add application-state checks for startup states, write-failure retries, normal external replacement/removal, latest-document conflict choices, invalid external recovery, rename cancellation, filter retention, mutation blocking, announcements, and replacement focus fallback.

## 5. Desktop interactions and accessibility

- [x] 5.1 Build the add form, programmatically selected All/To pack filter, item list, distinct empty-list and nothing-left-to-pack states, and literal text rendering for all item names.
- [x] 5.2 Build each item row with a labeled packed checkbox and explicit rename and delete actions; provide a focused rename form whose Enter save preserves ID/packed/order, whose Escape or cancel discards the draft, and whose blank submission remains open with an associated validation message.
- [x] 5.3 Present read, save, conflict, and rejected-data states with accessible non-color-only warnings and the retry, keep/adopt, download, restore, and reset controls required by their state; clearly explain browser-local persistence without implying account-backed durability.
- [x] 5.4 Implement deterministic keyboard focus after add, rename save/cancel, retained-row toggles, delete, filtered-out packed rows, and external replacements, using direct references or framework-generated DOM identifiers rather than persisted IDs in selectors.
- [x] 5.5 Create a clear 1440-by-900 desktop layout with labeled controls and packed state conveyed by both checkbox state and text treatment; keep mobile-specific behavior and unapproved packing features out of scope.

## 6. Integrated behavior checks

- [x] 6.1 Add browser-level checks that start from controlled storage and prove add, rename, pack, unpack, All/To pack filtering, ID-specific delete, persisted deletion, and restored names and packed states after a real page reload.
- [x] 6.2 Add browser checks for keyboard rename behavior, blank validation, required focus handoffs when rows disappear, both empty states, selected-filter semantics, and the supported 1440-by-900 desktop layout.
- [x] 6.3 Add safe-rendering proof with a markup-like item name that remains literal text and creates no injected element, plus browser coverage for write/read failures, manual retries, normal multi-tab replacement, unsaved keep/adopt conflict choices, and invalid external restore/reset recovery.
- [x] 6.4 Run the complete automated suite and production build, confirm the finished static directory contains only the reviewable client assets, and record the exact passing commands and any limitations for implementation handoff.

## 7. Hosted preview and review proof

- [x] 7.1 Publish the finished static build directory through the trusted `static-preview-v1` `publish_preview` capability, confirm the returned immutable nonproduction URL serves the reviewed build anonymously, and do not add GitHub Actions, repository Pages configuration, provider credentials, or a production release.
- [x] 7.2 Collect ordered real-app demonstrations against the hosted preview at 1440 by 900, with each independent scenario starting in a fresh browser context after both storage keys are removed and the empty state is verified.
- [x] 7.3 Include paired screenshots in the same scenario for old/new rename states, present/deleted item states, and immediately pre/post-refresh states; across the sequence show a newly added item, packed and unpacked states, the To pack view, deletion, and the same saved names and packed states after reload.
- [x] 7.4 Inspect every captured image and recheck the anonymous preview, then hand off the immutable URL, ordered screenshot evidence, and behavior-check results for the implementation pull request; if the URL or reviewed build is wrong or expires before review, republish the current build, replace the URL, and rerun only affected scenarios.
