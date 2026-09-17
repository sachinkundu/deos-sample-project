## Context

See `proposal.md` for motivation and `specs/text-snippet-shelf/spec.md` for required behavior. The approved application is a small, self-contained Worker deployment: built static assets for the one-screen desktop UI, a same-origin Worker API, one D1 binding, and one R2 binding. The temporary environment is the only deployment target; there is no production migration or release.

D1 and R2 do not provide a shared transaction. The design therefore reserves every save in D1 before any R2 write and retains a bounded operation record after deletion. The saved snippet row is still removed on successful delete; the separate operation tombstone only fences stale save retries and is never part of the snippet list.

## Goals / Non-Goals

**Goals:**

- Keep browser, API, D1, and R2 responsibilities narrow and independently testable.
- Associate each D1 index row with exactly one R2 text object through a canonical UUID.
- Make save and delete replay-safe without allowing concurrent requests to restore deleted data.
- Bound each unauthenticated request, all possible R2 bodies, active snippets, and lifetime operation records.
- Return action-specific errors and update browser state only after an API operation reaches a confirmed state.
- Make the two-store state easy to verify from browser evidence, D1 readback, and R2 inspection.

**Non-Goals:**

- General account, authorization, synchronization, search, collaboration, or editing architecture.
- A durable public deployment, CI deployment workflow, or provider setup outside the supported temporary environment.
- Automatic recovery of an indeterminate abandoned save reservation. Such a reservation remains bounded and visible to retries until the disposable environment is removed.

## Component diagram

```text
+--------------------------- desktop browser ---------------------------+
| One page                                                             |
|  create form | snippet-title list | selected plain-text reader        |
|       \              |                         /                     |
|        +------------- same-origin fetch -----------------------------+
+--------------------------------|--------------------------------------+
                                 v
+------------------------ Cloudflare Worker ----------------------------+
| Static route fallback -> ASSETS.fetch                                 |
| /api/snippets -> validation -> operation coordinator                  |
|                                  |                 |                  |
+----------------------------------|-----------------|------------------+
                                   v                 v
+---------------------- one D1 binding --------------------+   +----------------+
| snippets saved index | snippet_operations fence/quota   |   | R2 BODIES      |
+---------------------------------------------------------+   | UTF-8 text     |
                                                              +----------------+
```

The Worker owns both API routes and static delivery so the browser needs no CORS policy or separate service URL. Requests under `/api/` are never passed to static assets. A known API path with an unsupported method returns JSON `405 METHOD_NOT_ALLOWED` with an `Allow` header; an unknown `/api/` path returns JSON `404 NOT_FOUND`. Outside `/api/`, `GET` and `HEAD` use `ASSETS.fetch`, including its normal missing-asset response, while every other method returns `405` and never receives the app shell.

The browser keeps only transient view state: list metadata, selected snippet, one pending save tuple, pending actions, and the latest message. It does not persist snippets in browser storage. Every page load rebuilds the list from `GET /api/snippets`, so refresh and fresh-browser behavior exercise cloud persistence.

## Event flow

### API contract and validation

| Action | Route | Successful result | Error behavior |
| --- | --- | --- | --- |
| List | `GET /api/snippets` | `200` with at most 100 D1-backed metadata items ordered by `created_at DESC, id DESC` | `500` with a list-specific error |
| Save | `POST /api/snippets` | `201` for a new save or `200` for an exact active replay, after D1 and R2 are confirmed | `400` invalid input/ID, `409` conflict or capacity limit, `413` oversized request, `500` storage failure |
| Read | `GET /api/snippets/:id` | `200` with metadata and the body read from the row's R2 key | `400` invalid ID, `404` no row, `409` incomplete delete, `500` storage failure |
| Delete | `DELETE /api/snippets/:id` | Idempotent `204` only for an existing `active`, `deleting`, or `deleted` operation after the snippet row and every object in its isolated R2 prefix are absent | `400` invalid ID, `404` no saved operation, `409` save still creating, `500` unconfirmed cleanup |

