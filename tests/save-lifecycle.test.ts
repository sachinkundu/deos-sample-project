import { afterEach, describe, expect, it } from "vitest";
import { createHarness, deferred, ids, save } from "./helpers";

const harnesses: Awaited<ReturnType<typeof createHarness>>[] = [];
afterEach(async () =>
  Promise.all(harnesses.splice(0).map((item) => item.dispose())),
);
async function harness(options: Parameters<typeof createHarness>[0] = {}) {
  const value = await createHarness(options);
  harnesses.push(value);
  return value;
}

async function errorCode(response: Response) {
  return ((await response.json()) as any).error.code;
}

describe("replay-safe save lifecycle", () => {
  it("creates once, confirms R2 metadata, replays exactly, and rejects another payload", async () => {
    const h = await harness();
    const created = await save(h, ids.greeting);
    expect(created.status).toBe(201);
    const row = await h.db
      .prepare("SELECT object_key FROM snippets WHERE id = ?1")
      .bind(ids.greeting)
      .first<{ object_key: string }>();
    const object = await h.bucket.head(row!.object_key);
    expect(object?.size).toBe(
      new TextEncoder().encode("Hello, team!").byteLength,
    );
    expect(object?.customMetadata?.sha256).toMatch(/^[0-9a-f]{64}$/);
    const puts = h.calls.put;

    const replay = await save(h, ids.greeting);
    expect(replay.status).toBe(200);
    expect(h.calls.put).toBe(puts);
    const conflict = await save(h, ids.greeting, "Greeting", "Different");
    expect(conflict.status).toBe(409);
    expect(await errorCode(conflict)).toBe("IDEMPOTENCY_CONFLICT");
    expect(h.calls.put).toBe(puts);
  });

  it("allows only the reservation owner to write across the paused-owner/delete race", async () => {
    const beforePut = deferred();
    const afterPut = deferred();
    const enteredBeforePut = deferred();
    const enteredAfterPut = deferred();
    const h = await harness({
      gates: {
        async afterReservation() {
          enteredBeforePut.resolve();
          await beforePut.promise;
        },
        async afterPut() {
          enteredAfterPut.resolve();
          await afterPut.promise;
        },
      },
    });

    const owner = save(h, ids.greeting);
    await enteredBeforePut.promise;
    const retryBeforeObject = await save(h, ids.greeting);
    expect(retryBeforeObject.status).toBe(409);
    expect(await errorCode(retryBeforeObject)).toBe("SAVE_IN_PROGRESS");
    const deleteWhileCreating = await h.request(
      `/api/snippets/${ids.greeting}`,
      { method: "DELETE" },
    );
    expect(deleteWhileCreating.status).toBe(409);
    expect(h.calls.put).toBe(0);
    expect(h.calls.delete).toBe(0);

    beforePut.resolve();
    await enteredAfterPut.promise;
    expect(h.calls.put).toBe(1);
    const reconciler = await save(h, ids.greeting);
    expect(reconciler.status).toBe(200);
    expect(h.calls.put).toBe(1);
    const deleted = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(deleted.status).toBe(204);

    afterPut.resolve();
    const lateOwner = await owner;
    expect(lateOwner.status).toBe(409);
    expect(await errorCode(lateOwner)).toBe("IDEMPOTENCY_CONFLICT");
    expect(h.calls.put).toBe(1);
    const objects = await h.bucket.list({
      prefix: `snippets/${ids.greeting}/`,
    });
    expect(objects.objects).toHaveLength(0);
    const operation = await h.db
      .prepare(
        "SELECT state, reserved_bytes FROM snippet_operations WHERE id = ?1",
      )
      .bind(ids.greeting)
      .first<{ state: string; reserved_bytes: number }>();
    expect(operation).toEqual({ state: "deleted", reserved_bytes: 0 });
  });

  it("rolls back activation on trigger mismatch", async () => {
    const h = await harness();
    await h.db.prepare("DROP TRIGGER snippets_activate_operation").run();
    await h.db
      .prepare(
        `CREATE TRIGGER snippets_activate_operation AFTER INSERT ON snippets BEGIN
      SELECT RAISE(ABORT, 'ACTIVATION_PRECONDITION_LOST');
    END`,
      )
      .run();
    const response = await save(h, ids.greeting);
    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe("SAVE_IN_PROGRESS");
    expect(
      await h.db
        .prepare("SELECT id FROM snippets WHERE id = ?1")
        .bind(ids.greeting)
        .first(),
    ).toBeNull();
    expect(
      await h.db
        .prepare("SELECT state FROM snippet_operations WHERE id = ?1")
        .bind(ids.greeting)
        .first(),
    ).toEqual({ state: "creating" });
  });

  it("keeps indeterminate puts charged and delete-fenced until the honest capacity response", async () => {
    const h = await harness({ faults: { failPut: true } });
    for (let index = 0; index < 100; index += 1) {
      const id = `00000000-0000-4000-8${index.toString(16).padStart(3, "0")}-000000000000`;
      const response = await save(h, id, `Attempt ${index}`, "x");
      expect(response.status).toBe(409);
      expect(await errorCode(response)).toBe("SAVE_IN_PROGRESS");
    }
    const operation = await h.db
      .prepare("SELECT state, reserved_bytes FROM snippet_operations LIMIT 1")
      .first<any>();
    expect(operation).toEqual({ state: "creating", reserved_bytes: 1 });
    const fenced = await h.request(
      "/api/snippets/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );
    expect(fenced.status).toBe(409);
    const overCapacity = await save(h, ids.third, "One too many", "x");
    expect(overCapacity.status).toBe(409);
    expect(await errorCode(overCapacity)).toBe("SHELF_LIMIT_REACHED");
    expect((await h.bucket.list({ prefix: "snippets/" })).objects).toHaveLength(
      0,
    );
  });
});
