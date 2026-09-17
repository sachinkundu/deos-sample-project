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

The Worker owns both API routes and static delivery so the browser needs no CORS policy or separate service URL. Requests under `/api/` are never passed to static assets. Other `GET` requests use `ASSETS.fetch`.

The browser keeps only transient view state: list metadata, selected snippet, one pending save tuple, pending actions, and the latest message. It does not persist snippets in browser storage. Every page load rebuilds the list from `GET /api/snippets`, so refresh and fresh-browser behavior exercise cloud persistence.

## Event flow

### API contract and validation

| Action | Route | Successful result | Error behavior |
| --- | --- | --- | --- |
| List | `GET /api/snippets` | `200` with at most 100 D1-backed metadata items ordered by `created_at DESC, id DESC` | `500` with a list-specific error |
| Save | `POST /api/snippets` | `201` for a new save or `200` for an exact active replay, after D1 and R2 are confirmed | `400` invalid input/ID, `409` conflict or capacity limit, `413` oversized request, `500` storage failure |
| Read | `GET /api/snippets/:id` | `200` with metadata and the body read from the row's R2 key | `400` invalid ID, `404` no row, `409` incomplete delete, `500` storage failure |
| Delete | `DELETE /api/snippets/:id` | Idempotent `204` only after the snippet row and every object in its isolated R2 prefix are absent | `400` invalid ID, `409` save still creating, `500` unconfirmed cleanup |

Before any D1 query or R2 key construction, the Worker requires the ID to be exactly the lowercase canonical UUIDv4 form `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`, with hexadecimal characters in every `x` position. Path IDs and JSON IDs use the same validator. Invalid values return `400 INVALID_ID`, so `/`, alternate encodings, case variants, and prefix overlap never reach storage.

For `POST`, the Worker reads the request stream through a 512 KiB cap and cancels it as soon as the cap is exceeded. It then limits title to 200 UTF-8 bytes and text to 65,536 UTF-8 bytes. Blank checks trim only for validation; accepted title and text are preserved exactly. The browser mirrors these checks, while the Worker is authoritative. API errors have `{ "error": { "code", "message", "field"? } }` and never expose internal details.

A save operation reserves capacity before R2 is touched. Across all non-deleted operation records, D1 permits at most 100 reserved objects and 1,048,576 reserved body bytes. The ledger itself permits at most 1,000 lifetime operation IDs, including zero-byte deletion and failure tombstones. These hard ceilings bound active, in-flight, abandoned, and unindexed storage. At capacity the API returns `409 SHELF_LIMIT_REACHED` or `409 ACTIVITY_LIMIT_REACHED`; no R2 write occurs. The fixed 100-snippet ceiling also bounds the unpaginated list.

### Start and read

1. The page requests the list and shows a loading state. It replaces the list only on success; an initial failure leaves an empty list with “Snippets could not be loaded. Try again.”
2. Selecting a title records its ID and requests that ID. The Worker looks up a listed D1 row, obtains its `object_key`, and reads that exact R2 object.
3. A response updates the reader only if its ID still matches the current selection. Read failure keeps the title selected, clears stale body text, and shows a read-specific retry message.
4. The body uses a text node in a whitespace-preserving element. The list, selected heading, announcements, and confirmation/error messages also place every saved title through `textContent` or `document.createTextNode()`. Fixed message text and title nodes are composed separately; no saved title or body is interpolated into `innerHTML`.

### Save