Before any D1 query or R2 key construction, the Worker requires the ID to be exactly the lowercase canonical UUIDv4 form `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`, with hexadecimal characters in every `x` position. Path IDs and JSON IDs use the same validator. Invalid values return `400 INVALID_ID`, so `/`, alternate encodings, case variants, and prefix overlap never reach storage.

For `POST`, the Worker reads the request stream through a 512 KiB cap and cancels it as soon as the cap is exceeded. It then limits title to 200 UTF-8 bytes and text to 65,536 UTF-8 bytes. Blank checks trim only for validation; accepted title and text are preserved exactly. The browser mirrors these checks, while the Worker is authoritative. API errors have `{ "error": { "code", "message", "field"? } }` and never expose internal details.

A save operation reserves capacity before R2 is touched. Across all non-deleted operation records, D1 permits at most 100 reserved objects and 1,048,576 reserved body bytes. The ledger itself permits at most 1,000 lifetime operation IDs, including zero-byte deletion and failure tombstones. These hard ceilings bound active, in-flight, abandoned, and unindexed storage. The insert trigger checks the lifetime-operation ceiling first and raises `ACTIVITY_LIMIT_REACHED`; otherwise either the object-count or byte ceiling raises `SHELF_LIMIT_REACHED`. The Worker maps those exact trigger messages to same-named `409` API codes, and no R2 write occurs. The fixed 100-snippet ceiling also bounds the unpaginated list.

All lifecycle transitions use D1's transactional `batch()` for related statements or one conditional statement when only one row changes. Every `UPDATE` includes the expected prior state (and owner token where ownership is required), and its affected-row count must be one; zero rows means the precondition was lost and the request stops, reloads the operation, and follows the newly observed state. A batch that inserts the snippet row and activates its operation is one D1 transaction, so no competing transition can interleave its statements and a statement error rolls the batch back. No read followed by an unconditional write is used as a lifecycle fence. R2 calls remain outside D1 transactions; the durable operation state controls which compensating or resume step is allowed.

### Start and read

1. The page requests the list and shows a loading state. It replaces the list only on success; an initial failure leaves an empty list with “Snippets could not be loaded. Try again.”
2. Selecting a title records its ID and requests that ID. The Worker looks up a listed D1 row, obtains its `object_key`, and reads that exact R2 object.
3. A response updates the reader only if its ID still matches the current selection. Read failure keeps the title selected, clears stale body text, and shows a read-specific retry message.
4. The body uses a text node in a whitespace-preserving element. The list, selected heading, announcements, and confirmation/error messages also place every saved title through `textContent` or `document.createTextNode()`. Fixed message text and title nodes are composed separately; no saved title or body is interpolated into `innerHTML`.

### Save

1. The browser validates the fields, generates one canonical UUIDv4 for the save intent, and keeps the immutable `{ id, title, text }` tuple in pending view state. An unconfirmed retry always reuses that tuple. A later intentional save receives a new ID.
2. The Worker validates the full request, computes SHA-256 over an unambiguous length-delimited title/body payload, computes the body SHA-256 and byte count, and derives the only permitted object key: `snippets/<id>/<body-sha256>.txt`.
3. Before any R2 call, the Worker inserts a `creating` operation containing the payload fingerprint, exact key, reserved bytes, and a random owner token. The insert's trigger enforces all row, object, and byte ceilings in that statement. An existing operation with a different fingerprint returns `409 IDEMPOTENCY_CONFLICT`. For an exact `active` replay, the Worker confirms the matching snippet row and R2 object, rechecks immediately before responding that the operation is still `active`, and returns `200` without writing. This read-only replay cannot authorize a state change; if the recheck no longer sees `active`, it follows the new state instead. `deleting`, `deleted`, or `failed` returns a non-retryable conflict and never recreates the snippet.
4. Only the request whose owner token created the reservation may write R2. Another request that sees `creating` never writes or deletes an object: if the expected object is absent it returns `409 SAVE_IN_PROGRESS`; if the object is present, it may finish the D1 activation using the stored immutable metadata. There is no lease takeover and no shared-candidate cleanup.
5. The owner writes the exact body to the reserved key. It then runs one transactional D1 batch: an `INSERT ... SELECT` creates the `snippets` row only while the matching operation is still `creating` with that owner token, and a conditional `UPDATE ... WHERE id = ? AND state = 'creating' AND owner_token = ?` changes the operation to `active`. Both statements use the same guard and must each affect one row for this request to report activation; if both affect zero, the request lost the precondition, made no change, and reloads the operation, while any statement error rolls the batch back. An exact retry that finds the expected R2 object uses the same batch with the stored payload fingerprint as its guard; D1 serialization lets only one activation commit. If a snippet row already exists outside a matching active operation, the Worker reports an integrity error rather than advancing state. The title becomes list-visible only when the operation is `active`. The Worker returns success only after the active rows match and the R2 object exists.
6. If the R2 write definitely fails and prefix inspection confirms no object exists, the owner changes the operation to `failed` and releases its reserved bytes before returning `500`. If the outcome or prefix cannot be confirmed, the operation remains `creating` with its reservation charged; this bounds any possible object and prevents a second writer. A later exact retry can activate an already-present object but cannot issue another put while state remains `creating`.
7. After `200` or `201`, the browser immediately inserts the returned metadata into its list by ID, selects it, clears the pending tuple and form, then refreshes the list and reads through the normal R2-backed route. If the response is interrupted, list reconciliation by ID or exact replay returns the one active row. A failed refresh keeps the confirmed title visible; a failed read clears stale body text. A definite failed save preserves the entered values and shows no success state.

