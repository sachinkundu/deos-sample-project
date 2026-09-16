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

The runtime adds only selectedFilter ("all" or "to-pack"), a persistence-status value, and, after a failed load or conflicting external write, the rejected raw storage value or pending external document needed for recovery. None is written into the primary document. A new item receives a lowercase RFC 4122 version 4 UUID, its trimmed submitted name, and packed set to false. ID generation first uses `crypto.randomUUID()`. If that function is unavailable, it uses `crypto.getRandomValues()` to fill 16 bytes, sets byte 6's high bits to `0100` and byte 8's high bits to `10`, and formats the bytes as lowercase hexadecimal in the 8-4-4-4-12 UUID layout. If neither cryptographic operation is available or it throws, add is rejected with a visible ID-generation error and no state or storage change; `Math.random()` is not an acceptable fallback. Items stay in insertion order. Duplicate names are allowed because identity and updates use id, not display text.

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
storage event -> parse and validate new value
              -> no unsaved local changes: replace canonical items
              -> unsaved local changes: hold external document for a choice
              -> invalid value: keep last valid items and enter recovery
~~~

The full document is replaced after each mutation rather than applying incremental storage operations. `localStorage.setItem()` is synchronous, so a tab observes each mutation as a complete old or new JSON value. The UI does not claim a save succeeded until `setItem()` returns. Keeping the in-memory mutation when a save fails lets the person continue working, while a persistent, non-blocking warning states that the latest changes may be lost on refresh. The warning includes a `Retry save` action that writes the whole current document without requiring another list change. Every later mutation also retries by writing the whole document. The warning clears only after a successful write; repeated quota or policy failures leave it visible with guidance to free browser storage or allow site storage before retrying.

The application listens for `storage` events for `packing-list:v1`. When the receiving tab has no unsaved mutation, a valid document written by another tab replaces its canonical items, cancels any open rename draft, retains its filter, and announces that the list was updated in another tab. Removal of the key is treated as a valid empty document for this flow. Before replacement, the app records the active row control and visible index. If the same item and control still exist afterward, focus returns there; otherwise it moves to the next row at the recorded index, the previous row, or the focusable list heading or empty-state status, in that order.

When the receiving tab has an unsaved mutation because its last save failed, a valid external document does not replace the local canonical items. The app keeps the local list and focus unchanged, retains the failed-save warning, stores the latest valid external document only in runtime memory, blocks further list mutations, and shows a conflict choice. `Keep my changes` writes the complete local canonical document; success clears both warnings and unblocks mutations, while failure preserves the local list and both warnings. `Use other tab's list` requires confirmation that the unsaved local changes will be discarded, then adopts the pending external document, clears the failed-save and conflict warnings, and applies the replacement focus rule. A later valid storage event replaces the pending external document so the choice always refers to the latest external state.

An invalid external value never clears a running tab's last valid canonical items. The app keeps those items visible but read-only, preserves focus where possible, captures the invalid raw value, and enters a blocked external-recovery state. `Download saved data` exports that raw value. `Restore my current list` first backs up the invalid raw value under the recovery-key policy and then writes the last valid canonical document; only a successful backup and primary write unblocks mutations. A confirmed `Reset saved list` follows the same backup policy and writes a valid empty document instead. This makes normally sequenced edits converge across tabs, makes any loss of unsaved work an explicit choice, and prevents a long-lived stale tab from silently continuing against invalid data. Near-simultaneous successful writes remain last-write-wins because local storage has no compare-and-swap operation; conflict-free concurrent multi-tab editing is explicitly out of scope.

Debounced or unload-only saving was rejected because closing or refreshing before the timer or unload handler completes could violate the refresh requirement. Periodic retry was rejected because it would repeatedly invoke a browser operation that may be denied and would give no clear user control; retry is explicit and also occurs on a later mutation. Persisting the selected filter was rejected because the durable requirements cover item names and packed states, not view preference; startup therefore always opens All.

### Put all browser persistence behind a versioned adapter

