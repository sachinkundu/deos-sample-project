import { afterEach, describe, expect, it } from "vitest";
import { createHarness, ids, save } from "./helpers";

const harnesses: Awaited<ReturnType<typeof createHarness>>[] = [];
async function harness() {
  const value = await createHarness();
  harnesses.push(value);
  return value;
}
afterEach(async () =>
  Promise.all(harnesses.splice(0).map((item) => item.dispose())),
);

describe("Worker API contract", () => {
  it("isolates API routing and method handling from static assets", async () => {
    const h = await harness();
    const staticResponse = await h.request("/missing-page");
    expect(await staticResponse.text()).toBe("asset:/missing-page");
    expect(h.assetRequests).toHaveLength(1);

    const unknown = await h.request("/api/unknown");
    expect(unknown.status).toBe(404);
    expect((await h.json(unknown)).error.code).toBe("NOT_FOUND");
    const wrongCollectionMethod = await h.request("/api/snippets", {
      method: "PUT",
    });
    expect(wrongCollectionMethod.status).toBe(405);
    expect(wrongCollectionMethod.headers.get("allow")).toBe("GET, POST");
    const wrongDetailMethod = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "POST",
    });
    expect(wrongDetailMethod.status).toBe(405);
    expect(wrongDetailMethod.headers.get("allow")).toBe("GET, DELETE");
    const wrongStaticMethod = await h.request("/", { method: "POST" });
    expect(wrongStaticMethod.status).toBe(405);
    expect(h.assetRequests).toHaveLength(1);
  });

  it("rejects malformed, invalid, blank, and oversized requests before storage", async () => {
    const h = await harness();
    const cases = [
      { body: "{", status: 400, code: "INVALID_JSON" },
      {
        body: JSON.stringify({ id: "NOPE", title: "T", text: "B" }),
        status: 400,
        code: "INVALID_ID",
      },
      {
        body: JSON.stringify({ id: ids.greeting, title: "   ", text: "B" }),
        status: 400,
        code: "TITLE_REQUIRED",
      },
      {
        body: JSON.stringify({ id: ids.greeting, title: "T", text: "  \n" }),
        status: 400,
        code: "TEXT_REQUIRED",
      },
      {
        body: JSON.stringify({
          id: ids.greeting,
          title: "é".repeat(101),
          text: "B",
        }),
        status: 400,
        code: "TITLE_TOO_LONG",
      },
      {
        body: JSON.stringify({
          id: ids.greeting,
          title: "T",
          text: "é".repeat(32_769),
        }),
        status: 400,
        code: "TEXT_TOO_LONG",
      },
    ];
    for (const testCase of cases) {
      const response = await h.request("/api/snippets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: testCase.body,
      });
      expect(response.status).toBe(testCase.status);
      expect((await h.json(response)).error.code).toBe(testCase.code);
    }
    const oversized = await h.request("/api/snippets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(512 * 1024 + 1),
    });
    expect(oversized.status).toBe(413);
    expect(h.calls.d1).toBe(0);
    expect(
      h.calls.put + h.calls.get + h.calls.head + h.calls.list + h.calls.delete,
    ).toBe(0);
  });

  it("lists in deterministic order and projects incomplete deletion recovery", async () => {
    const h = await harness();
    expect((await save(h, ids.greeting, "Greeting", "Hello")).status).toBe(201);
    expect((await save(h, ids.signoff, "Sign-off", "Bye")).status).toBe(201);
    h.faults.failListAt = new Set([h.calls.list + 1]);
    const failedDelete = await h.request(`/api/snippets/${ids.greeting}`, {
      method: "DELETE",
    });
    expect(failedDelete.status).toBe(500);
    h.faults.failListAt = undefined;

    const response = await h.request("/api/snippets");
    const body = await h.json(response);
    expect(body.snippets).toHaveLength(2);
    expect(
      body.snippets.find((item: any) => item.id === ids.greeting),
    ).toMatchObject({
      title: "Greeting",
      deletePending: true,
    });
    expect([...body.snippets]).toEqual(
      [...body.snippets].sort((a: any, b: any) =>
        a.createdAt === b.createdAt
          ? b.id.localeCompare(a.id)
          : b.createdAt.localeCompare(a.createdAt),
      ),
    );
    expect(Object.keys(body.snippets[0]).sort()).toEqual([
      "createdAt",
      "deletePending",
      "id",
      "title",
    ]);
  });

  it("reads the body from the D1-selected R2 key and reports missing bodies", async () => {
    const h = await harness();
    expect((await save(h, ids.greeting)).status).toBe(201);
    const alternate = `snippets/${ids.greeting}/alternate.txt`;
    await h.bucket.put(alternate, "Body chosen by D1", {
      customMetadata: { sha256: "not-used-by-read" },
    });
    await h.db.batch([
      h.db
        .prepare("UPDATE snippets SET object_key = ?1 WHERE id = ?2")
        .bind(alternate, ids.greeting),
      h.db
        .prepare("UPDATE snippet_operations SET object_key = ?1 WHERE id = ?2")
        .bind(alternate, ids.greeting),
    ]);
    const read = await h.request(`/api/snippets/${ids.greeting}`);
    expect(read.status).toBe(200);
    expect((await h.json(read)).text).toBe("Body chosen by D1");
    await h.bucket.delete(alternate);
    const missing = await h.request(`/api/snippets/${ids.greeting}`);
    expect(missing.status).toBe(500);
    expect((await h.json(missing)).error.code).toBe("READ_FAILED");
  });
});