### Delete

1. The browser sends the selected canonical ID and keeps its confirmed state visible while the request is pending.
2. The Worker reads the operation fence. `creating` returns `409 SAVE_IN_PROGRESS` and does not touch R2. A missing operation or a `failed` save returns `404` and does not claim deletion succeeded; this is safe because the browser offers delete only for a D1-listed saved snippet. `deleted` follows the idempotent absence check. For `active`, one conditional `UPDATE ... WHERE id = ? AND state = 'active'` claims `deleting`; a one-row result owns the transition, while a zero-row result reloads the operation and follows `deleting` or `deleted`. A concurrent `deleting` request joins that forward-only cleanup. POST replay can no longer write or activate after the committed transition.
3. The Worker removes every object under the isolated `snippets/<id>/` prefix and deletes the saved `snippets` row. It never restores an object. Concurrent delete requests perform the same idempotent steps. `snippet_operations.state` is the only lifecycle state; the index row has no duplicate state to update.
4. After D1 confirms that the saved row is absent and R2 confirms the prefix is empty, the Worker changes the operation to permanent `deleted`, clears its reserved bytes and owner token, and returns `204`. The small tombstone is not a saved snippet row and is excluded from list/read; it prevents every delayed or replayed POST for that ID from recreating deleted data.
5. Any unconfirmed store call leaves the operation `deleting` and its bytes reserved, returns `500`, and reports that deletion was not confirmed. Retry resumes cleanup. On `204`, including retry after a lost response, the browser removes only that ID, clears its reader, announces success, and reloads the list.

The operation state is the ordering fence: `creating → active → deleting → deleted`, with `creating → failed` only after absence is proven. No backward transition exists. A successful delete is therefore always fenced by a pre-existing operation, a delete cannot pass an in-flight save, a save replay cannot pass a delete, and no request cleans an object owned by another payload. An unknown-ID delete returns `404`, so it makes no deletion guarantee that a later first save could violate.

## Minimal data model

Both tables live in the one provisioned D1 binding. `snippets` is the saved index required by the specification; `snippet_operations` is bounded coordination metadata and is never returned as shelf content.

