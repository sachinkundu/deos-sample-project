## Context

See `proposal.md` for motivation and `specs/text-snippet-shelf/spec.md` for required behavior. The approved application is a small, self-contained Worker deployment: built static assets for the one-screen desktop UI, a same-origin Worker API, one D1 binding, and one R2 binding. The temporary environment is the only deployment target; there is no production migration or release.

D1 and R2 do not provide a shared transaction. The design therefore reserves every save in D1 before any R2 write and retains a bounded operation record after deletion. A `deleting` record may project only its canonical ID, copied title, reservation timestamp, and `deletePending: true` as a recovery item until cleanup is confirmed. The saved snippet row is still removed on successful delete; the resulting `deleted` tombstone only fences stale save retries and never appears in the snippet list.

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
- A lease, timer, or background takeover for an abandoned save reservation. An exact browser retry proves ownership with its original attempt token; a reservation whose tuple is lost remains bounded until the disposable environment is removed and does not prevent a later intentional save with a new ID.
- A timer, queue, alarm, or background service for incomplete deletes. Recovery is an explicit user retry through the existing delete route.

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

The browser keeps only transient view state: list metadata, selected snippet, one pending save tuple including its attempt token, IDs with a request currently in flight, and the latest message. An in-flight delete ID is distinct from the server's persisted `deletePending` flag. The browser does not persist snippets or attempt tokens in browser storage. Every page load rebuilds the list from `GET /api/snippets`, so refresh and fresh-browser behavior exercise cloud persistence.

## Event flow

### API contract and validation

| Action | Route | Successful result | Error behavior |
| --- | --- | --- | --- |
| List | `GET /api/snippets` | `200` with at most 100 D1-backed active items or incomplete-delete recovery items, ordered by `created_at DESC, id DESC` | `500` with a list-specific error |
| Save | `POST /api/snippets` | `201` for a new save or `200` for an exact active replay, after D1 and R2 are confirmed | `400` invalid input/ID, `409` conflict or capacity limit, `413` oversized request, `500` storage failure |
| Read | `GET /api/snippets/:id` | `200` with metadata and the body read from the row's R2 key | `400` invalid ID, `404` no row, `409` incomplete delete, `500` storage failure |
| Delete | `DELETE /api/snippets/:id` | Idempotent `204` only for an existing `active`, `deleting`, or `deleted` operation after the snippet row and every object in its isolated R2 prefix are absent | `400` invalid ID, `404` no saved operation, `409` save still creating, `500` unconfirmed cleanup |

Before any D1 query or R2 key construction, the Worker requires the ID to be exactly the lowercase canonical UUIDv4 form `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`, with hexadecimal characters in every `x` position. Path IDs and JSON IDs use the same validator. Each `POST` also carries a separate browser-generated attempt token in that canonical form; it is validated before storage and is never returned in an API response. Invalid values return `400 INVALID_ID` or `400 INVALID_ATTEMPT_TOKEN`, so `/`, alternate encodings, case variants, and prefix overlap never reach storage.

For `POST`, the Worker reads the request stream through a 512 KiB cap and cancels it as soon as the cap is exceeded. It then limits title to 200 UTF-8 bytes and text to 65,536 UTF-8 bytes. Blank checks trim only for validation; accepted title and text are preserved exactly. The browser mirrors these checks, while the Worker is authoritative. API errors have `{ "error": { "code", "message", "field"? } }` and never expose internal details.

The browser maps save conflicts to explicit, non-success states. `SAVE_IN_PROGRESS` says “This save is not finished. Retry save.” and keeps the immutable pending tuple so its enabled retry sends the same ID, title, text, and attempt token. `IDEMPOTENCY_CONFLICT` says “This save attempt cannot continue. Start a new save.” and offers to discard only the pending identity and token while preserving the form fields; the next intentional submit generates both again. `SHELF_LIMIT_REACHED` says “The snippet shelf is full. Delete a snippet before saving another.” `ACTIVITY_LIMIT_REACHED` says “This temporary shelf has reached its activity limit.” Capacity errors preserve the form and do not show success. These mappings are used whether the code comes from a trigger or an existing operation; unexpected `409` codes use the generic action-specific message “The snippet was not saved.”

