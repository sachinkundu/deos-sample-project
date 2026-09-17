import { describe, expect, it } from "vitest";
import { emptyDocument, serializeDocument } from "../src/domain.js";
import { ExpenseStorageAdapter, STORAGE_KEY } from "../src/storage.js";

const lunch = { id: "a", name: "Lunch", amountCents: "1250", category: "Food" };
const document = { version: 1, expenses: [lunch] };

class MemoryStorage {
  constructor(raw = null) { this.raw = raw; }
  getItem(key) { return key === STORAGE_KEY ? this.raw : null; }
  setItem(key, value) { if (key === STORAGE_KEY) this.raw = value; }
  removeItem(key) { if (key === STORAGE_KEY) this.raw = null; }
}

describe("ExpenseStorageAdapter", () => {
  it("loads a missing key as an empty document", () => {
    expect(new ExpenseStorageAdapter(new MemoryStorage()).read()).toEqual({
      ok: true, document: emptyDocument(), snapshot: null,
    });
  });

  it("loads and canonicalizes a valid document", () => {
    const raw = JSON.stringify({ ...document, ignored: true });
    expect(new ExpenseStorageAdapter(new MemoryStorage(raw)).read()).toEqual({
      ok: true, document, snapshot: serializeDocument(document),
    });
  });

  it.each([
    ["{"],
    [JSON.stringify({ version: 2, expenses: [] })],
    [JSON.stringify({ version: 1, expenses: [lunch, lunch] })],
  ])("rejects the complete invalid value and preserves its raw text", (raw) => {
    const result = new ExpenseStorageAdapter(new MemoryStorage(raw)).read();
    expect(result).toMatchObject({ ok: false, kind: "invalid", raw });
    expect(result.document).toBeUndefined();
  });

  it("reports thrown reads", () => {
    const storage = { getItem() { throw new Error("denied"); } };
    expect(new ExpenseStorageAdapter(storage).read()).toMatchObject({ ok: false, kind: "access" });
  });

  it("writes only when the preflight snapshot still matches", () => {
    const storage = new MemoryStorage();
    const adapter = new ExpenseStorageAdapter(storage);
    expect(adapter.write(document, null)).toEqual({
      ok: true, document, snapshot: serializeDocument(document),
    });

    const next = { version: 1, expenses: [] };
    const conflict = adapter.write(next, null);
    expect(conflict).toMatchObject({ ok: false, kind: "conflict", document });
    expect(storage.raw).toBe(serializeDocument(document));
  });

  it("adopts the latest valid preflight document in a conflict", () => {
    const storage = new MemoryStorage(serializeDocument(document));
    const adapter = new ExpenseStorageAdapter(storage);
    const result = adapter.write(emptyDocument(), null);
    expect(result.kind).toBe("conflict");
    expect(result.document.expenses[0].name).toBe("Lunch");
  });

  it("does not overwrite invalid current data", () => {
    const storage = new MemoryStorage("{");
    const result = new ExpenseStorageAdapter(storage).write(document, null);
    expect(result.kind).toBe("invalid");
    expect(storage.raw).toBe("{");
  });

  it("reports thrown writes and leaves the candidate unaccepted", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => { throw new Error("full"); };
    expect(new ExpenseStorageAdapter(storage).write(document, null))
      .toMatchObject({ ok: false, kind: "write" });
    expect(storage.raw).toBeNull();
  });

  it("clears data or reports thrown removals", () => {
    const storage = new MemoryStorage(serializeDocument(document));
    expect(new ExpenseStorageAdapter(storage).clear()).toMatchObject({ ok: true, snapshot: null });
    expect(storage.raw).toBeNull();

    storage.removeItem = () => { throw new Error("denied"); };
    expect(new ExpenseStorageAdapter(storage).clear()).toMatchObject({ ok: false, kind: "access" });
  });
});
