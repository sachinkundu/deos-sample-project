## 1. Static Client Foundation

- [x] 1.1 Add the browser-native module, test, and static-build structure for a client-only expense tracker with no server, login, outside service, or mobile-specific flow.
- [x] 1.2 Create the single desktop page shell and styling for the add form, five-option category filter, visible total, status/error region, and expense list at the 1440×900 review viewport.

## 2. Exact Expense Domain

- [x] 2.1 Define the four-category allowlist and version-1 expense/document model with stable UUID IDs, trimmed names, and canonical positive base-10 cents strings.
- [x] 2.2 Implement shared add/edit validation and exact amount parsing/formatting so blank names or amounts, malformed numbers, non-positive values, values over two decimal places, and unsupported categories produce field-specific errors without mutating state.
- [x] 2.3 Implement ID-targeted add, edit, and delete transitions plus derived five-filter visibility and `BigInt` visible-total calculation, including `€0.00` for an empty result.
- [x] 2.4 Implement filter-transition behavior that retains a matching active filter but switches to `All` with an announcement when a successful add or edit would otherwise be hidden.

## 3. Durable Browser Storage

- [x] 3.1 Implement the sole `localStorage` adapter for `expense-tracker:v1`, including canonical whole-document serialization and strict reads that reject malformed JSON, unsupported versions, malformed entries, and duplicate IDs without partial recovery.
- [x] 3.2 Restore missing or valid storage before normal rendering, and add blocked recovery states that preserve invalid raw data, disable mutations, offer confirmed clearing for invalid data, and offer retry when storage access fails.
- [x] 3.3 Persist every add, edit, and delete before committing in-memory state; on UUID or storage failures, keep canonical state unchanged, preserve applicable drafts, and clearly report that the operation was not accepted.
- [x] 3.4 Add serialized-snapshot preflight reads and `storage` event handling so valid external changes are adopted, stale writes and missing targets are rejected, drafts survive conflicts, and invalid external data enters blocked recovery.

## 4. Accessible Desktop Interactions

- [x] 4.1 Render canonical expenses as literal text with formatted amounts, categories, and labeled ID-bound Edit/Delete actions; render selected-filter semantics, filtered empty states, and announced status messages.
- [x] 4.2 Wire the add form and one-row-at-a-time inline editor to shared validation and persistence, preserving invalid drafts and leaving rejected edits unchanged while Cancel discards only the draft.
- [x] 4.3 Implement the specified keyboard focus flow after validation, add, edit open/cancel/save, and delete, including next-row, previous-row, and focusable empty-list fallbacks.
- [x] 4.4 Confirm successful mutations, filter changes, external updates, and recovery actions always re-derive one consistent list and total from the canonical collection and never persist transient UI state.

## 5. Automated Behavior Checks

- [x] 5.1 Add domain checks for all amount examples and validation branches, exact large totals, all five filters, UUID/ID targeting, duplicate names, add/edit/delete transitions, filter-retention/switch rules, and rejected mutations preserving prior state.
- [x] 5.2 Add a direct submission-boundary check for an unsupported category that proves the allowlist message appears and both canonical and stored documents remain unchanged without DOM injection.
- [x] 5.3 Add storage checks for missing and valid documents, refresh-equivalent reload, malformed/unsupported/duplicate data, thrown reads/writes/removals, UUID failure, preflight conflicts, disappeared targets, and valid and invalid `storage` events.
- [x] 5.4 Add rendered-browser checks for keyboard-visible add/edit errors, filter selection and empty totals, literal markup-like names, focus after deletion, actual reload persistence after add/edit/delete, and cross-tab conflict messaging with an unsaved draft preserved.
- [x] 5.5 Run the complete automated check suite and production static build, resolving failures while keeping generated dependency, coverage, and build outputs out of the implementation patch as appropriate.

## 6. Preview and Review Proof

- [x] 6.1 Publish the finished static build through `static-preview-v1`, then verify the immutable review URL loads anonymously at 1440×900 and requires no backend or application network requests after asset loading.
- [x] 6.2 Run repeatable hosted-browser scenarios from fresh contexts and known storage fixtures that collectively prove add, edit, delete, clear validation feedback, selected-category filtering with the correct visible total, and identical saved data immediately before and after refresh.
- [x] 6.3 Capture the dedicated `Harness-forced allowlist probe`, explicitly stating that the harness injected the unshipped `Entertainment` option, and show the unsupported selection, allowlist error, and unchanged list and total.
- [x] 6.4 Record concise executable behavior proof, inspect and caption the real browser captures, select the useful preview evidence in presentation order, and hand off the unmerged, unreleased implementation for human review.
