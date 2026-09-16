## Context

The approved proposal and packing-list-web-app delta spec define a new desktop-only packing-list page. The change has no server API or shared-data requirement; item names and packed state remain in one browser profile across refreshes. The implementation must also support a repeatable hosted-preview and screenshot review sequence. No repository guidance was included in the checked context.

## Goals / Non-Goals

**Goals:**

- Keep one canonical in-memory list and render every visible row and empty state from it.
- Persist every successful list mutation locally and restore valid saved data before the first list render.
- Separate state transitions, browser storage, and presentation so the required behavior can be tested without relying only on screenshots.
- Make add, rename, delete, pack/unpack, and filter controls unambiguous in a desktop layout and usable by keyboard.
- Make persistence failures visible while leaving the current tab usable.

**Non-Goals:**

- Accounts, server storage, collaboration, conflict-free concurrent multi-tab editing, or cross-browser data transfer.
- Mobile-specific layout or interaction design.
- Reordering, quantities, categories, trip management, or undo history.
- Persisting transient interface state such as the selected filter, draft input, edit mode, or status messages.

## Decisions

Use a client-only single-page architecture with one canonical state owner and a versioned browser-storage boundary. The sections below define this choice, its data and event contracts, and the alternatives rejected.

## Component Diagram

The page will run entirely in the desktop browser. A single application root owns the current list and selected filter. It delegates persistence to a small storage adapter and supplies derived rows and event handlers to focused UI components. After implementation builds the finished static client, the DEOS `static-preview-v1` capability is the delivery boundary: the implementation agent passes the build directory to `publish_preview`, and the trusted service publishes a run-owned, nonproduction Cloudflare Pages deployment with an immutable review URL.

~~~text
+---------------- DEOS static-preview-v1 ----------------+
| publish_preview(finished static build directory)       |
|     -> trusted service                                  |
|     -> immutable, run-owned Cloudflare Pages URL       |
+--------------------------+-----------------------------+
                           | HTML, CSS, JavaScript
                           v
+--------------------------- Desktop browser ----------------------------+
|                                                                        |
|  PackingListApp                                                        |
|  (canonical items + selected filter + persistence status)              |
|       |                 |                       |                      |
|       v                 v                       v                      |
|  AddItemForm       FilterControl              ItemList                |
|  (new name)        (All / To pack)                |                   |
|                                                   v                   |
|                                              ItemRow(s)                |
|                                      (pack, rename, delete)            |
|       ^                                                                |
|       | mutation events                                                 |
|       v                                                                |
|  List state transitions <----> Storage adapter <----> localStorage     |
|                               (parse, validate, save)                   |
+------------------------------------------------------------------------+
~~~

There is no network boundary after the static assets load. The preview runs the same static client used for review and does not introduce an application backend. It requires no GitHub Actions workflow, repository Pages setup, agent-held provider credentials, or production release.

This keeps the only required durable boundary—browser storage—explicit and avoids an unnecessary service. A server-backed design was rejected because it would add identity, API, hosting, and failure concerns that do not support the approved single-browser scope. Multiple independent widgets owning their own copies of the list were rejected because rename, filtering, and persistence could diverge.

## Minimal Data Model

### Keep one explicit state model and derive the visible list

The minimal durable model is a versioned document:

~~~text
PackingListDocument {
  version: 1,
  items: PackingItem[]
}

PackingItem {
  id: UUIDv4,       // stable, browser-generated lowercase identity
  name: string,     // trimmed, non-empty display text
  packed: boolean
}
~~~

The runtime adds only selectedFilter ("all" or "to-pack"), a persistence-status value, and, after a failed load, the rejected raw storage value needed for recovery. None is written into the primary document. A new item receives a lowercase RFC 4122 version 4 UUID from `crypto.randomUUID()`, its trimmed submitted name, and packed set to false. Items stay in insertion order. Duplicate names are allowed because identity and updates use id, not display text.

Rename replaces only name; it retains id, packed, and array position. Pack/unpack replaces only packed. Delete removes the item with the matching ID. The All view uses items unchanged, while To pack derives items whose packed value is false. Filtering never mutates or saves the document.

