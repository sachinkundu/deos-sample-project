import { describe, expect, it, vi } from "vitest";
import { addItem, deleteItem, generateUuid, renameItem, setPacked, validateName, visibleItems, type PackingItem } from "../src/model";

const ID_A = "123e4567-e89b-42d3-a456-426614174000";
const ID_B = "123e4567-e89b-42d3-a456-426614174001";
const cryptoWith = (id = ID_A) => ({ randomUUID: () => id });

describe("packing-list transitions", () => {
  it("adds trimmed items unpacked in insertion order and permits duplicate names", () => {
    const first = addItem([], "  Passport  ", cryptoWith(ID_A));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = addItem(first.items, "Passport", cryptoWith(ID_B));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.items).toEqual([
      { id: ID_A, name: "Passport", packed: false },
      { id: ID_B, name: "Passport", packed: false },
    ]);
  });

  it("renames by ID while preserving packed state, identity, and position", () => {
    const items: PackingItem[] = [{ id: ID_A, name: "Rain coat", packed: true }, { id: ID_B, name: "Socks", packed: false }];
    expect(renameItem(items, ID_A, " Jacket ")).toEqual([{ id: ID_A, name: "Jacket", packed: true }, items[1]]);
  });

  it("deletes and toggles only the targeted duplicate-name item", () => {
    const items: PackingItem[] = [{ id: ID_A, name: "Socks", packed: false }, { id: ID_B, name: "Socks", packed: false }];
    expect(setPacked(items, ID_B, true)).toEqual([items[0], { ...items[1]!, packed: true }]);
    expect(deleteItem(items, ID_A)).toEqual([items[1]]);
  });

  it("treats blank names and unknown IDs as no-ops", () => {
    const items: PackingItem[] = [{ id: ID_A, name: "Passport", packed: false }];
    expect(validateName("  ").ok).toBe(false);
    expect(renameItem(items, ID_A, " ")).toBe(items);
    expect(renameItem(items, ID_B, "Hat")).toBe(items);
    expect(setPacked(items, ID_B, true)).toBe(items);
    expect(deleteItem(items, ID_B)).toBe(items);
  });

  it("derives To pack without mutating canonical items", () => {
    const items: PackingItem[] = [{ id: ID_A, name: "Passport", packed: true }, { id: ID_B, name: "Socks", packed: false }];
    expect(visibleItems(items, "all")).toBe(items);
    expect(visibleItems(items, "to-pack")).toEqual([items[1]]);
    expect(items).toHaveLength(2);
  });
});

describe("secure IDs", () => {
  it("uses randomUUID first and lowercases its result", () => {
    const getRandomValues = vi.fn();
    expect(generateUuid({ randomUUID: () => ID_A.toUpperCase(), getRandomValues })).toBe(ID_A);
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("uses a correctly masked getRandomValues fallback", () => {
    const id = generateUuid({ getRandomValues: (array) => {
      const bytes = array as unknown as Uint8Array;
      bytes.fill(0xff);
      return array;
    }});
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("rejects creation when secure randomness fails and never uses Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const result = addItem([], "Passport", { getRandomValues: () => { throw new Error("denied"); } });
    expect(result).toEqual({ ok: false, message: expect.stringContaining("secure item ID") });
    expect(random).not.toHaveBeenCalled();
  });
});
