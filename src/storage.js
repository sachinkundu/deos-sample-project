import { emptyDocument, serializeDocument, validateDocument } from "./domain.js";

export const STORAGE_KEY = "expense-tracker:v1";

export class ExpenseStorageAdapter {
  constructor(storage) {
    this.storage = storage;
  }

  parseRaw(raw) {
    if (raw === null) return { ok: true, document: emptyDocument(), snapshot: null };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, kind: "invalid", raw, error: "Saved data is not valid JSON." };
    }
    const result = validateDocument(parsed);
    if (!result.ok) return { ok: false, kind: "invalid", raw, error: result.error };
    return { ok: true, document: result.document, snapshot: serializeDocument(result.document) };
  }

  read() {
    try {
      return this.parseRaw(this.storage.getItem(STORAGE_KEY));
    } catch {
      return { ok: false, kind: "access", error: "Saved data could not be accessed." };
    }
  }

  write(document, expectedSnapshot) {
    const current = this.read();
    if (!current.ok) return current;
    if (current.snapshot !== expectedSnapshot) {
      return { ...current, ok: false, kind: "conflict" };
    }

    const serialized = serializeDocument(document);
    try {
      this.storage.setItem(STORAGE_KEY, serialized);
    } catch {
      return { ok: false, kind: "write", error: "This change was not saved. Check browser storage and try again." };
    }
    return { ok: true, document, snapshot: serialized };
  }

  clear() {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      return { ok: false, kind: "access", error: "Saved data could not be cleared." };
    }
    return { ok: true, document: emptyDocument(), snapshot: null };
  }
}