```sql
CREATE TABLE IF NOT EXISTS snippet_operations (
  id TEXT PRIMARY KEY NOT NULL,
  payload_sha256 TEXT NOT NULL,
  object_key TEXT NOT NULL,
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes BETWEEN 0 AND 65536),
  state TEXT NOT NULL CHECK (state IN
    ('creating', 'active', 'deleting', 'deleted', 'failed')),
  owner_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  payload_sha256 TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  body_bytes INTEGER NOT NULL CHECK (body_bytes BETWEEN 1 AND 65536),
  created_at TEXT NOT NULL,
  FOREIGN KEY (id) REFERENCES snippet_operations(id)
);

CREATE INDEX IF NOT EXISTS snippets_created_at
  ON snippets (created_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS operations_enforce_capacity
BEFORE INSERT ON snippet_operations
BEGIN
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM snippet_operations) >= 1000
      THEN RAISE(ABORT, 'ACTIVITY_LIMIT_REACHED')
    WHEN (SELECT COUNT(*) FROM snippet_operations
          WHERE reserved_bytes > 0) >= 100
      OR COALESCE((SELECT SUM(reserved_bytes)
                   FROM snippet_operations), 0)
           + NEW.reserved_bytes > 1048576
      THEN RAISE(ABORT, 'SHELF_LIMIT_REACHED')
  END;
END;
```

The Worker validates canonical IDs because SQLite checks are not used as a substitute for the route/body validator. Operation insertion is the sole gateway to an R2 put, and one operation has one immutable key and at most one body. Consequently every possible R2 object is represented in the reserved-byte sum before it can exist. A failed or deleting operation retains reservation until absence is confirmed; cleanup failure cannot evade the cap.

`snippet_operations.state` is authoritative for every lifecycle decision; `snippets` contains index data only. List queries join the tables and include operation states `active` or `deleting`. They return `id`, `title`, `created_at`, and `deletePending`, derived as `operation.state = 'deleting'`; key, fingerprint, token, and raw state stay internal. The browser shows a `deletePending` title with a “Deleting…” marker, disables selection and further delete actions for it, and clears the reader if that ID had been selected. Read queries join the tables, return the R2 body only when operation state is `active`, return `409 DELETE_IN_PROGRESS` for `deleting`, and return `404` for all other or absent states. Selected bodies always use `snippets.object_key`. Deleted operation tombstones use zero reserved bytes and cannot appear in list/read.

## Decisions

### One Worker for UI and API

The temporary Worker serves built assets and `/api` routes. This stays within the declared publisher capability and avoids CORS and a second deployment. Requests under `/api/` never fall through to `ASSETS.fetch`.

### Reserve in D1 before writing R2

D1 is the serialization point. A bounded, non-stealable `creating` record is written before R2, so two requests can never become body writers for one ID and every candidate consumes quota. R2-first creation with compensation was rejected because a cleanup failure is unbounded and concurrent cleanup can remove a winner's body. A stuck reservation can consume capacity, but cannot corrupt saved data or exceed the hard limits; this is the safer trade-off for a disposable canary.

### Permanent bounded tombstones fence deletion

Successful deletion of an existing saved operation removes the saved index row and body, then retains only a zero-byte operation tombstone. This makes delayed save replay distinguish “never used” from “already deleted.” Unknown IDs return `404` rather than pretending to establish a fence. Pruning tombstones was rejected because it would reopen stale IDs. The 1,000-operation lifetime ceiling bounds D1 growth; reaching it produces a clear error and the disposable environment can be reprovisioned rather than adding account or maintenance infrastructure.

### Server-authoritative validation and text-safe rendering

Client checks improve feedback, but Worker validation and D1 triggers protect storage. Canonical UUID validation isolates R2 prefixes. Titles and bodies remain opaque strings and every UI occurrence uses text-safe DOM APIs. Sanitizing or rendering markup was rejected because the requirement is to preserve plain text, including markup-looking input.

## Failure modes

