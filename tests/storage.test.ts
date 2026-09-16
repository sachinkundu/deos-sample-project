import { describe, expect, it, vi } from "vitest";
import { downloadText, PackingStorage, parseDocument, PRIMARY_KEY, RECOVERY_KEY, type StorageLike } from "../src/storage";
import { toDocument } from "../src/model";

const ID = "123e4567-e89b-42d3-a456-426614174000";
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  readError: Error | null = null;
  writeError: Error | null = null;
  getItem(key: string) { if (this.readError) throw this.readError; return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.writeError) throw this.writeError; this.values.set(key, value); }
}

describe("versioned storage adapter", () => {
  it("round trips a valid document and ignores unknown top-level fields", () => {
    const memory = new MemoryStorage();
    const adapter = new PackingStorage(memory);
    const documentValue = toDocument([{ id: ID, name: "Passport", packed: true }]);
    expect(adapter.save(documentValue)).toEqual({ ok: true });
    expect(adapter.read()).toEqual({ status: "valid", document: documentValue });
    expect(parseDocument(JSON.stringify({ ...documentValue, future: true }))).toEqual({ ok: true, document: documentValue });
  });

  it("returns a valid empty document when the primary key is missing", () => {
    expect(new PackingStorage(new MemoryStorage()).read()).toEqual({ status: "missing", document: { version: 1, items: [] } });
  });

  it.each([
    ["malformed JSON", "{"],
    ["wrong version", JSON.stringify({ version: 2, items: [] })],
    ["wrong shape", JSON.stringify({ version: 1, items: {} })],
    ["invalid UUID", JSON.stringify({ version: 1, items: [{ id: "bad", name: "Hat", packed: false }] })],
    ["uppercase UUID", JSON.stringify({ version: 1, items: [{ id: ID.toUpperCase(), name: "Hat", packed: false }] })],
    ["blank name", JSON.stringify({ version: 1, items: [{ id: ID, name: " ", packed: false }] })],
    ["untrimmed name", JSON.stringify({ version: 1, items: [{ id: ID, name: " Hat", packed: false }] })],
    ["invalid packed state", JSON.stringify({ version: 1, items: [{ id: ID, name: "Hat", packed: "no" }] })],
    ["duplicate ID", JSON.stringify({ version: 1, items: [{ id: ID, name: "Hat", packed: false }, { id: ID, name: "Socks", packed: true }] })],
  ])("rejects %s as a complete document", (_case, raw) => {
    expect(parseDocument(raw).ok).toBe(false);
  });

  it("models thrown reads and writes without changing values", () => {
    const memory = new MemoryStorage();
    memory.values.set(PRIMARY_KEY, "original");
    memory.readError = new Error("read denied");
    expect(new PackingStorage(memory).read()).toEqual({ status: "denied", reason: "read denied" });
    memory.readError = null; memory.writeError = new Error("quota exceeded");
    expect(new PackingStorage(memory).save(toDocument([]))).toEqual({ ok: false, reason: "quota exceeded" });
    expect(memory.values.get(PRIMARY_KEY)).toBe("original");
  });

  it("reports and replaces the single recovery slot explicitly", () => {
    const memory = new MemoryStorage();
    const adapter = new PackingStorage(memory);
    expect(adapter.readRecoverySlot()).toEqual({ status: "empty" });
    expect(adapter.backupRejected("first raw")).toEqual({ ok: true });
    expect(adapter.readRecoverySlot()).toEqual({ status: "occupied", raw: "first raw" });
    expect(adapter.backupRejected("new raw")).toEqual({ ok: true });
    expect(memory.values.get(RECOVERY_KEY)).toBe("new raw");
  });

  it("exports exact raw text with a short-lived plain-text object URL", () => {
    const createObjectURL = vi.fn((_blob: Blob) => "blob:test");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    downloadText("<script>raw & exact</script>", document, { createObjectURL, revokeObjectURL });
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