A save operation reserves capacity before R2 is touched. Across all non-deleted operation records, D1 permits at most 100 reserved objects and 1,048,576 reserved body bytes. The ledger itself permits at most 1,000 lifetime operation IDs, including zero-byte deletion and failure tombstones. These hard ceilings bound active, in-flight, abandoned, and unindexed storage. The insert trigger checks the lifetime-operation ceiling first and raises `ACTIVITY_LIMIT_REACHED`; otherwise either the object-count or byte ceiling raises `SHELF_LIMIT_REACHED`. The Worker maps those exact trigger messages to same-named `409` API codes, and no R2 write occurs. The fixed 100-snippet ceiling also bounds the unpaginated list.

All lifecycle transitions use D1's transactional `batch()` for related statements or one conditional statement when only one row changes. Every `UPDATE` includes the expected prior state (and attempt-token hash where ownership is required), and its affected-row count must be one; zero rows means the precondition was lost and the request stops, reloads the operation, and follows the newly observed state. A batch that inserts the snippet row and activates its operation is one D1 transaction, so no competing transition can interleave its statements and a statement error rolls the batch back. No read followed by an unconditional write is used as a lifecycle fence. R2 calls remain outside D1 transactions; the durable operation state controls which compensating or resume step is allowed.

### Start and read

1. The page requests the list and shows a loading state. It replaces the list only on success; an initial failure leaves an empty list with “Snippets could not be loaded. Try again.”
2. Selecting a title records its ID and requests that ID. The Worker looks up a listed D1 row, obtains its `object_key`, and reads that exact R2 object.
3. A response updates the reader only if its ID still matches the current selection. Read failure keeps the title selected, clears stale body text, and shows a read-specific retry message.
4. The body uses a text node in a whitespace-preserving element. The list, selected heading, announcements, and confirmation/error messages also place every saved title through `textContent` or `document.createTextNode()`. Fixed message text and title nodes are composed separately; no saved title or body is interpolated into `innerHTML`.

### Save