Add and rename submissions containing only whitespace are rejected in place with an accessible validation message. This gives the model a reliable non-empty-name invariant without inventing uniqueness rules absent from the spec.

Alternatives considered were storing a separate filtered list and using item names as keys. Both were rejected: duplicated state can become stale, and names are editable and need not be unique.

## Event Flow

### Centralize every list mutation in one write-through transition path

User actions emit intent with an item ID where applicable. The application computes the next immutable item array, updates the screen immediately, and asks the storage adapter to save the complete versioned document. All mutations—add, rename, delete, pack, and unpack—use this same path.

~~~text
Startup:
page load -> storage.read() -> parse and validate -> canonical items
          -> default selectedFilter to "all" -> render

List mutation:
control event -> validate intent -> compute next items -> render next state
              -> serialize full document -> localStorage.setItem()
              -> clear or show persistence status

Save retry:
warning action -> serialize current canonical document -> localStorage.setItem()
               -> clear warning on success or keep warning on failure

Filter change:
filter event -> update selectedFilter -> derive visible items -> render
             -> no storage write

Other-tab write:
storage event -> parse and validate new document -> replace canonical items
              -> cancel any row edit -> retain selectedFilter -> render
~~~

The full document is replaced after each mutation rather than applying incremental storage operations. `localStorage.setItem()` is synchronous, so a tab observes each mutation as a complete old or new JSON value. The UI does not claim a save succeeded until `setItem()` returns. Keeping the in-memory mutation when a save fails lets the person continue working, while a persistent, non-blocking warning states that the latest changes may be lost on refresh. The warning includes a `Retry save` action that writes the whole current document without requiring another list change. Every later mutation also retries by writing the whole document. The warning clears only after a successful write; repeated quota or policy failures leave it visible with guidance to free browser storage or allow site storage before retrying.

The application listens for `storage` events for `packing-list:v1`. A valid document written by another tab replaces the receiving tab's canonical items, cancels any open rename draft, retains the receiving tab's filter, and announces that the list was updated in another tab. Removal of the key produces the empty list. An invalid external value enters the same blocked recovery state as an invalid startup value. This makes normally sequenced edits converge across tabs and prevents a long-lived stale tab from silently continuing against an old snapshot. Near-simultaneous writes remain last-write-wins because local storage has no compare-and-swap operation; conflict-free concurrent multi-tab editing is explicitly out of scope.

Debounced or unload-only saving was rejected because closing or refreshing before the timer or unload handler completes could violate the refresh requirement. Periodic retry was rejected because it would repeatedly invoke a browser operation that may be denied and would give no clear user control; retry is explicit and also occurs on a later mutation. Persisting the selected filter was rejected because the durable requirements cover item names and packed states, not view preference; startup therefore always opens All.

### Put all browser persistence behind a versioned adapter

The adapter owns the primary namespaced key `packing-list:v1` and one recovery key, `packing-list:rejected:v1`. On read it accepts only an object with version 1 and an items array whose entries each have an ID matching the lowercase RFC 4122 version 4 UUID pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, a string name that is non-empty and already equals its trimmed value, and a boolean packed value. IDs must also be unique across the array. Unknown top-level fields may be ignored, but a duplicate ID or any malformed entry invalidates the complete document so the app never renders a partially trusted list. Stored IDs are compared as data only; they are not interpolated into HTML, DOM element IDs, or selector strings. Row controls use framework-generated DOM identifiers or direct element references for label and focus relationships.

Missing storage produces an empty list. Invalid JSON, the wrong version, or an invalid shape produces an empty in-memory list and a persistent warning that explains the saved list has not been changed. While this recovery state is active, list mutations are blocked so the rejected value cannot be overwritten accidentally. The warning offers `Download saved data`, which downloads the exact raw value as a text file, and `Reset saved list`. Reset requires confirmation, first copies the exact raw value to `packing-list:rejected:v1`, and then writes a valid empty document to the primary key. If either write fails, the primary rejected value remains untouched and the blocked warning remains. After both writes succeed, mutations are enabled and the warning states that the rejected value was retained under the recovery key. This explicit reset was chosen over silently salvaging individual entries because partial recovery could misassociate names and packed states.