The adapter owns the primary namespaced key `packing-list:v1` and one recovery key, `packing-list:rejected:v1`. On read it accepts only an object with version 1 and an items array whose entries each have an ID matching the lowercase RFC 4122 version 4 UUID pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, a string name that is non-empty and already equals its trimmed value, and a boolean packed value. IDs must also be unique across the array. Unknown top-level fields may be ignored, but a duplicate ID or any malformed entry invalidates the complete document so the app never renders a partially trusted list. Stored IDs are compared as data only; they are not interpolated into HTML, DOM element IDs, or selector strings. Row controls use framework-generated DOM identifiers or direct element references for label and focus relationships.

Missing storage produces an empty list. Invalid JSON, the wrong version, or an invalid shape at startup produces an empty in-memory list and a persistent warning that explains the saved list has not been changed. While this recovery state is active, list mutations are blocked so the rejected value cannot be overwritten accidentally. The warning offers `Download saved data`, which exports the exact raw value using a `Blob` with MIME type `text/plain;charset=utf-8`, a fixed `packing-list-rejected.txt` filename, and an anchor `download` attribute. The adapter creates a blob object URL only for the click and revokes it immediately afterward; it never uses an HTML MIME type or a `data:` URL.

`Reset saved list` requires confirmation, backs up the exact raw value to `packing-list:rejected:v1`, and then writes a valid empty document to the primary key. The recovery key is deliberately a single latest-value slot. Before any backup, the adapter reads it. If it already exists, the warning says that continuing will replace the previous recovery copy, offers that prior copy through the same safe text download path, and requires a second explicit confirmation before overwrite. If the recovery-key read or write fails, or the primary write fails, the primary rejected value remains untouched and the blocked warning remains. After both writes succeed, mutations are enabled and the warning states that the newest rejected value replaced any prior recovery copy. `Restore my current list` from an external-invalid-write state uses the identical backup checks before writing the last valid canonical document. This explicit recovery was chosen over silently salvaging individual entries because partial recovery could misassociate names and packed states.

Read and write access are wrapped because privacy settings, quota limits, or browser policy can throw even when local storage exists. If the primary read itself is denied, there is no trustworthy basis for overwriting a possibly existing list. The app starts with an empty display, reports that saved data could not be read, blocks list mutations and writes, and offers `Retry storage access`. A successful retry follows the normal missing, valid, or invalid startup path. This deliberately favors preservation of unread data over temporary in-memory editing.

A version field is retained despite the small model so later schema changes can be detected instead of silently misread. IndexedDB was rejected because the data is small, single-document, and synchronous startup is sufficient. Cookies were rejected because they are size-limited and would be sent to a host without adding value.

### Make row interactions explicit and state-preserving

Each row presents a labeled packed checkbox, the item name, a rename action, and a delete action. Choosing rename changes that row into an edit form initialized with the current name; save commits through the central transition path, while cancel restores the unchanged row. Enter saves a valid edit and Escape cancels it. The packed checkbox remains represented by the canonical packed value after a rename. Item names are always inserted into the DOM as text through textContent or the framework equivalent that escapes text by default; names must never enter innerHTML, raw-HTML directives, or another markup-interpreting sink.

The filter is a two-option control with a programmatically exposed selected state. To pack hides packed rows only; it does not delete or alter them. Distinct empty messages cover an empty list and a To pack result with no remaining items. Buttons and inputs have text labels, and packed state is conveyed by the checkbox and text treatment rather than color alone.

Focus behavior is deterministic. Starting a rename focuses its input; saving or canceling returns focus to that row's rename action. A successful add clears and refocuses the add input. A pack toggle retains focus on its checkbox when the row remains visible. Before delete, or before marking an item packed in the To pack view, the app records the row's visible index. After that row disappears, focus moves to the next visible row's packed checkbox at the same index, then to the previous row's checkbox if there is no next row, and finally to the focusable list heading or empty-state status if no row remains. Because packed rows are absent from To pack, unpacking is available only in All; browser checks must switch to All before demonstrating unpack.

An always-editable text field per row was considered but rejected because it blurs the difference between an uncommitted draft and a saved rename. Name-based delete or update handlers were rejected because duplicate or renamed items could target the wrong row.

### Verify behavior at state, persistence, and browser boundaries

