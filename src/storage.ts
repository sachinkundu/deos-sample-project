import { DOCUMENT_VERSION, type PackingItem, type PackingListDocument } from "./model";

export const PRIMARY_KEY = "packing-list:v1";
export const RECOVERY_KEY = "packing-list:rejected:v1";
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ReadResult =
  | { status: "missing"; document: PackingListDocument }
  | { status: "valid"; document: PackingListDocument }
  | { status: "invalid"; raw: string; reason: string }
  | { status: "denied"; reason: string };

export type SaveResult = { ok: true } | { ok: false; reason: string };
export type RecoverySlotResult =
  | { status: "empty" }
  | { status: "occupied"; raw: string }
  | { status: "denied"; reason: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Browser storage is unavailable.";
}

export function parseDocument(raw: string): { ok: true; document: PackingListDocument } | { ok: false; reason: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "The saved list is not valid JSON." };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, reason: "The saved list has an invalid shape." };
  }
  const candidate = value as { version?: unknown; items?: unknown };
  if (candidate.version !== DOCUMENT_VERSION) {
    return { ok: false, reason: "The saved list uses an unsupported version." };
  }
  if (!Array.isArray(candidate.items)) {
    return { ok: false, reason: "The saved list does not contain an items array." };
  }
  const ids = new Set<string>();
  const items: PackingItem[] = [];
  for (const entry of candidate.items) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, reason: "A saved item has an invalid shape." };
    }
    const item = entry as { id?: unknown; name?: unknown; packed?: unknown };
    if (typeof item.id !== "string" || !UUID_V4_PATTERN.test(item.id)) {
      return { ok: false, reason: "A saved item has an invalid ID." };
    }
    if (ids.has(item.id)) {
      return { ok: false, reason: "The saved list contains a duplicate item ID." };
    }
    if (typeof item.name !== "string" || item.name.length === 0 || item.name !== item.name.trim()) {
      return { ok: false, reason: "A saved item has an invalid name." };
    }
    if (typeof item.packed !== "boolean") {
      return { ok: false, reason: "A saved item has an invalid packed state." };
    }
    ids.add(item.id);
    items.push({ id: item.id, name: item.name, packed: item.packed });
  }
  return { ok: true, document: { version: DOCUMENT_VERSION, items } };
}

export class PackingStorage {
  constructor(private readonly storage: StorageLike) {}

  read(): ReadResult {
    let raw: string | null;
    try {
      raw = this.storage.getItem(PRIMARY_KEY);
    } catch (error) {
      return { status: "denied", reason: errorMessage(error) };
    }
    if (raw === null) return { status: "missing", document: { version: DOCUMENT_VERSION, items: [] } };
    const parsed = parseDocument(raw);
    return parsed.ok ? { status: "valid", document: parsed.document } : { status: "invalid", raw, reason: parsed.reason };
  }

  save(document: PackingListDocument): SaveResult {
    try {
      this.storage.setItem(PRIMARY_KEY, JSON.stringify(document));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: errorMessage(error) };
    }
  }

  readRecoverySlot(): RecoverySlotResult {
    try {
      const raw = this.storage.getItem(RECOVERY_KEY);
      return raw === null ? { status: "empty" } : { status: "occupied", raw };
    } catch (error) {
      return { status: "denied", reason: errorMessage(error) };
    }
  }

  backupRejected(raw: string): SaveResult {
    try {
      this.storage.setItem(RECOVERY_KEY, raw);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: errorMessage(error) };
    }
  }
}

export function downloadText(raw: string, documentRef: Document = document, urlApi: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL): void {
  const blob = new Blob([raw], { type: "text/plain;charset=utf-8" });
  const url = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = "packing-list-rejected.txt";
  anchor.hidden = true;
  documentRef.body.append(anchor);
  anchor.click();
  anchor.remove();
  urlApi.revokeObjectURL(url);
}
