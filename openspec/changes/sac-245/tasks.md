## 1. Static app foundation

- [x] 1.1 Add the minimal client application, test, and deterministic static-build scaffold, with scripts for the repository checks and generated dependency, coverage, and build directories excluded from version control.
- [x] 1.2 Define the `Book`, status, filter, queue view-state, and version-1 `StoredQueue` boundaries, including the `reading-queue:v1` storage key and labels for all three statuses.

## 2. Queue controller and persistence

- [x] 2.1 Implement the browser storage adapter so a missing value loads an empty queue, a valid version-1 envelope restores insertion order, malformed JSON or schema (including duplicate IDs) produces a load error without rewriting storage, and read failures produce a storage error.
- [x] 2.2 Implement ID generation with `crypto.randomUUID()` when it succeeds, a timestamp-plus-monotonic-counter fallback when it is absent or throws, and at most three collision-checked candidates before reporting a non-mutating action error.
- [x] 2.3 Implement validated add and edit commands that trim title and author, report field-specific errors (both when both are blank), assign new books to `To read`, retain the latest status during edits, and preserve the draft and saved queue after validation or write failure.
- [x] 2.4 Implement delete and status-change commands that reject stale IDs and unknown statuses, preserve insertion order, and commit memory only after the complete candidate envelope has been written successfully.
- [x] 2.5 Derive all three counts from the complete saved queue and derive the visible list from the transient `All`, `To read`, `Reading`, or `Finished` filter, including selected-filter and filtered-empty-state output without persisting counts or filter state.
- [x] 2.6 Clear superseded action errors on each new command and return distinct load, action, field, and storage error state so the shell can render failures without hiding the always-visible counts.

## 3. Desktop interface

- [x] 3.1 Build the one-screen desktop shell with the add/edit form, independent error and count regions, four filters, queue list, and clear first-run and filtered-empty states, without login, backend calls, or outside runtime services.
- [x] 3.2 Render each book's title, author, current status, status control, edit action, and delete action, wiring all intents through the single queue controller and keeping the active filter selected when a mutation empties its list.
- [x] 3.3 Use native controls with associated labels and field errors, expose the selected filter programmatically and visually, announce load/action/storage failures in a live region, and render user-provided title and author values only as escaped text rather than HTML.
- [x] 3.4 Add desktop styling that keeps the full workflow usable on one screen, makes statuses and active filters clear, and wraps unusually long title, author, and markup-looking values without breaking rows or controls.

## 4. Automated behavior checks

- [x] 4.1 Add controller tests proving add, edit, delete, every status transition (including moving back), stable insertion order, active-filter behavior, global count updates, and edit status retention.
- [x] 4.2 Add validation and transaction tests proving whitespace-only fields and stale or unknown commands do not mutate memory or storage, failed writes retain the prior queue and applicable draft, and a later valid command can recover cleanly.
- [x] 4.3 Add load and persistence tests proving missing, valid, invalid-JSON, wrong-version, invalid-book, duplicate-ID, and read-failure cases, plus round-trip persistence of titles, authors, statuses, deletions, and counts after controller re-creation.
- [x] 4.4 Add deterministic ID tests for UUID success, unavailable and throwing UUID fallback paths, collision-then-success, three-collision exhaustion, and duplicate rejection before serialization.
- [x] 4.5 Add UI-level checks for field-error associations, live error messaging, selected filters, filtered empty states with all counts still visible, safe literal rendering of hostile HTML-like text, and add/edit/delete/status controls connected to persistence.
- [x] 4.6 Run the complete automated check suite and production build through trusted checks, resolving failures and confirming the generated static entry point and required assets load without console or missing-asset errors.

## 5. Preview and behavior proof

- [x] 5.1 Publish the finished build directory through the supported `static-preview-v1` path and verify the immutable hosted preview at a desktop viewport with no login, backend dependency, or outside-service request.
- [x] 5.2 Capture ordered real-browser proof of adding books and moving one through `To read`, `Reading`, and `Finished`, then show a status filter where hidden books do not change the three global counts.
- [x] 5.3 Capture ordered real-browser proof that editing preserves status, blank add and edit attempts show field-specific errors without changing saved data, and markup-looking title and author text renders literally without executable DOM.
- [x] 5.4 Capture ordered real-browser proof that deleting a book reduces its prior status count and remains deleted after refresh, while the remaining books, statuses, insertion order, and counts reload unchanged.
- [x] 5.5 Record the working preview URL and select the final screenshots and concise behavior evidence needed for the implementation pull-request handoff.