State-transition checks will cover default-unpacked add, state-preserving rename, ID-targeted delete, pack/unpack, duplicate names, the derived filters, both cryptographic UUID paths, and visible no-op failure when UUID generation is unavailable. Storage checks will cover valid round trips, missing data, malformed JSON, invalid schema or version, invalid or duplicate UUIDs, whitespace-only or untrimmed stored names, safe text-file export, empty and occupied recovery slots, explicit replacement of an older recovery copy, thrown reads or writes, read retry, and manual save retry. Multi-tab browser checks will assert normal valid replacement, the explicit keep-or-adopt choice when local state is unsaved, replacement focus behavior, and last-valid-list preservation plus restore/reset recovery for an invalid external write. Browser-level checks will perform the approved add, rename, pack, unpack, filter, delete, and refresh scenarios against the rendered page, including the defined focus handoff when a row disappears. A safe-rendering check will use a markup-like item name and assert that its literal text appears without creating an element or executing markup.

Browser-level layout checks and every review screenshot will use a 1440 by 900 CSS-pixel viewport as the supported desktop target. The implementation agent chooses the useful behavior-demonstration scenarios and screenshot count, provided the ordered evidence collectively shows a new item after add, a changed name, both packed states, the To pack view, an item gone after delete, and the same saved names and packed states after refresh. Evidence for delete must pair a screenshot with the target item present and a later screenshot with that item absent in the same scenario. Rename must similarly show the old and new names in one scenario, and refresh must show the saved list immediately before and after the reload in one scenario; a screenshot may satisfy more than one required state. Each independent scenario starts in a dedicated fresh browser context with both storage keys removed, reloads the hosted preview, verifies the empty-list state, performs its behavior steps, and captures all paired states before that context is reset for the next scenario. Screenshots are evidence of real browser behavior, not a replacement for automated checks; platform or infrastructure demonstration scenarios are excluded.

After the static build and behavior checks pass, the implementation agent calls the DEOS `publish_preview` capability with the finished static build directory. The trusted service publishes the directory through `static-preview-v1` as a run-owned, nonproduction Cloudflare Pages deployment and returns an immutable review URL. The design assumes this public review URL remains reachable without repository credentials for the full period in which the implementation pull request awaits human review; the checked context provides no longer retention guarantee. The agent runs the selected screenshot scenarios against that URL, verifies anonymous access after adding the URL and ordered screenshots to the implementation pull request, and hands off only while it loads. If it stops loading at any point before human review, the implementation author republishes the current reviewed build, reruns affected scenarios, and replaces the pull-request URL and affected screenshots. The published preview is review evidence only; no GitHub Actions workflow, GitHub Pages configuration, provider credential, or production release belongs in the repository.

## Failure Modes

| Failure | Required handling |
| --- | --- |
| Storage key is absent | Start with an empty list and no warning. |
| Saved JSON is malformed, has an unsupported version, contains an invalid or duplicate UUID, contains a name that is empty or not already trimmed, or otherwise fails schema validation | Do not render partial data or overwrite the primary value. Enter the blocked recovery state with download and confirmed reset actions. |
| Browser denies a storage read | Show an empty display, block mutations and writes so unread data cannot be clobbered, explain the preservation policy, and offer `Retry storage access`. |
| A storage write throws, including quota or policy failures | Keep the current tab state, show that recent changes are not saved, offer `Retry save`, and also retry the full current document on the next mutation. Keep the warning after repeated failure. |
| Another tab writes a valid document while this tab has no unsaved changes | Replace canonical items, cancel an open rename, retain the filter, announce the external update, and apply the same-item/next/previous/list-status focus rule. |
| Another tab writes a valid document while this tab has unsaved changes | Keep the local canonical list and failed-save warning, block further mutations, hold the latest external document in memory, and require `Keep my changes` or confirmed `Use other tab's list`; clear warnings and move focus only as defined for the chosen outcome. |
| Another tab removes the primary key | Treat removal as a valid empty external document and use the appropriate normal or unsaved-conflict path. |
| Another tab writes an invalid primary value | Keep the last valid canonical list visible but read-only, preserve the invalid raw value, and offer safe download plus confirmed restore-current-list or reset actions using the recovery-slot policy. |
| UUID generation is unavailable or throws | Reject add without mutating or writing, keep the submitted name, and show an accessible ID-generation error; never fall back to `Math.random()`. |
| The recovery key already contains a rejected value | Explain that the single slot retains only the newest rejection, offer a safe text download of the older value, and require explicit confirmation before replacing it. |
| Add or rename is blank after trimming | Keep the form open, do not mutate or write, and associate a validation message with the input. |
| An item name contains markup-like text | Render it as literal text through an escaping text sink; never interpret it as DOM markup. |
| An event references an ID no longer in the current list | Treat it as a no-op and do not write, avoiding mutation of a different row. |
| A delete or To pack toggle removes the focused row | Move focus to the next row, previous row, or focusable list status in that order. |
| To pack has no matching items | Render its dedicated “nothing left to pack” state while preserving all packed items in canonical state. |
| `publish_preview` rejects the build directory, the trusted publication fails, the returned URL does not load the reviewed build, or the URL is not anonymously accessible for the full pending-review period | The review is not ready. Correct the static build or publication input, call `publish_preview` again, replace the pull-request link, and rerun affected behavior scenarios and screenshots against the new immutable URL before handoff or review. Do not substitute a repository workflow, agent credentials, or a production deployment. |

