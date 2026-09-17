const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUEST_LIMIT = 512 * 1024;
const TITLE_LIMIT = 200;
const TEXT_LIMIT = 65_536;
const encoder = new TextEncoder();

export interface TestGates {
  afterReservation?: (id: string) => Promise<void>;
  afterPut?: (id: string) => Promise<void>;
  beforeActivation?: (id: string) => Promise<void>;
}

export interface WorkerEnv {
  DB: D1Database;
  BODIES: R2Bucket;
  ASSETS: Fetcher;
  TEST_GATES?: TestGates;
}

type OperationState = "creating" | "active" | "deleting" | "deleted";

interface OperationRow {
  id: string;
  payload_sha256: string;
  object_key: string;
  reserved_bytes: number;
  state: OperationState;
  delete_title: string | null;
  created_at: string;
  updated_at: string;
}

interface SnippetRow {
  id: string;
  title: string;
  object_key: string;
  payload_sha256: string;
  body_sha256: string;
  body_bytes: number;
  created_at: string;
}

interface SaveInput {
  id: string;
  title: string;
  text: string;
}

interface SaveFacts {
  payloadSha: string;
  bodySha: string;
  bodyBytes: number;
  objectKey: string;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  field?: string,
): Response {
  return jsonResponse(
    { error: { code, message, ...(field ? { field } : {}) } },
    status,
  );
}

function jsonResponse(
  value: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders,
  });
}

function methodNotAllowed(allow: string): Response {
  return errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "That method is not allowed.",
    undefined,
  );
}

function withAllow(response: Response, allow: string): Response {
  const headers = new Headers(response.headers);
  headers.set("allow", allow);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function assertCanonicalId(id: string): void {
  if (!UUID_V4.test(id)) {
    throw new ApiError(400, "INVALID_ID", "The snippet ID is invalid.", "id");
  }
}

async function readLimitedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > REQUEST_LIMIT) {
    throw new ApiError(
      413,
      "REQUEST_TOO_LARGE",
      "The save request is too large.",
    );
  }

  if (!request.body) {
    throw new ApiError(400, "INVALID_JSON", "Send a JSON save request.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > REQUEST_LIMIT) {
        await reader.cancel("request too large");
        throw new ApiError(
          413,
          "REQUEST_TOO_LARGE",
          "The save request is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Send a valid JSON save request.");
  }
}

