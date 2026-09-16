export const DOCUMENT_VERSION = 1 as const;

export interface PackingItem {
  id: string;
  name: string;
  packed: boolean;
}

export interface PackingListDocument {
  version: typeof DOCUMENT_VERSION;
  items: PackingItem[];
}

export type ListFilter = "all" | "to-pack";
export type PersistenceStatus = "saved" | "unsaved";

export interface RuntimeState {
  items: PackingItem[];
  selectedFilter: ListFilter;
  persistence: PersistenceStatus;
  rejectedRaw: string | null;
  pendingExternal: PackingListDocument | null;
}

export type NameResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

export type AddResult =
  | { ok: true; items: PackingItem[]; item: PackingItem }
  | { ok: false; message: string };

export interface CryptoSource {
  randomUUID?: () => string;
  getRandomValues?: <T extends Exclude<BufferSource, ArrayBuffer>>(array: T) => T;
}

export function validateName(value: string): NameResult {
  const name = value.trim();
  return name.length > 0
    ? { ok: true, name }
    : { ok: false, message: "Enter an item name." };
}

export function generateUuid(cryptoSource: CryptoSource): string {
  try {
    if (typeof cryptoSource.randomUUID === "function") {
      return cryptoSource.randomUUID().toLowerCase();
    }
    if (typeof cryptoSource.getRandomValues !== "function") {
      throw new Error("Secure random values are unavailable");
    }
    const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
    const byte6 = bytes[6];
    const byte8 = bytes[8];
    if (byte6 === undefined || byte8 === undefined) {
      throw new Error("Secure random values were incomplete");
    }
    bytes[6] = (byte6 & 0x0f) | 0x40;
    bytes[8] = (byte8 & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    throw new Error("A secure item ID could not be created. Check your browser security settings and try again.");
  }
}

export function addItem(items: PackingItem[], value: string, cryptoSource: CryptoSource): AddResult {
  const valid = validateName(value);
  if (!valid.ok) return valid;
  try {
    const item: PackingItem = { id: generateUuid(cryptoSource), name: valid.name, packed: false };
    return { ok: true, item, items: [...items, item] };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "A secure item ID could not be created." };
  }
}

export function renameItem(items: PackingItem[], id: string, value: string): PackingItem[] {
  const valid = validateName(value);
  if (!valid.ok || !items.some((item) => item.id === id)) return items;
  return items.map((item) => item.id === id ? { ...item, name: valid.name } : item);
}

export function setPacked(items: PackingItem[], id: string, packed: boolean): PackingItem[] {
  if (!items.some((item) => item.id === id)) return items;
  return items.map((item) => item.id === id ? { ...item, packed } : item);
}

export function deleteItem(items: PackingItem[], id: string): PackingItem[] {
  if (!items.some((item) => item.id === id)) return items;
  return items.filter((item) => item.id !== id);
}

export function visibleItems(items: PackingItem[], filter: ListFilter): PackingItem[] {
  return filter === "all" ? items : items.filter((item) => !item.packed);
}

export function toDocument(items: PackingItem[]): PackingListDocument {
  return { version: DOCUMENT_VERSION, items };
}