## Risks / Trade-offs

- [Browser-local data can be cleared and does not follow the person to another browser or device] → Keep the product copy scoped to this browser and avoid implying account-backed durability.
- [A corrupt saved document cannot be safely rendered] → At startup block mutations; during use retain the last valid list read-only. Preserve and safely export the raw value, then require a confirmed backup-and-restore or backup-and-reset flow before replacement.
- [A write failure means visible state and refreshed state can differ] → Surface save status immediately, provide manual retry, and retry the full canonical document on every later mutation.
- [Near-simultaneous edits in two tabs can overwrite each other] → Converge normally sequenced writes through storage events, stop and ask before replacing known-unsaved local state, announce external changes, and state the remaining last-write-wins boundary explicitly.
- [The single recovery slot cannot retain an unlimited history of corrupt values] → Offer the previous copy for download and require explicit confirmation before retaining the newest value in its place.
- [The trusted preview retention period is not declared in the checked context] → Treat reachability through human review as a handoff assumption, verify anonymous access, and republish and relink if the URL expires before review.
- [Synchronous storage performs work on the UI thread] → Store only the small packing-list document and serialize once per deliberate list mutation; revisit the storage choice only if the scope grows substantially.
- [Duplicate names can look ambiguous] → Keep stable hidden IDs for targeting and ensure row controls are associated with the visible row; do not silently impose a uniqueness rule.
- [Desktop-only design may be awkward outside the review target] → Run layout checks and screenshots at the defined 1440 by 900 CSS-pixel viewport; do not add unapproved mobile behavior.

## Migration Plan

1. Ship the client with the `packing-list:v1` primary key and `packing-list:rejected:v1` recovery key, with no seed data. A first visit therefore starts empty.
2. Run state, storage, multi-tab conflict/recovery, UUID fallback/failure, focus, safe-export, and browser behavior checks at the 1440 by 900 CSS-pixel desktop viewport, including a real reload after mutations.
3. Build the exact implementation pull-request head as a finished static directory and call `publish_preview` with that directory. The trusted DEOS service publishes it through `static-preview-v1` and returns the immutable, run-owned nonproduction Cloudflare Pages URL.
4. Choose a useful set and count of behavior-demonstration scenarios. For each scenario, start from a dedicated clean browser context with both storage keys removed and run it against the hosted preview. Capture paired present/absent delete states, old/new rename states, and pre/post-refresh saved states within their respective scenarios before resetting for the next scenario. Collectively cover every screenshot behavior required by the delta spec; do not add platform or infrastructure scenarios.
5. Verify the immutable URL without repository credentials after adding it and the ordered real-app screenshots to the implementation pull request. Hand off on the explicit assumption that the URL will remain anonymously reachable for the full human-review period.
6. If the build or hosted result is wrong, or if the URL stops loading before human review, correct the client if needed, produce the current finished static build, and call `publish_preview` again; update the pull request to the new immutable URL and recapture affected screenshots. No production rollback is needed because the deployment is nonproduction and run-owned. Existing browser storage remains untouched so the corrected build can recover a valid list or rejected raw value.