async function validateSaveRequest(request: Request): Promise<SaveInput> {
  const body = await readLimitedJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "Send a snippet ID, title, and text.",
    );
  }

  const record = body as Record<string, unknown>;
  if (typeof record.id !== "string") {
    throw new ApiError(400, "INVALID_ID", "The snippet ID is invalid.", "id");
  }
  assertCanonicalId(record.id);
  if (typeof record.title !== "string") {
    throw new ApiError(400, "TITLE_REQUIRED", "A title is needed.", "title");
  }
  if (record.title.trim().length === 0) {
    throw new ApiError(400, "TITLE_REQUIRED", "A title is needed.", "title");
  }
  if (encoder.encode(record.title).byteLength > TITLE_LIMIT) {
    throw new ApiError(
      400,
      "TITLE_TOO_LONG",
      "The title must be 200 bytes or fewer.",
      "title",
    );
  }
  if (typeof record.text !== "string") {
    throw new ApiError(400, "TEXT_REQUIRED", "Text is needed.", "text");
  }
  if (record.text.trim().length === 0) {
    throw new ApiError(400, "TEXT_REQUIRED", "Text is needed.", "text");
  }
  if (encoder.encode(record.text).byteLength > TEXT_LIMIT) {
    throw new ApiError(
      400,
      "TEXT_TOO_LONG",
      "The text must be 65,536 bytes or fewer.",
      "text",
    );
  }

  return { id: record.id, title: record.title, text: record.text };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveSaveFacts(input: SaveInput): Promise<SaveFacts> {
  const titleBytes = encoder.encode(input.title);
  const bodyBytes = encoder.encode(input.text);
  const framed = new Uint8Array(
    8 + titleBytes.byteLength + bodyBytes.byteLength,
  );
  const lengths = new DataView(framed.buffer);
  lengths.setUint32(0, titleBytes.byteLength);
  framed.set(titleBytes, 4);
  lengths.setUint32(4 + titleBytes.byteLength, bodyBytes.byteLength);
  framed.set(bodyBytes, 8 + titleBytes.byteLength);
  const [payloadSha, bodySha] = await Promise.all([
    sha256Hex(framed),
    sha256Hex(bodyBytes),
  ]);
  return {
    payloadSha,
    bodySha,
    bodyBytes: bodyBytes.byteLength,
    objectKey: `snippets/${input.id}/${bodySha}.txt`,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

function triggerCode(
  error: unknown,
): "SHELF_LIMIT_REACHED" | "ACTIVITY_LIMIT_REACHED" | null {
  const text = errorText(error);
  if (text.includes("ACTIVITY_LIMIT_REACHED")) return "ACTIVITY_LIMIT_REACHED";
  if (text.includes("SHELF_LIMIT_REACHED")) return "SHELF_LIMIT_REACHED";
  return null;
}

async function getOperation(
  env: WorkerEnv,
  id: string,
): Promise<OperationRow | null> {
  return env.DB.prepare(
    `SELECT id, payload_sha256, object_key, reserved_bytes, state, delete_title,
            created_at, updated_at
       FROM snippet_operations
      WHERE id = ?1`,
  )
    .bind(id)
    .first<OperationRow>();
}

async function getSnippet(
  env: WorkerEnv,
  id: string,
): Promise<SnippetRow | null> {
  return env.DB.prepare(
    `SELECT id, title, object_key, payload_sha256, body_sha256, body_bytes, created_at
       FROM snippets
      WHERE id = ?1`,
  )
    .bind(id)
    .first<SnippetRow>();
}

function isExactOperation(operation: OperationRow, facts: SaveFacts): boolean {
  return (
    operation.payload_sha256 === facts.payloadSha &&
    operation.object_key === facts.objectKey
  );
}

function isExactSnippet(
  snippet: SnippetRow,
  input: SaveInput,
  facts: SaveFacts,
): boolean {
  return (
    snippet.title === input.title &&
    snippet.object_key === facts.objectKey &&
    snippet.payload_sha256 === facts.payloadSha &&
    snippet.body_sha256 === facts.bodySha &&
    snippet.body_bytes === facts.bodyBytes
  );
}

async function objectIsConfirmed(
  env: WorkerEnv,
  facts: SaveFacts,
): Promise<boolean> {
  const object = await env.BODIES.head(facts.objectKey);
  return (
    object !== null &&
    object.size === facts.bodyBytes &&
    object.customMetadata?.sha256 === facts.bodySha
  );
}

function publicSnippet(snippet: SnippetRow): {
  id: string;
  title: string;
  createdAt: string;
  deletePending: false;
} {
  return {
    id: snippet.id,
    title: snippet.title,
    createdAt: snippet.created_at,
    deletePending: false,
  };
}

async function resolveAuthoritativeSave(
  env: WorkerEnv,
  input: SaveInput,
  facts: SaveFacts,
  successStatus: 200 | 201,
): Promise<Response> {
  const operation = await getOperation(env, input.id);
  if (!operation) {
    return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
  }
  if (!isExactOperation(operation, facts)) {
    return errorResponse(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This save attempt cannot continue. Start a new save.",
    );
  }
  if (operation.state === "creating") {
    return errorResponse(
      409,
      "SAVE_IN_PROGRESS",
      "This save is not finished and may still finish. Check save or start a new save.",
    );
  }
  if (operation.state === "deleting" || operation.state === "deleted") {
    return errorResponse(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This save attempt cannot continue. Start a new save.",
    );
  }

  const snippet = await getSnippet(env, input.id);
  if (!snippet || !isExactSnippet(snippet, input, facts)) {
    console.error("Active save has inconsistent index data", { id: input.id });
    return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
  }

  let confirmed = false;
  try {
    confirmed = await objectIsConfirmed(env, facts);
  } catch (error) {
    console.error("Could not confirm active R2 object", {
      id: input.id,
      error: errorText(error),
    });
  }
  if (!confirmed) {
    return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
  }

  const finalOperation = await getOperation(env, input.id);
  const finalSnippet = await getSnippet(env, input.id);
  if (
    !finalOperation ||
    finalOperation.state !== "active" ||
    !isExactOperation(finalOperation, facts) ||
    !finalSnippet ||
    !isExactSnippet(finalSnippet, input, facts)
  ) {
    if (
      finalOperation?.state === "deleting" ||
      finalOperation?.state === "deleted"
    ) {
      return errorResponse(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This save attempt cannot continue. Start a new save.",
      );
    }
    return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
  }

  return jsonResponse({ snippet: publicSnippet(finalSnippet) }, successStatus);
}

async function activate(
  env: WorkerEnv,
  input: SaveInput,
  facts: SaveFacts,
): Promise<D1Result<unknown>> {
  await env.TEST_GATES?.beforeActivation?.(input.id);
  return env.DB.prepare(
    `INSERT INTO snippets
       (id, title, object_key, payload_sha256, body_sha256, body_bytes, created_at)
     SELECT id, ?1, object_key, payload_sha256, ?2, ?3, created_at
       FROM snippet_operations
      WHERE id = ?4
        AND state = 'creating'
        AND payload_sha256 = ?5
        AND object_key = ?6
        AND NOT EXISTS (SELECT 1 FROM snippets WHERE id = ?4)`,
  )
    .bind(
      input.title,
      facts.bodySha,
      facts.bodyBytes,
      input.id,
      facts.payloadSha,
      facts.objectKey,
    )
    .run();
}

async function activateAndResolve(
  env: WorkerEnv,
  input: SaveInput,
  facts: SaveFacts,
  successStatus: 200 | 201,
): Promise<Response> {
  try {
    await activate(env, input, facts);
  } catch (error) {
    if (!errorText(error).includes("ACTIVATION_PRECONDITION_LOST")) {
      console.error("Snippet activation failed", {
        id: input.id,
        error: errorText(error),
      });
      return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
    }
  }
  return resolveAuthoritativeSave(env, input, facts, successStatus);
}

async function reconcileExistingSave(
  env: WorkerEnv,
  input: SaveInput,
  facts: SaveFacts,
  operation: OperationRow,
): Promise<Response> {
  if (!isExactOperation(operation, facts)) {
    return errorResponse(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This save attempt cannot continue. Start a new save.",
    );
  }
  if (operation.state === "active") {
    return resolveAuthoritativeSave(env, input, facts, 200);
  }
  if (operation.state === "deleting" || operation.state === "deleted") {
    return errorResponse(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This save attempt cannot continue. Start a new save.",
    );
  }

  let confirmed = false;
  try {
    confirmed = await objectIsConfirmed(env, facts);
  } catch (error) {
    console.error("Could not reconcile creating object", {
      id: input.id,
      error: errorText(error),
    });
  }
  if (!confirmed) {
    return errorResponse(
      409,
      "SAVE_IN_PROGRESS",
      "This save is not finished and may still finish. Check save or start a new save.",
    );
  }
  return activateAndResolve(env, input, facts, 200);
}

async function saveSnippet(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const input = await validateSaveRequest(request);
  const facts = await deriveSaveFacts(input);

  let reservation: D1Result<unknown>;
  try {
    reservation = await env.DB.prepare(
      `INSERT INTO snippet_operations
         (id, payload_sha256, object_key, reserved_bytes, state, delete_title, created_at, updated_at)
       SELECT ?1, ?2, ?3, ?4, 'creating', NULL,
              strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE NOT EXISTS (SELECT 1 FROM snippet_operations WHERE id = ?1)`,
    )
      .bind(input.id, facts.payloadSha, facts.objectKey, facts.bodyBytes)
      .run();
  } catch (error) {
    const code = triggerCode(error);
    if (code === "SHELF_LIMIT_REACHED") {
      return errorResponse(
        409,
        code,
        "This temporary shelf has no reserved capacity left. Pending saves may be using it; delete saved snippets or recreate the temporary environment.",
      );
    }
    if (code === "ACTIVITY_LIMIT_REACHED") {
      return errorResponse(
        409,
        code,
        "This temporary shelf has reached its activity limit.",
      );
    }
    console.error("Could not reserve save", {
      id: input.id,
      error: errorText(error),
    });
    return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
  }

  if ((reservation.meta.changes ?? 0) === 0) {
    const operation = await getOperation(env, input.id);
    if (!operation) {
      return errorResponse(500, "SAVE_FAILED", "The snippet was not saved.");
    }
    return reconcileExistingSave(env, input, facts, operation);
  }

  await env.TEST_GATES?.afterReservation?.(input.id);
  try {
    const object = await env.BODIES.put(facts.objectKey, input.text, {
      httpMetadata: { contentType: "text/plain; charset=utf-8" },
      customMetadata: { sha256: facts.bodySha },
      sha256: facts.bodySha,
    });
    if (!object) throw new Error("R2 put was not confirmed");
  } catch (error) {
    console.error("R2 put was indeterminate", {
      id: input.id,
      error: errorText(error),
    });
    return errorResponse(
      409,
      "SAVE_IN_PROGRESS",
      "This save is not finished and may still finish. Check save or start a new save.",
    );
  }

  await env.TEST_GATES?.afterPut?.(input.id);
  return activateAndResolve(env, input, facts, 201);
}

async function listSnippets(env: WorkerEnv): Promise<Response> {
  try {
    const [visible, inconsistent] = await Promise.all([
      env.DB.prepare(
        `SELECT o.id,
                COALESCE(s.title, o.delete_title) AS title,
                o.created_at AS created_at,
                CASE WHEN o.state = 'deleting' THEN 1 ELSE 0 END AS delete_pending
           FROM snippet_operations o
           LEFT JOIN snippets s ON s.id = o.id
          WHERE (o.state = 'active' AND s.id IS NOT NULL)
             OR (o.state = 'deleting' AND o.delete_title IS NOT NULL)
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT 100`,
      ).all<{
        id: string;
        title: string;
        created_at: string;
        delete_pending: number;
      }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
           FROM snippet_operations o
           LEFT JOIN snippets s ON s.id = o.id
          WHERE o.state = 'active' AND s.id IS NULL`,
      ).first<{ count: number }>(),
    ]);
    if ((inconsistent?.count ?? 0) > 0) {
      console.error("Active operations without snippet rows", {
        count: inconsistent?.count,
      });
    }
    return jsonResponse({
      snippets: visible.results.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        deletePending: row.delete_pending === 1,
      })),
    });
  } catch (error) {
    console.error("Snippet list failed", { error: errorText(error) });
    return errorResponse(
      500,
      "LIST_FAILED",
      "Snippets could not be loaded. Try again.",
    );
  }
}

async function readSnippet(id: string, env: WorkerEnv): Promise<Response> {
  assertCanonicalId(id);
  try {
    const operation = await getOperation(env, id);
    if (
      !operation ||
      operation.state === "creating" ||
      operation.state === "deleted"
    ) {
      return errorResponse(404, "NOT_FOUND", "This snippet no longer exists.");
    }
    if (operation.state === "deleting") {
      return errorResponse(
        409,
        "DELETE_IN_PROGRESS",
        "This snippet is being deleted.",
      );
    }
    const snippet = await getSnippet(env, id);
    if (!snippet || snippet.object_key !== operation.object_key) {
      console.error("Active snippet index is missing or inconsistent", { id });
      return errorResponse(
        500,
        "READ_FAILED",
        "The snippet could not be read. Try again.",
      );
    }
    const object = await env.BODIES.get(snippet.object_key);
    if (!object || typeof object.text !== "function") {
      console.error("Indexed R2 body is missing", {
        id,
        objectKey: snippet.object_key,
      });
      return errorResponse(
        500,
        "READ_FAILED",
        "The snippet could not be read. Try again.",
      );
    }
    const text = await object.text();
    return jsonResponse({
      id: snippet.id,
      title: snippet.title,
      text,
      createdAt: snippet.created_at,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Snippet read failed", { id, error: errorText(error) });
    return errorResponse(
      500,
      "READ_FAILED",
      "The snippet could not be read. Try again.",
    );
  }
}

async function prefixIsEmpty(env: WorkerEnv, prefix: string): Promise<boolean> {
  const page = await env.BODIES.list({ prefix, limit: 1 });
  return page.objects.length === 0 && !page.truncated;
}

async function removePrefix(env: WorkerEnv, prefix: string): Promise<void> {
  for (let pass = 0; pass < 100; pass += 1) {
    const page = await env.BODIES.list({ prefix, limit: 1000 });
    const keys = page.objects.map((object) => object.key);
    if (keys.length === 0) {
      if (!page.truncated) return;
      continue;
    }
    await env.BODIES.delete(keys);
  }
  throw new Error("R2 prefix cleanup did not converge");
}

async function cleanupDelete(env: WorkerEnv, id: string): Promise<Response> {
  const prefix = `snippets/${id}/`;
  try {
    await removePrefix(env, prefix);
    await env.DB.prepare("DELETE FROM snippets WHERE id = ?1").bind(id).run();
    const [snippet, empty] = await Promise.all([
      getSnippet(env, id),
      prefixIsEmpty(env, prefix),
    ]);
    if (snippet || !empty)
      throw new Error("Deletion absence could not be confirmed");

    const update = await env.DB.prepare(
      `UPDATE snippet_operations
          SET state = 'deleted', reserved_bytes = 0, delete_title = NULL,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1 AND state = 'deleting'`,
    )
      .bind(id)
      .run();
    if ((update.meta.changes ?? 0) === 0) {
      const operation = await getOperation(env, id);
      if (!operation || operation.state !== "deleted") {
        throw new Error("Delete finalization precondition was lost");
      }
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Snippet delete cleanup failed", {
      id,
      error: errorText(error),
    });
    return errorResponse(
      500,
      "DELETE_FAILED",
      "The snippet was not deleted. Try again.",
    );
  }
}

async function deleteSnippet(id: string, env: WorkerEnv): Promise<Response> {
  assertCanonicalId(id);
  let operation: OperationRow | null;
  let snippet: SnippetRow | null;
  try {
    [operation, snippet] = await Promise.all([
      getOperation(env, id),
      getSnippet(env, id),
    ]);
  } catch (error) {
    console.error("Could not load delete state", {
      id,
      error: errorText(error),
    });
    return errorResponse(
      500,
      "DELETE_FAILED",
      "The snippet was not deleted. Try again.",
    );
  }

  if (!operation)
    return errorResponse(404, "NOT_FOUND", "This snippet no longer exists.");
  if (operation.state === "creating") {
    return errorResponse(
      409,
      "SAVE_IN_PROGRESS",
      "This save is not finished and cannot be deleted yet.",
    );
  }
  if (operation.state === "deleted") return cleanupDelete(env, id);
  if (operation.state === "deleting") return cleanupDelete(env, id);

  try {
    const transition = await env.DB.prepare(
      `UPDATE snippet_operations
          SET state = 'deleting',
              delete_title = (SELECT title FROM snippets WHERE id = ?1),
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1
          AND state = 'active'
          AND EXISTS (
            SELECT 1 FROM snippets s
             WHERE s.id = snippet_operations.id
               AND s.object_key = snippet_operations.object_key
               AND s.payload_sha256 = snippet_operations.payload_sha256
          )`,
    )
      .bind(id)
      .run();
    if ((transition.meta.changes ?? 0) === 0) {
      [operation, snippet] = await Promise.all([
        getOperation(env, id),
        getSnippet(env, id),
      ]);
      if (!operation)
        return errorResponse(
          404,
          "NOT_FOUND",
          "This snippet no longer exists.",
        );
      if (operation.state === "deleting" || operation.state === "deleted") {
        return cleanupDelete(env, id);
      }
      if (operation.state === "creating") {
        return errorResponse(
          409,
          "SAVE_IN_PROGRESS",
          "This save is not finished and cannot be deleted yet.",
        );
      }
      if (operation.state === "active" && !snippet) {
        console.error(
          "Delete found an active operation without its index row",
          { id },
        );
        return errorResponse(
          500,
          "DELETE_INDEX_MISSING",
          "The snippet was not deleted. Try again.",
        );
      }
      return errorResponse(
        500,
        "DELETE_FAILED",
        "The snippet was not deleted. Try again.",
      );
    }
  } catch (error) {
    console.error("Delete transition failed", { id, error: errorText(error) });
    return errorResponse(
      500,
      "DELETE_FAILED",
      "The snippet was not deleted. Try again.",
    );
  }

  return cleanupDelete(env, id);
}

async function apiResponse(
  request: Request,
  env: WorkerEnv,
  pathname: string,
): Promise<Response> {
  if (pathname === "/api/snippets") {
    if (request.method === "GET") return listSnippets(env);
    if (request.method === "POST") return saveSnippet(request, env);
    return withAllow(methodNotAllowed("GET, POST"), "GET, POST");
  }

  const detail = pathname.match(/^\/api\/snippets\/([^/]+)$/);
  if (detail) {
    const id = detail[1]!;
    if (request.method === "GET") return readSnippet(id, env);
    if (request.method === "DELETE") return deleteSnippet(id, env);
    return withAllow(methodNotAllowed("GET, DELETE"), "GET, DELETE");
  }

  return errorResponse(404, "NOT_FOUND", "That API route does not exist.");
}

export async function handleRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  try {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return await apiResponse(request, env, pathname);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    return await env.ASSETS.fetch(request);
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(
        error.status,
        error.code,
        error.message,
        error.field,
      );
    }
    console.error("Unhandled request failure", {
      pathname,
      error: errorText(error),
    });
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "The request could not be completed.",
      );
    }
    return new Response("The page could not be loaded.", { status: 500 });
  }
}

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<WorkerEnv>;