1. The browser validates the fields, generates independent canonical UUIDv4 values for the save ID and attempt token, and keeps the immutable `{ id, title, text, attemptToken }` tuple in pending view state. An unconfirmed retry always reuses that tuple. A later intentional save receives a new ID and token. The token is an operation nonce, not an account credential; it authorizes only an identical payload for its one random ID.
2. The Worker validates the full request, computes SHA-256 over an unambiguous length-delimited title/body payload, computes the body SHA-256 and byte count, and derives the only permitted object key: `snippets/<id>/<body-sha256>.txt`.
3. Before any R2 call, the Worker hashes the attempt token and inserts a `creating` operation containing the payload fingerprint, exact key, reserved bytes, attempt-token hash, a null `delete_title`, and the timestamp that will also become the snippet's `created_at`. The raw token is never stored. The insert's trigger enforces all row, object, and byte ceilings in that statement. An existing operation with a different fingerprint returns `409 IDEMPOTENCY_CONFLICT`. An exact payload with a different token returns `409 SAVE_IN_PROGRESS`; only the original tuple may resume it. For an exact `active` replay, the Worker confirms the matching snippet row and R2 object, rechecks immediately before responding that the operation is still `active`, and returns `200` without writing. This read-only replay cannot authorize a state change; if the recheck no longer sees `active`, it follows the new state instead. `deleting`, `deleted`, or `failed` returns a non-retryable `409 IDEMPOTENCY_CONFLICT` and never recreates the snippet.
4. Any request presenting the original token and exact payload may resume its `creating` reservation. It inspects the one immutable object key: when the object is absent it may put the exact body, and when the object is present it skips the put and proceeds to activation. Concurrent matching retries can issue the same content-addressed put, but cannot select a different key or bytes; activation remains D1-serialized. A missing or nonmatching token can neither write nor delete R2 and receives `409 SAVE_IN_PROGRESS`. There is no time-based lease takeover and no shared-candidate cleanup.
5. A matching-token request writes the exact body to the reserved key when needed. It then runs one transactional D1 batch: an `INSERT ... SELECT` creates the `snippets` row only while the matching operation is still `creating` with that attempt-token hash, and a conditional `UPDATE ... WHERE id = ? AND state = 'creating' AND attempt_token_sha256 = ?` changes the operation to `active`. Both statements use the same guard and must each affect one row for this request to report activation; if both affect zero, the request lost the precondition, made no change, and reloads the operation, while any statement error rolls the batch back. An exact retry that finds the expected R2 object uses the same batch with the stored payload fingerprint and token hash as its guard; D1 serialization lets only one activation commit. If a snippet row already exists outside a matching active operation, the Worker reports an integrity error rather than advancing state. The title becomes list-visible only when the operation is `active`. The Worker returns success only after the active rows match and the R2 object exists.
6. If the R2 write definitely fails and prefix inspection confirms no object exists, a matching-token request changes the operation to `failed`, releases its reserved bytes, clears its attempt-token hash, and returns `500`. If the outcome or prefix cannot be confirmed, the operation remains `creating` with its reservation charged and returns the retryable `409 SAVE_IN_PROGRESS`; the browser keeps the tuple and explains that the save is unfinished. A later exact retry with the same token may safely repeat the identical put or activate an already-present object. If the browser loses the tuple, that reservation stays bounded and invisible; after the authoritative list loads, the person may submit the preserved or re-entered fields as a new intentional save with a new random ID and token.
7. After `200` or `201`, the browser immediately inserts the returned metadata into its list by ID, selects it, clears the pending tuple and form, then refreshes the list and reads through the normal R2-backed route. If the response is interrupted, list reconciliation by ID or exact replay returns the one active row. A failed refresh keeps the confirmed title visible; a failed read clears stale body text. A definite failed save preserves the entered values and shows no success state. A `SAVE_IN_PROGRESS` response preserves the full tuple and enables “Retry save”; it never leaves the form in a permanently disabled state.

### Delete

1. The browser sends the selected canonical ID through the existing `DELETE /api/snippets/:id` route, adds that ID to its in-flight delete set, and keeps the item visible. Only that local in-flight marker displays “Deleting…” and disables its delete control.
2. The Worker reads the operation fence. `creating` returns `409 SAVE_IN_PROGRESS` and does not touch R2. A missing operation or a `failed` save returns `404` and does not claim deletion succeeded; this is safe because the browser offers delete only for a listed active or recovery item. `deleted` follows the idempotent absence check. For `active`, one guarded D1 statement changes the operation to `deleting` and copies the current snippet title into `delete_title`; it succeeds only while the operation is `active` and its snippet row exists. A one-row result owns the transition. After a zero-row result, the Worker reloads both operation and index row exactly once: `deleting` or `deleted` follows that state's normal path, while `active` with no matching snippet row returns `500 DELETE_INDEX_MISSING`, logs the integrity fault, and makes no R2 call. Any other combination returns an internal delete error rather than looping. Capturing `delete_title` in the same guarded statement ensures that a later missing index row cannot erase the public recovery item. A concurrent `deleting` request joins that forward-only cleanup. POST replay can no longer write or activate after the committed transition.
3. The Worker removes every object under the isolated `snippets/<id>/` prefix and deletes the saved `snippets` row. It never restores an object. Concurrent delete requests perform the same idempotent steps. `snippet_operations.state` is the only lifecycle state; the index row has no duplicate state to update. While cleanup is incomplete, the operation's canonical ID and copied title remain the source of a public recovery item even when the index row is already absent.
4. After D1 confirms that the saved row is absent and R2 confirms the prefix is empty, the Worker changes the operation to permanent `deleted`, clears its reserved bytes, attempt-token hash, and `delete_title`, and returns `204`. The small tombstone is not a saved snippet row and is excluded from list/read; it prevents every delayed or replayed POST for that ID from recreating deleted data.
5. Any unconfirmed store call leaves the operation `deleting` and its bytes reserved, returns `500`, and reports that deletion was not confirmed. Whenever a delete ends without a valid `204`—including a network error, malformed response, or explicit failure—the browser clears the local in-flight marker and immediately reloads `GET /api/snippets` before assigning any persisted status. During that reload it keeps the prior row noninteractive with “Checking deletion status…”. If the authoritative list omits the ID, the browser removes it; if it returns `deletePending: true`, the browser shows “Deletion incomplete” and enables “Retry delete”; if it returns an active item, the browser restores the normal delete action and shows that the delete failed. If the list reload itself fails, the browser keeps the row noninteractive as “Deletion status unknown” and offers only “Retry status,” which repeats the list request rather than DELETE. It never fabricates `deletePending` from a failed local request. A page refresh uses the same list-derived rules. “Retry delete” calls the existing idempotent `DELETE` route; it does not create a second recovery API or claim success early. While its retry is in flight it again shows “Deleting…” and disables only that control. On `204`, including retry after a lost response, the browser removes only that ID, clears its reader, announces success, and reloads the list.