| Failure | Required handling |
| --- | --- |
| Blank/whitespace field or malformed JSON | Return field-specific `400`; create no operation, snippet row, or R2 object. |
| ID is not exact lowercase canonical UUIDv4 | Return `400 INVALID_ID` before D1 or R2; never construct a key/prefix. |
| Request/title/text exceeds its byte limit | Cancel or reject with `413`/`400`; touch no storage. |
| Lifetime operations would exceed 1,000 | D1 raises `ACTIVITY_LIMIT_REACHED` before R2; return same-named `409`. |
| Reserved objects would exceed 100 or reserved bytes would exceed 1,048,576 | D1 raises `SHELF_LIMIT_REACHED` before R2; return same-named `409`. |
| Same ID is replayed with different payload | Return `409 IDEMPOTENCY_CONFLICT`; do not write or delete R2. |
| Same ID is still `creating` and object is absent | Return `409 SAVE_IN_PROGRESS`; retain reservation and issue no second put. |
| R2 save definitely fails with empty prefix | Mark operation `failed`, release reservation, preserve form, and report failed save. |
| R2 save or inspection is indeterminate | Keep `creating` and its reservation; report unconfirmed save and allow exact reconciliation only. |
| D1 activation fails after R2 succeeds | Keep tracked `creating`; exact replay may activate the existing object without another put. |
| Save response is lost after activation | Exact replay returns the original active row; no duplicate is created. |
| Delete meets `creating` save | Return `409 SAVE_IN_PROGRESS`; do not pass or cancel the save. |
| Delete names an unknown ID or failed save | Return `404`; do not report deletion success or create a tombstone. |
| Delete fails after its forward transition | Keep `deleting` and reserved bytes; retry removes prefix and saved row, never restores data. |
| Delete response is lost | Retry sees `deleting`/`deleted`, finishes confirmation, and returns idempotent `204`. |
| D1 row is absent on read | Return `404`, clear stale selected data, and say the snippet no longer exists. |
| R2 body is absent for an active row | Return read failure, render no stale body, and log the indexed mismatch. |
| Browser response is interrupted/malformed | Keep confirmed UI state; save reconciles the same ID and delete reports unconfirmed status before idempotent retry. |
| Reads finish out of order | Ignore a body response whose ID is no longer selected. |
| A listed row is `deletePending` | Show it disabled with “Deleting…”, do not read it, and clear its stale reader content. |
| Unsupported method or unknown API path | Return `405` with `Allow` for a known route/method mismatch or JSON `404` for an unknown `/api/` path; never call `ASSETS.fetch`. |
| Static asset request fails | Return the asset response as-is; never rewrite an `/api` error as the app shell. |

## Risks / Trade-offs

- **[An abandoned indeterminate save consumes quota]** → Keep it charged so any possible R2 object remains bounded; surface an unconfirmed status and rely on disposable-environment cleanup rather than unsafe lease takeover.
- **[The operation ledger limits the environment to 1,000 save identities]** → Show `ACTIVITY_LIMIT_REACHED`; this is an explicit abuse bound for a short-lived canary, not a product-scale policy.
- **[No login allows anyone with the temporary URL to mutate canary data]** → Enforce canonical IDs, request/value limits, pre-write storage reservation, hard aggregate ceilings, synthetic data, and prompt post-proof cleanup.
- **[Concurrent mutation can make one browser stale]** → Address operations by immutable ID, use operation states as fences, and reload the authoritative list after confirmed mutations.
- **[Temporary environment removal eliminates live reproduction]** → Capture ordered browser screenshots and matching D1/R2 readback before cleanup, retaining proof in the implementation pull request.

## Migration Plan

1. Build the static page and bundled Worker, then apply the repeatable two-table migration in the one provisioned D1 binding. Provision exactly one D1 and one R2 binding.
2. Publish through the supported temporary Worker publisher; add no CI workflow, production account setup, or unsupported infrastructure.
3. Collect review scenarios in one order with application and harness fixed. Start every scenario in a fresh browser context with declared known data. In the persistence scenario, save `Greeting` and `Sign-off`, delete `Sign-off`, then require a second fresh browser context against that unchanged cloud state before any reset. Capture each result before resetting for the next scenario.
4. Cover blank-input messaging, two saves, correct body selection, refresh persistence, one deletion, survival of `Greeting`, and the required fresh-context capture showing that `Greeting` remains readable while deleted `Sign-off` does not return. Capture matching saved-index/operation-state D1 readback and R2 prefix/object inspection while that scenario data exists.
5. Publish the ordered evidence to the implementation pull request, then remove the temporary resources while leaving evidence available. Keep the implementation pull request unmerged.

Rollback is deletion of the disposable environment. If validation fails before evidence publication, discard it, correct the implementation, and provision a clean one; no production data or schema rollback exists.