1. The browser validates the fields, generates one canonical UUIDv4 for the save intent, and keeps the immutable `{ id, title, text }` tuple in pending view state. An unconfirmed retry always reuses that tuple. A later intentional save receives a new ID.
2. The Worker validates the full request, computes SHA-256 over an unambiguous length-delimited title/body payload, computes the body SHA-256 and byte count, and derives the only permitted object key: `snippets/<id>/<body-sha256>.txt`.
3. Before any R2 call, the Worker inserts a `creating` operation containing the payload fingerprint, exact key, reserved bytes, and a random owner token. The insert's triggers enforce all row, object, and byte ceilings atomically. An existing operation with a different fingerprint returns `409 IDEMPOTENCY_CONFLICT`. For an exact `active` replay, the Worker confirms the matching snippet row and R2 object, rechecks that the operation is still `active`, and returns `200` without writing. `deleting`, `deleted`, or `failed` returns a non-retryable conflict and never recreates the snippet.
4. Only the request whose owner token created the reservation may write R2. Another request that sees `creating` never writes or deletes an object: if the expected object is absent it returns `409 SAVE_IN_PROGRESS`; if the object is present, it may finish the D1 activation using the stored immutable metadata. There is no lease takeover and no shared-candidate cleanup.
5. The owner writes the exact body to the reserved key. It then rechecks its owner token, inserts the saved `snippets` row, and changes the operation from `creating` to `active`. If the snippet insert already exists with the same fingerprint, activation may continue; a mismatch is an integrity error. The title becomes list-visible only when the operation is `active`. The Worker returns success only after the active rows match and the R2 object exists.
6. If the R2 write definitely fails and prefix inspection confirms no object exists, the owner changes the operation to `failed` and releases its reserved bytes before returning `500`. If the outcome or prefix cannot be confirmed, the operation remains `creating` with its reservation charged; this bounds any possible object and prevents a second writer. A later exact retry can activate an already-present object but cannot issue another put while state remains `creating`.
7. After `200` or `201`, the browser immediately inserts the returned metadata into its list by ID, selects it, clears the pending tuple and form, then refreshes the list and reads through the normal R2-backed route. If the response is interrupted, list reconciliation by ID or exact replay returns the one active row. A failed refresh keeps the confirmed title visible; a failed read clears stale body text. A definite failed save preserves the entered values and shows no success state.

### Delete

1. The browser sends the selected canonical ID and keeps its confirmed state visible while the request is pending.
2. The Worker reads the operation fence. `creating` returns `409 SAVE_IN_PROGRESS` and does not touch R2; `failed` or an unknown ID has no snippet row and can return idempotent `204` after confirming the canonical prefix empty. `deleted` follows the same idempotent check. An `active` operation is atomically claimed as `deleting`; a concurrent `deleting` request joins that forward-only cleanup. POST replay can no longer write or activate after this transition.
3. The Worker marks any saved row `deleting`, removes every object under the isolated `snippets/<id>/` prefix, and deletes the saved `snippets` row. It never restores an object. Concurrent delete requests perform the same idempotent steps.
4. After D1 confirms that the saved row is absent and R2 confirms the prefix is empty, the Worker changes the operation to permanent `deleted`, clears its reserved bytes and owner token, and returns `204`. The small tombstone is not a saved snippet row and is excluded from list/read; it prevents every delayed or replayed POST for that ID from recreating deleted data.
5. Any unconfirmed store call leaves the operation `deleting` and its bytes reserved, returns `500`, and reports that deletion was not confirmed. Retry resumes cleanup. On `204`, including retry after a lost response, the browser removes only that ID, clears its reader, announces success, and reloads the list.

The operation state is the ordering fence: `creating → active → deleting → deleted`, with `creating → failed` only after absence is proven. No backward transition exists. Therefore a delete cannot pass an in-flight save, a save replay cannot pass a delete, and no request cleans an object owned by another payload.

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
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'deleting')),
  FOREIGN KEY (id) REFERENCES snippet_operations(id)
);

