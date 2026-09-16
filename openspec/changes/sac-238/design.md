## Context

The approved proposal and packing-list-web-app delta spec define a new desktop-only packing-list page. The change has no server API or shared-data requirement; item names and packed state remain in one browser across refreshes. The implementation must also support a repeatable live-preview and screenshot review sequence. There is no prior design or repository guidance in the checked context.

## Goals / Non-Goals

**Goals:**

- Keep one canonical in-memory list and render every visible count, row, and empty state from it.
- Persist every successful list mutation locally and restore valid saved data before the first list render.
- Separate state transitions, browser storage, and presentation so the required behavior can be tested without relying only on screenshots.
- Make add, rename, delete, pack/unpack, and filter controls unambiguous in a desktop layout and usable by keyboard.
- Make persistence failures visible while leaving the current tab usable.

**Non-Goals:**

- Accounts, synchronization, server storage, collaboration, or cross-browser data transfer.
- Mobile-specific layout or interaction design.
- Reordering, quantities, categories, trip management, or undo history.
- Persisting transient interface state such as the selected filter, draft input, edit mode, or status messages.

## Decisions

Use a client-only single-page architecture with one canonical state owner and a versioned browser-storage boundary. The sections below define this choice, its data and event contracts, and the alternatives rejected.

## Component Diagram

The page will run entirely in the desktop browser. A single application root owns the current list and selected filter. It delegates persistence to a small storage adapter and supplies derived rows and event handlers to focused UI components.

~~~text
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

There is no network boundary in the event path. The preview is a deployment of the same static client used for review; it does not introduce a backend.

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
  id: string,       // stable, browser-generated identity
  name: string,     // trimmed, non-empty display text
  packed: boolean
}
~~~

The runtime adds only selectedFilter ("all" or "to-pack") and a persistence-status value. Neither is written to storage. A new item receives a collision-resistant browser-generated ID, its trimmed submitted name, and packed set to false. Items stay in insertion order. Duplicate names are allowed because identity and updates use id, not display text.

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

Filter change:
filter event -> update selectedFilter -> derive visible items -> render
             -> no storage write
~~~

The full document is replaced after each mutation rather than applying incremental storage operations. localStorage.setItem is synchronous, so one tab observes each mutation as a complete old or new JSON value. The UI does not claim a save succeeded until setItem returns. Keeping the in-memory mutation when a save fails lets the person continue working, while a persistent, non-blocking warning states that the latest changes may be lost on refresh. A later successful mutation writes the whole current document and clears the warning.

Debounced or unload-only saving was rejected because closing or refreshing before the timer or unload handler completes could violate the refresh requirement. Persisting the selected filter was rejected because the durable requirements cover item names and packed states, not view preference; startup therefore always opens All.

### Put all browser persistence behind a versioned adapter

The adapter owns one namespaced key, packing-list:v1. On read it accepts only an object with version 1 and an items array whose entries each have a non-empty string id, a string name that is non-empty and already equals its trimmed value, and a boolean packed value. IDs must also be unique across the array. Unknown top-level fields may be ignored, but a duplicate ID or any malformed entry invalidates the complete document so the app never renders a partially trusted list.

Missing storage produces an empty list. Invalid JSON, the wrong version, or an invalid shape also produces an empty in-memory list and a warning that saved data could not be loaded. The adapter leaves the unreadable value untouched until a person makes a list mutation; that mutation attempts to replace it with a valid document. Read and write access are wrapped because privacy settings, quota limits, or browser policy can throw even when localStorage exists.

A version field is retained despite the small model so later schema changes can be detected instead of silently misread. IndexedDB was rejected because the data is small, single-document, and synchronous startup is sufficient. Cookies were rejected because they are size-limited and would be sent to a host without adding value.

### Make row interactions explicit and state-preserving

Each row presents a labeled packed checkbox, the item name, a rename action, and a delete action. Choosing rename changes that row into an edit form initialized with the current name; save commits through the central transition path, while cancel restores the unchanged row. Enter saves a valid edit and Escape cancels it. The packed checkbox remains represented by the canonical packed value after a rename. Item names are always inserted into the DOM as text through textContent or the framework equivalent that escapes text by default; names must never enter innerHTML, raw-HTML directives, or another markup-interpreting sink.

