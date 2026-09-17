import { afterEach, describe, expect, it } from "vitest";
import { createHarness, ids, save } from "./helpers";

const harnesses: Awaited<ReturnType<typeof createHarness>>[] = [];
afterEach(async () =>
  Promise.all(harnesses.splice(0).map((item) => item.dispose())),
);
async function harness(options: Parameters<typeof createHarness>[0] = {}) {
  const value = await createHarness(options);
  harnesses.push(value);
  return value;
}

async function code(response: Response) {
  return ((await response.json()) as any).error.code;
}

describe("forward-only delete lifecycle", () => {
  it("handles unknown, creating, idempotent deleted, and permanent replay fencing", async () => {
    const h = await harness();
    const unknown = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(unknown.status).toBe(404);

    h.faults.failPut = true;
    expect((await save(h, ids.greeting)).status).toBe(409);
    const creating = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(creating.status).toBe(409);
    expect(await code(creating)).toBe("SAVE_IN_PROGRESS");

    h.faults.failPut = false;
    expect((await save(h, ids.signoff, "Sign-off", "Bye")).status).toBe(201);
    expect(
      (await h.request(`/api/snippets/${ids.signoff}`, { method: "DELETE" }))
        .status,
    ).toBe(204);
    expect(
      (await h.request(`/api/snippets/${ids.signoff}`, { method: "DELETE" }))
        .status,
    ).toBe(204);
    const replay = await save(h, ids.signoff, "Sign-off", "Bye");
    expect(replay.status).toBe(409);
    expect(await code(replay)).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("preserves a public recovery item after cleanup failure, even with the index gone", async () => {
    const h = await harness();
    expect((await save(h, ids.greeting)).status).toBe(201);
    h.faults.failListAt = new Set([3]);
    const failed = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(failed.status).toBe(500);
    expect(
      await h.db
        .prepare("SELECT id FROM snippets WHERE id = ?1")
        .bind(ids.greeting)
        .first(),
    ).toBeNull();
    const list = await h.request("/api/snippets");
    expect(((await list.json()) as any).snippets).toEqual([
      expect.objectContaining({
        id: ids.greeting,
        title: "Greeting",
        deletePending: true,
      }),
    ]);

    h.faults.failListAt = undefined;
    const retried = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(retried.status).toBe(204);
    expect(
      (
        (await h
          .request("/api/snippets")
          .then((response) => response.json())) as any
      ).snippets,
    ).toEqual([]);
  });

  it("does not touch R2 when an active operation has lost its index row", async () => {
    const h = await harness();
    expect((await save(h, ids.greeting)).status).toBe(201);
    await h.db
      .prepare("DELETE FROM snippets WHERE id = ?1")
      .bind(ids.greeting)
      .run();
    const r2Calls = h.calls.list + h.calls.delete;
    const response = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(500);
    expect(await code(response)).toBe("DELETE_INDEX_MISSING");
    expect(h.calls.list + h.calls.delete).toBe(r2Calls);
  });

  it("cleans every object in the isolated prefix and confirms both stores absent before 204", async () => {
    const h = await harness();
    expect((await save(h, ids.greeting)).status).toBe(201);
    await Promise.all([
      h.bucket.put(`snippets/${ids.greeting}/orphan-a.txt`, "a"),
      h.bucket.put(`snippets/${ids.greeting}/orphan-b.txt`, "b"),
    ]);
    const response = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(204);
    expect(
      (await h.bucket.list({ prefix: `snippets/${ids.greeting}/` })).objects,
    ).toHaveLength(0);
    expect(
      await h.db
        .prepare("SELECT id FROM snippets WHERE id = ?1")
        .bind(ids.greeting)
        .first(),
    ).toBeNull();
    expect(
      await h.db
        .prepare(
          "SELECT state, reserved_bytes, delete_title FROM snippet_operations WHERE id = ?1",
        )
        .bind(ids.greeting)
        .first(),
    ).toEqual({ state: "deleted", reserved_bytes: 0, delete_title: null });
  });
});