Read and write access are wrapped because privacy settings, quota limits, or browser policy can throw even when local storage exists. If the primary read itself is denied, there is no raw value to download; the app starts with an empty in-memory list, reports that durable storage is unavailable, and allows in-memory mutations with the normal failed-save warning and `Retry save` action.

A version field is retained despite the small model so later schema changes can be detected instead of silently misread. IndexedDB was rejected because the data is small, single-document, and synchronous startup is sufficient. Cookies were rejected because they are size-limited and would be sent to a host without adding value.

### Make row interactions explicit and state-preserving

Each row presents a labeled packed checkbox, the item name, a rename action, and a delete action. Choosing rename changes that row into an edit form initialized with the current name; save commits through the central transition path, while cancel restores the unchanged row. Enter saves a valid edit and Escape cancels it. The packed checkbox remains represented by the canonical packed value after a rename. Item names are always inserted into the DOM as text through textContent or the framework equivalent that escapes text by default; names must never enter innerHTML, raw-HTML directives, or another markup-interpreting sink.

The filter is a two-option control with a programmatically exposed selected state. To pack hides packed rows only; it does not delete or alter them. Distinct empty messages cover an empty list and a To pack result with no remaining items. Buttons and inputs have text labels, and packed state is conveyed by the checkbox and text treatment rather than color alone.

Focus behavior is deterministic. Starting a rename focuses its input; saving or canceling returns focus to that row's rename action. A successful add clears and refocuses the add input. A pack toggle retains focus on its checkbox when the row remains visible. Before delete, or before marking an item packed in the To pack view, the app records the row's visible index. After that row disappears, focus moves to the next visible row's packed checkbox at the same index, then to the previous row's checkbox if there is no next row, and finally to the focusable list heading or empty-state status if no row remains. Because packed rows are absent from To pack, unpacking is available only in All; browser checks must switch to All before demonstrating unpack.

An always-editable text field per row was considered but rejected because it blurs the difference between an uncommitted draft and a saved rename. Name-based delete or update handlers were rejected because duplicate or renamed items could target the wrong row.

### Verify behavior at state, persistence, and browser boundaries

State-transition checks will cover default-unpacked add, state-preserving rename, ID-targeted delete, pack/unpack, duplicate names, and the derived filters. Storage checks will cover valid round trips, missing data, malformed JSON, invalid schema or version, invalid or duplicate UUIDs, whitespace-only or untrimmed stored names, rejected-value download and reset, thrown reads or writes, and manual save retry. Multi-tab browser checks will assert that a valid external write replaces stale state and that an invalid external write enters recovery without overwriting the rejected value. Browser-level checks will perform the approved add, rename, pack, unpack, filter, delete, and refresh scenarios against the rendered page, including the defined focus handoff when a row disappears. A safe-rendering check will use a markup-like item name and assert that its literal text appears without creating an element or executing markup.

Browser-level layout checks and every review screenshot will use a 1440 by 900 CSS-pixel viewport as the supported desktop target. The implementation agent chooses the useful behavior-demonstration scenarios and screenshot count, provided the ordered evidence collectively shows a new item after add, a changed name, both packed states, the To pack view, an item gone after delete, and the same saved names and packed states after refresh. Each independent scenario starts in a dedicated fresh browser context with both storage keys removed, reloads the hosted preview, verifies the empty-list state, performs its behavior steps, and captures the result before that context is reset for the next scenario. Screenshots are evidence of real browser behavior, not a replacement for automated checks; platform or infrastructure demonstration scenarios are excluded.

After the static build and behavior checks pass, the implementation agent calls the DEOS `publish_preview` capability with the finished static build directory. The trusted service publishes the directory through `static-preview-v1` as a run-owned, nonproduction Cloudflare Pages deployment and returns an immutable review URL. The agent then runs the selected screenshot scenarios against that URL, verifies it in a fresh browser without repository credentials, and adds the URL and ordered screenshots to the implementation pull request. The published preview is review evidence only; no GitHub Actions workflow, GitHub Pages configuration, provider credential, or production release belongs in the repository.

## Failure Modes