The filter is a two-option control with a programmatically exposed selected state. To pack hides packed rows only; it does not delete or alter them. Distinct empty messages cover an empty list and a To pack result with no remaining items. Buttons and inputs have text labels, focus remains predictable after each action, and packed state is conveyed by the checkbox and text treatment rather than color alone.

An always-editable text field per row was considered but rejected because it blurs the difference between an uncommitted draft and a saved rename. Name-based delete or update handlers were rejected because duplicate or renamed items could target the wrong row.

### Verify behavior at state, persistence, and browser boundaries

State-transition checks will cover default-unpacked add, state-preserving rename, ID-targeted delete, pack/unpack, duplicate names, and the derived filters. Storage checks will cover valid round trips, missing data, malformed JSON, invalid schema or version, duplicate IDs, whitespace-only or untrimmed stored names, and thrown reads or writes. Browser-level checks will perform the approved add, rename, pack, unpack, filter, delete, and refresh scenarios against the rendered page. A safe-rendering check will use a markup-like item name and assert that its literal text appears without creating an element or executing markup.

Browser-level layout checks and every review screenshot will use a 1440 by 900 CSS-pixel viewport as the supported desktop target. Before each screenshot run, open the preview in a dedicated fresh browser context, remove the packing-list:v1 key if present, reload, and verify that the empty-list state appears. The review screenshots will then be captured from that same browser context and deployed preview as an ordered sequence. The sequence will preserve enough stable sample data to show: a newly added item, its renamed form, packed and unpacked rows, the To pack result, a deletion, and the same surviving names and packed states after refresh. Screenshots are evidence of the browser-level flow, not a replacement for automated behavior checks. Before handoff, add the working preview link and the ordered screenshot sequence to the final pull request description, then verify that the link opens the reviewed build and every image renders in sequence.

## Failure Modes

| Failure | Required handling |
| --- | --- |
| Storage key is absent | Start with an empty list and no warning. |
| Saved JSON is malformed, has an unsupported version, contains duplicate IDs, contains a name that is empty or not already trimmed, or otherwise fails schema validation | Start with an empty list, show a non-blocking load warning, and do not render partial data. |
| Browser denies a storage read | Start with an empty in-memory list and warn that saved data is unavailable. |
| A storage write throws, including quota or policy failures | Keep the current tab state, show that recent changes are not saved, and retry by writing the full current document on the next mutation. |
| Add or rename is blank after trimming | Keep the form open, do not mutate or write, and associate a validation message with the input. |
| An item name contains markup-like text | Render it as literal text through an escaping text sink; never interpret it as DOM markup. |
| An event references an ID no longer in the current list | Treat it as a no-op and do not write, avoiding mutation of a different row. |
| To pack has no matching items | Render its dedicated “nothing left to pack” state while preserving all packed items in canonical state. |
| Preview deployment is unavailable | The review cannot be considered complete; fix or replace the preview before collecting the final screenshot sequence. |

## Risks / Trade-offs

- [Browser-local data can be cleared and does not follow the person to another browser or device] → Keep the product copy scoped to this browser and avoid implying account-backed durability.
- [A corrupt saved document falls back to an empty screen] → Validate before render, warn clearly, retain the bad value until the next deliberate mutation, and test malformed inputs.
- [A write failure means visible state and refreshed state can differ] → Surface save status immediately and retry the full canonical document on every later mutation.
- [Synchronous storage performs work on the UI thread] → Store only the small packing-list document and serialize once per deliberate list mutation; revisit the storage choice only if the scope grows substantially.
- [Duplicate names can look ambiguous] → Keep stable hidden IDs for targeting and ensure row controls are associated with the visible row; do not silently impose a uniqueness rule.
- [Desktop-only design may be awkward outside the review target] → Run layout checks and screenshots at the defined 1440 by 900 CSS-pixel viewport; do not add unapproved mobile behavior.

## Migration Plan

1. Ship the client with the namespaced packing-list:v1 key and no seed data. A first visit therefore starts empty.
2. Run state, storage, and browser behavior checks at the 1440 by 900 CSS-pixel desktop viewport, including a real reload after mutations.
3. Deploy the static client to the review preview. Start a dedicated fresh browser context, remove packing-list:v1 if present, reload to verify the empty state, and then execute the screenshot sequence there.
4. Add the working preview link and ordered screenshots to the final pull request description; verify the link and images before requesting human review.
5. Roll back by restoring the previous static deployment. Rollback does not need a data migration and should leave packing-list:v1 untouched, so a corrected release can recover the valid list later.