CREATE INDEX IF NOT EXISTS snippets_created_at
  ON snippets (created_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS operations_enforce_capacity
BEFORE INSERT ON snippet_operations
WHEN (SELECT COUNT(*) FROM snippet_operations) >= 1000
  OR (SELECT COUNT(*) FROM snippet_operations
      WHERE reserved_bytes > 0) >= 100
  OR COALESCE((SELECT SUM(reserved_bytes)
               FROM snippet_operations), 0)
       + NEW.reserved_bytes > 1048576
BEGIN
  SELECT RAISE(ABORT, 'SHELF_CAPACITY_REACHED');
END;
```

The Worker validates canonical IDs because SQLite checks are not used as a substitute for the route/body validator. Operation insertion is the sole gateway to an R2 put, and one operation has one immutable key and at most one body. Consequently every possible R2 object is represented in the reserved-byte sum before it can exist. A failed or deleting operation retains reservation until absence is confirmed; cleanup failure cannot evade the cap.

List queries join `snippets` to `snippet_operations` and include only operation states `active` or `deleting`. They return `id`, `title`, `created_at`, and derived `deletePending`; key, fingerprint, token, and raw state stay internal. Selected bodies always use `snippets.object_key`. Deleted operation tombstones use zero reserved bytes and cannot appear in list/read.

## Decisions

### One Worker for UI and API

The temporary Worker serves built assets and `/api` routes. This stays within the declared publisher capability and avoids CORS and a second deployment. Requests under `/api/` never fall through to `ASSETS.fetch`.

### Reserve in D1 before writing R2

D1 is the serialization point. A bounded, non-stealable `creating` record is written before R2, so two requests can never become body writers for one ID and every candidate consumes quota. R2-first creation with compensation was rejected because a cleanup failure is unbounded and concurrent cleanup can remove a winner's body. A stuck reservation can consume capacity, but cannot corrupt saved data or exceed the hard limits; this is the safer trade-off for a disposable canary.

### Permanent bounded tombstones fence deletion

Successful deletion removes the saved index row and body, then retains only a zero-byte operation tombstone. This makes delayed save replay distinguish “never used” from “already deleted.” Pruning tombstones was rejected because it would reopen stale IDs. The 1,000-operation lifetime ceiling bounds D1 growth; reaching it produces a clear error and the disposable environment can be reprovisioned rather than adding account or maintenance infrastructure.

### Server-authoritative validation and text-safe rendering

Client checks improve feedback, but Worker validation and D1 triggers protect storage. Canonical UUID validation isolates R2 prefixes. Titles and bodies remain opaque strings and every UI occurrence uses text-safe DOM APIs. Sanitizing or rendering markup was rejected because the requirement is to preserve plain text, including markup-looking input.

## Failure modes

| Failure | Required handling |
| --- | --- |
| Blank/whitespace field or malformed JSON | Return field-specific `400`; create no operation, snippet row, or R2 object. |
| ID is not exact lowercase canonical UUIDv4 | Return `400 INVALID_ID` before D1 or R2; never construct a key/prefix. |
| Request/title/text exceeds its byte limit | Cancel or reject with `413`/`400`; touch no storage. |
| Capacity would exceed 100 objects, 1,048,576 bytes, or 1,000 lifetime operations | D1 rejects reservation before R2; return a clear `409` capacity message. |
| Same ID is replayed with different payload | Return `409 IDEMPOTENCY_CONFLICT`; do not write or delete R2. |
| Same ID is still `creating` and object is absent | Return `409 SAVE_IN_PROGRESS`; retain reservation and issue no second put. |
| R2 save definitely fails with empty prefix | Mark operation `failed`, release reservation, preserve form, and report failed save. |
| R2 save or inspection is indeterminate | Keep `creating` and its reservation; report unconfirmed save and allow exact reconciliation only. |
| D1 activation fails after R2 succeeds | Keep tracked `creating`; exact replay may activate the existing object without another put. |
| Save response is lost after activation | Exact replay returns the original active row; no duplicate is created. |
| Delete meets `creating` save | Return `409 SAVE_IN_PROGRESS`; do not pass or cancel the save. |
| Delete fails after its forward transition | Keep `deleting` and reserved bytes; retry removes prefix and saved row, never restores data. |
| Delete response is lost | Retry sees `deleting`/`deleted`, finishes confirmation, and returns idempotent `204`. |
| D1 row is absent on read | Return `404`, clear stale selected data, and say the snippet no longer exists. |
| R2 body is absent for an active row | Return read failure, render no stale body, and log the indexed mismatch. |
| Browser response is interrupted/malformed | Keep confirmed UI state; save reconciles the same ID and delete reports unconfirmed status before idempotent retry. |
| Reads finish out of order | Ignore a body response whose ID is no longer selected. |
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
3. Collect review scenarios in one order with application and harness fixed. Start every scenario in a fresh browser context with declared known data. The persistence scenario may open an additional fresh context against that same state. Capture each result before resetting for the next scenario.
4. Cover blank-input messaging, two saves, correct body selection, refresh persistence, one deletion, and survival of the other snippet. Capture matching saved-index/operation-state D1 readback and R2 prefix/object inspection while scenario data exists.
5. Publish the ordered evidence to the implementation pull request, then remove the temporary resources while leaving evidence available. Keep the implementation pull request unmerged.

Rollback is deletion of the disposable environment. If validation fails before evidence publication, discard it, correct the implementation, and provision a clean one; no production data or schema rollback exists.