| Failure | Required handling |
| --- | --- |
| Storage key is absent | Start with an empty list and no warning. |
| Saved JSON is malformed, has an unsupported version, contains an invalid or duplicate UUID, contains a name that is empty or not already trimmed, or otherwise fails schema validation | Do not render partial data or overwrite the primary value. Enter the blocked recovery state with download and confirmed reset actions. |
| Browser denies a storage read | Start with an empty in-memory list and warn that saved data is unavailable. |
| A storage write throws, including quota or policy failures | Keep the current tab state, show that recent changes are not saved, offer `Retry save`, and also retry the full current document on the next mutation. Keep the warning after repeated failure. |
| Another tab writes a valid document | Replace canonical items, cancel an open rename, retain the filter, announce the external update, and render the new document. |
| Another tab removes or writes an invalid primary value | Show the empty list for removal; for invalid data, enter blocked recovery and preserve the rejected raw value. |
| Add or rename is blank after trimming | Keep the form open, do not mutate or write, and associate a validation message with the input. |
| An item name contains markup-like text | Render it as literal text through an escaping text sink; never interpret it as DOM markup. |
| An event references an ID no longer in the current list | Treat it as a no-op and do not write, avoiding mutation of a different row. |
| A delete or To pack toggle removes the focused row | Move focus to the next row, previous row, or focusable list status in that order. |
| To pack has no matching items | Render its dedicated “nothing left to pack” state while preserving all packed items in canonical state. |
| `publish_preview` rejects the build directory, the trusted publication fails, the returned URL does not load the reviewed build, or the URL is not accessible for review | The review is not ready. Correct the static build or publication input, call `publish_preview` again, then rerun the selected behavior scenarios and screenshots against the new immutable URL before handoff. Do not substitute a repository workflow, agent credentials, or a production deployment. |

## Risks / Trade-offs

- [Browser-local data can be cleared and does not follow the person to another browser or device] → Keep the product copy scoped to this browser and avoid implying account-backed durability.
- [A corrupt saved document cannot be safely rendered] → Block mutations, preserve and offer the raw value for download, and require a confirmed backup-and-reset flow before replacement.
- [A write failure means visible state and refreshed state can differ] → Surface save status immediately, provide manual retry, and retry the full canonical document on every later mutation.
- [Near-simultaneous edits in two tabs can overwrite each other] → Converge normally sequenced writes through storage events, announce external changes, and state the remaining last-write-wins boundary explicitly.
- [Synchronous storage performs work on the UI thread] → Store only the small packing-list document and serialize once per deliberate list mutation; revisit the storage choice only if the scope grows substantially.
- [Duplicate names can look ambiguous] → Keep stable hidden IDs for targeting and ensure row controls are associated with the visible row; do not silently impose a uniqueness rule.
- [Desktop-only design may be awkward outside the review target] → Run layout checks and screenshots at the defined 1440 by 900 CSS-pixel viewport; do not add unapproved mobile behavior.

## Migration Plan

1. Ship the client with the `packing-list:v1` primary key and `packing-list:rejected:v1` recovery key, with no seed data. A first visit therefore starts empty.
2. Run state, storage, multi-tab, focus, and browser behavior checks at the 1440 by 900 CSS-pixel desktop viewport, including a real reload after mutations.
3. Build the exact implementation pull-request head as a finished static directory and call `publish_preview` with that directory. The trusted DEOS service publishes it through `static-preview-v1` and returns the immutable, run-owned nonproduction Cloudflare Pages URL.
4. Choose a useful set and count of behavior-demonstration scenarios. For each scenario, start from a dedicated clean browser context with both storage keys removed, run it against the hosted preview, and capture its result before resetting for the next scenario. Collectively cover every screenshot behavior required by the delta spec; do not add platform or infrastructure scenarios.
5. Verify the immutable URL without repository credentials, then add it and the ordered real-app screenshots to the implementation pull request for human review.
6. If the build or hosted result is wrong, correct the client, produce a new static build, and call `publish_preview` again; update the pull request to the new immutable URL and recapture affected screenshots. No production rollback is needed because the deployment is nonproduction and run-owned. Existing browser storage remains untouched so the corrected build can recover a valid list or rejected raw value.