The operation state is the ordering fence: `creating → active → deleting → deleted`, with `creating → failed` only after absence is proven. No backward transition exists. A successful delete is therefore always fenced by a pre-existing operation, a delete cannot pass an in-flight save, a save replay cannot pass a delete, and no request cleans an object owned by another payload. An unknown-ID delete returns `404`, so it makes no deletion guarantee that a later first save could violate.

## Minimal data model

Both tables live in the one provisioned D1 binding. `snippets` is the saved index required by the specification. `snippet_operations` is bounded coordination metadata; the API never returns its key, hashes, token, bytes, or raw state. For an incomplete delete only, the list projects its canonical ID and copied title as ordinary public metadata so a person can retry cleanup.

```sql
CREATE TABLE IF NOT EXISTS snippet_operations (
  id TEXT PRIMARY KEY NOT NULL,
  payload_sha256 TEXT NOT NULL,
  object_key TEXT NOT NULL,
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes BETWEEN 0 AND 65536),
  state TEXT NOT NULL CHECK (state IN
    ('creating', 'active', 'deleting', 'deleted', 'failed')),
  attempt_token_sha256 TEXT,
  delete_title TEXT,
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

CREATE INDEX IF NOT EXISTS operations_visible_created_at
  ON snippet_operations (created_at DESC, id DESC)
  WHERE state IN ('active', 'deleting');

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

`snippet_operations.state` is authoritative for every lifecycle decision; `snippets` contains index data only. The operation reservation timestamp is copied to `snippets.created_at` at activation. List queries drive from visible `active` and `deleting` operations, inner-join the snippet row for `active`, and left-join it for `deleting`. They project `snippet_operations.id`, `COALESCE(snippets.title, snippet_operations.delete_title)` as `title`, `snippet_operations.created_at` as `created_at`, and `state = 'deleting'` as `deletePending`, then order by that projected `created_at DESC, id DESC`. An `active` operation without its required index row is excluded and logged as an integrity fault. For `deleting`, `delete_title` must be non-null because it was captured by the guarded transition. The partial operations index supports the visible-state scan; the separate snippets index remains useful for direct saved-index inspection. Key, hashes, token hashes, bytes, and raw state stay internal. Thus a failed cleanup remains discoverable by the same ID with stable ordering, without presenting the operation ledger itself as general shelf content.

The browser does not offer reading for `deletePending` items and clears the reader if that ID had been selected. When no delete request for that ID is locally in flight, it labels the item “Deletion incomplete” and enables “Retry delete.” When a request is in flight, it labels the item “Deleting…” and disables the control. Read queries check operation state, return the R2 body only for `active`, return `409 DELETE_IN_PROGRESS` for `deleting` even if the snippet row is absent, and return `404` for all other or absent states. Selected bodies always use `snippets.object_key`. The confirmed transition to `deleted` clears `delete_title` and `attempt_token_sha256`; deleted operation tombstones use zero reserved bytes and cannot appear in list/read.

## Decisions

### One Worker for UI and API

The temporary Worker serves built assets and `/api` routes. This stays within the declared publisher capability and avoids CORS and a second deployment. Requests under `/api/` never fall through to `ASSETS.fetch`.

### Reserve in D1 before writing R2

D1 is the serialization point. A bounded, nonce-owned `creating` record is written before R2, so only exact retries carrying the original attempt token can write the one content-addressed body for an ID and every candidate consumes quota. This permits user-driven retry after the Worker request that made the reservation disappears, without a time-based takeover or a different-payload writer. R2-first creation with compensation was rejected because a cleanup failure is unbounded and concurrent cleanup can remove a winner's body. A reservation whose browser tuple is lost can consume capacity, but cannot corrupt saved data, block a new random ID, or exceed the hard limits; this is the safer trade-off for a disposable canary.

### Permanent bounded tombstones fence deletion

Successful deletion of an existing saved operation removes the saved index row and body, then retains only a zero-byte operation tombstone. This makes delayed save replay distinguish “never used” from “already deleted.” Unknown IDs return `404` rather than pretending to establish a fence. Pruning tombstones was rejected because it would reopen stale IDs. The 1,000-operation lifetime ceiling bounds D1 growth; reaching it produces a clear error and the disposable environment can be reprovisioned rather than adding account or maintenance infrastructure.

### User-driven retry for incomplete deletion

The delete transition copies only the public title into its bounded operation record. Until cleanup is confirmed, the list can therefore project a recovery item with the original ID even after the saved index row is gone. The browser separates persisted `deletePending` from its local request-in-flight set and offers the same idempotent DELETE as “Retry delete” whenever no request is running. Keeping “Deleting…” forever was rejected because it strands transient failures; adding a background recovery service or a separate recovery endpoint was rejected as outside this canary's scope.

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
| Same ID is `creating` and retry lacks the matching attempt token | Return `409 SAVE_IN_PROGRESS`; retain reservation and touch no R2 object. |
| Exact matching-token retry finds `creating` with no object | Put the same content-addressed body and attempt guarded activation; concurrent identical puts are safe. |
| R2 save definitely fails with empty prefix | Mark operation `failed`, release reservation, preserve form, and report failed save. |
| R2 save or inspection is indeterminate | Keep `creating` and its reservation; return `SAVE_IN_PROGRESS`, preserve the tuple, and enable exact retry with the same token. |
| D1 activation fails after R2 succeeds | Keep tracked `creating`; exact replay may activate the existing object without another put. |
| Save response is lost after activation | Exact replay returns the original active row; no duplicate is created. |
| Delete meets `creating` save | Return `409 SAVE_IN_PROGRESS`; do not pass or cancel the save. |
| Delete names an unknown ID or failed save | Return `404`; do not report deletion success or create a tombstone. |
| Delete reloads `active` with no snippet row after its guard affects zero rows | Return `500 DELETE_INDEX_MISSING`, log the integrity fault, make no R2 call, and do not loop. |
| Delete fails after its forward transition | Keep `deleting`, reserved bytes, ID, and copied title; return the recovery item from list and enable “Retry delete” after the local request ends or the page reloads. The retry uses the same DELETE route, removes the prefix and saved row, and never restores data. |
| Delete response is lost | Reload the authoritative list first. Remove an absent ID, expose retry only for returned `deletePending`, and retry DELETE only on that user action. |
| D1 row is absent on read | Return `404`, clear stale selected data, and say the snippet no longer exists. |
| R2 body is absent for an active row | Return read failure, render no stale body, and log the indexed mismatch. |
| Browser save response is interrupted/malformed | Keep the immutable pending tuple and offer exact “Retry save”; reconciliation uses the same ID and attempt token. |
| Browser delete response is interrupted/malformed | Clear local in-flight state and reload the list before showing any recovery label; if that reload fails, show “Deletion status unknown” and offer only a list-status retry. |
| Reads finish out of order | Ignore a body response whose ID is no longer selected. |
| A listed item is `deletePending` with no local request | Show “Deletion incomplete” and an enabled “Retry delete”; do not read it, and clear its stale reader content. |
| A delete request is locally in flight | Show “Deleting…” and disable that item's delete control until the request settles. |
| Unsupported method or unknown API path | Return `405` with `Allow` for a known route/method mismatch or JSON `404` for an unknown `/api/` path; never call `ASSETS.fetch`. |
| Static asset request fails | Return the asset response as-is; never rewrite an `/api` error as the app shell. |

## Risks / Trade-offs

- **[An indeterminate save consumes quota until reconciled]** → Preserve the browser's token-bearing tuple for exact user retry; if that tuple is lost, keep the old reservation charged so any possible object remains bounded, allow a new random-ID save, and rely on disposable-environment cleanup rather than unsafe lease takeover.
- **[The operation ledger limits the environment to 1,000 save identities]** → Show `ACTIVITY_LIMIT_REACHED`; this is an explicit abuse bound for a short-lived canary, not a product-scale policy.
- **[No login allows anyone with the temporary URL to mutate canary data]** → Enforce canonical IDs, request/value limits, pre-write storage reservation, hard aggregate ceilings, synthetic data, and prompt post-proof cleanup.
- **[Concurrent mutation can make one browser stale]** → Address operations by immutable ID, use operation states as fences, and reload the authoritative list after confirmed mutations.
- **[Temporary environment removal eliminates live reproduction]** → Capture ordered browser screenshots and matching D1/R2 readback before cleanup, retaining proof in the implementation pull request.

## Migration Plan

1. Build the static page and bundled Worker, then apply the repeatable two-table migration in the one provisioned D1 binding. Provision exactly one D1 and one R2 binding.
2. Publish through the supported temporary Worker publisher; add no CI workflow, production account setup, or unsupported infrastructure.
3. Collect review scenarios in one ordered collection with the application and harness fixed. Start each scenario in the one fresh browser context supplied for that scenario, declare its known cloud data, and capture its observed result before the next scenario resets data. Do not depend on opening a second context inside a scenario or carrying unreset state between scenarios.
4. Cover blank-input messaging, two browser saves, correct body selection, refresh persistence, one deletion, and survival of `Greeting`. For the required fresh-context scenario, use the harness before opening that scenario's browser to establish its declared known state through the same Worker API: `Greeting` is active and readable, and the previously used `Sign-off` ID has a confirmed `deleted` tombstone with no index row or R2 object. Then open the scenario's fresh browser context and capture that `Greeting` loads from cloud storage while `Sign-off` does not return. Capture the setup API results plus matching D1 index/operation readback and R2 prefix/object inspection before that scenario resets. This uses only the declared per-scenario context and known-data model.
5. Include deterministic browser/API failure-and-retry checks in the implementation work. For save, stop the first matching request after its `creating` reservation and before R2 put, assert `SAVE_IN_PROGRESS`, then retry the same tuple and attempt token and assert exactly one active index row and one body object. For delete, force cleanup to fail after the operation reaches `deleting` and after the snippet row can be absent; assert a non-success response, an authoritative list reload, the same ID's recovery item, the enabled “Retry delete” after request completion and after refresh, a retry through the same DELETE route, and `204` only after D1 and R2 absence checks pass. Also simulate a lost `204` and assert that list reconciliation removes the stale local item instead of offering retry. The other snippet must remain readable. These tests use injected store/response failures in the test harness, not a background recovery service.
6. Publish the ordered evidence to the implementation pull request, then remove the temporary resources while leaving evidence available. Keep the implementation pull request unmerged.

Rollback is deletion of the disposable environment. If validation fails before evidence publication, discard it, correct the implementation, and provision a clean one; no production data or schema rollback exists.
