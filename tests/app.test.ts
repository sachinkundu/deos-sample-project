import { afterEach, describe, expect, it, vi } from "vitest";
import { PackingListApp } from "../src/app";
import { toDocument } from "../src/model";
import { PackingStorage, PRIMARY_KEY, RECOVERY_KEY, type StorageLike } from "../src/storage";

const IDS = [
  "123e4567-e89b-42d3-a456-426614174000",
  "123e4567-e89b-42d3-a456-426614174001",
  "123e4567-e89b-42d3-a456-426614174002",
];

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  readError: Error | null = null;
  writeError: Error | null = null;
  writes = 0;
  getItem(key: string) { if (this.readError) throw this.readError; return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes += 1; if (this.writeError) throw this.writeError; this.values.set(key, value); }
}

let activeApp: PackingListApp | null = null;
afterEach(() => { activeApp?.destroy(); activeApp = null; });

function start(memory = new MemoryStorage(), confirmAction = vi.fn(() => true)) {
  let index = 0;
  const root = document.querySelector<HTMLElement>("#app")!;
  const app = new PackingListApp({
    root,
    storage: new PackingStorage(memory),
    cryptoSource: { randomUUID: () => IDS[index++] ?? IDS[2]! },
    windowRef: window,
    confirmAction,
  });
  app.start();
  activeApp = app;
  return { app, root, memory, confirmAction };
}

function input(selector: string, value: string) {
  const element = document.querySelector<HTMLInputElement>(selector)!;
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return element;
}
function submit(selector: string) {
  document.querySelector<HTMLFormElement>(selector)!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}
function click(selector: string) { document.querySelector<HTMLButtonElement>(selector)!.click(); }
function row(name: string) { return [...document.querySelectorAll<HTMLElement>(".packing-item")].find((element) => element.dataset.itemName === name); }
function add(name: string) { input('input[name="item-name"]', name); submit(".add-form"); }
function external(raw: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key: PRIMARY_KEY, newValue: raw }));
}

describe("rendered packing-list behavior", () => {
  it("starts empty, adds unpacked items in order, and renders markup-like names literally", () => {
    const { memory } = start();
    expect(document.querySelector('[data-empty-state="list"]')?.textContent).toContain("Your bag is waiting");
    add("Passport");
    add("<b>Hat</b>");
    expect([...document.querySelectorAll(".item-name")].map((node) => node.textContent)).toEqual(["Passport", "<b>Hat</b>"]);
    expect(row("Passport")?.classList.contains("is-packed")).toBe(false);
    expect(row("<b>Hat</b>")?.querySelector("b")).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('input[name="item-name"]'));
    expect(JSON.parse(memory.values.get(PRIMARY_KEY)!).items).toHaveLength(2);
  });

  it("renames with Enter semantics, preserves packed state, and filters without writing", async () => {
    const { memory } = start();
    add("Rain coat"); add("Socks");
    const packed = row("Rain coat")!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    packed.click();
    click('button[aria-label="Rename Rain coat"]');
    await Promise.resolve();
    expect(document.activeElement).toBe(document.querySelector('input[name="rename-item"]'));
    input('input[name="rename-item"]', "Jacket").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(row("Jacket")?.classList.contains("is-packed")).toBe(true);
    expect(row("Rain coat")).toBeUndefined();
    const writes = memory.writes;
    click('[data-filter="to-pack"]');
    expect(row("Jacket")).toBeUndefined();
    expect(row("Socks")).toBeDefined();
    expect(document.querySelector('[data-filter="to-pack"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(memory.writes).toBe(writes);
    click('[data-filter="all"]');
    row("Jacket")!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    expect(row("Jacket")?.classList.contains("is-packed")).toBe(false);
  });

  it("hands focus to the next row after deletion and persists deletion across a new app start", () => {
    const { app, memory } = start();
    add("Passport"); add("Socks"); add("Jacket");
    const remove = row("Socks")!.querySelector<HTMLButtonElement>('[aria-label="Delete Socks"]')!;
    remove.focus(); remove.click();
    expect(row("Socks")).toBeUndefined();
    expect(document.activeElement).toBe(row("Jacket")!.querySelector('input[type="checkbox"]'));
    app.destroy(); activeApp = null;
    document.body.innerHTML = '<div id="app"></div>';
    start(memory);
    expect([...document.querySelectorAll(".item-name")].map((node) => node.textContent)).toEqual(["Passport", "Jacket"]);
  });

  it("shows distinct empty-list and nothing-left-to-pack states", () => {
    start(); add("Passport");
    row("Passport")!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    click('[data-filter="to-pack"]');
    expect(document.querySelector('[data-empty-state="to-pack"]')?.textContent).toContain("Nothing left to pack");
    click('[data-filter="all"]');
    expect(row("Passport")).toBeDefined();
  });

  it("keeps blank forms open and Escape cancels rename without a write", () => {
    const { memory } = start();
    input('input[name="item-name"]', "   "); submit(".add-form");
    expect(document.querySelector("#add-error")?.textContent).toBe("Enter an item name.");
    expect(document.querySelectorAll(".packing-item")).toHaveLength(0);
    add("Passport");
    click('button[aria-label="Rename Passport"]');
    const writes = memory.writes;
    const rename = input('input[name="rename-item"]', " ");
    submit(".rename-form");
    expect(document.querySelector(".row-error")?.textContent).toBe("Enter an item name.");
    document.querySelector<HTMLInputElement>('input[name="rename-item"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(row("Passport")).toBeDefined();
    expect(memory.writes).toBe(writes);
    expect(document.activeElement).toBe(row("Passport")!.querySelector('[aria-label="Rename Passport"]'));
    expect(rename.isConnected).toBe(false);
  });

  it("supports the declared desktop structure at a 1440 by 900 viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    start();
    expect(window.innerWidth).toBe(1440);
    expect(window.innerHeight).toBe(900);
    expect(document.querySelector(".page-shell")).not.toBeNull();
    expect(document.querySelector(".filter-group")?.getAttribute("role")).toBe("group");
  });
});

describe("storage failure and cross-tab orchestration", () => {
  it("keeps a failed mutation usable and retries the full current document", () => {
    const memory = new MemoryStorage();
    memory.writeError = new Error("quota exceeded");
    start(memory); add("Passport");
    expect(row("Passport")).toBeDefined();
    expect(document.body.textContent).toContain("Changes not saved");
    memory.writeError = null;
    click(".notice .button");
    expect(document.body.textContent).not.toContain("Changes not saved");
    expect(JSON.parse(memory.values.get(PRIMARY_KEY)!).items[0].name).toBe("Passport");
  });

  it("blocks mutations on unread startup data and retries access without overwriting", () => {
    const memory = new MemoryStorage();
    memory.values.set(PRIMARY_KEY, JSON.stringify(toDocument([{ id: IDS[0]!, name: "Passport", packed: true }])));
    memory.readError = new Error("read denied");
    start(memory);
    expect(document.querySelector<HTMLInputElement>('input[name="item-name"]')?.disabled).toBe(true);
    expect(memory.values.get(PRIMARY_KEY)).toContain("Passport");
    memory.readError = null;
    click(".notice .button");
    expect(row("Passport")?.classList.contains("is-packed")).toBe(true);
  });

  it("preserves invalid startup data, then backs it up before confirmed reset", () => {
    const memory = new MemoryStorage();
    memory.values.set(PRIMARY_KEY, "{broken");
    const { confirmAction } = start(memory);
    expect(document.body.textContent).toContain("Saved data needs attention");
    expect(document.querySelector<HTMLInputElement>('input[name="item-name"]')?.disabled).toBe(true);
    click(".danger-button");
    expect(confirmAction).toHaveBeenCalled();
    expect(memory.values.get(RECOVERY_KEY)).toBe("{broken");
    expect(memory.values.get(PRIMARY_KEY)).toBe(JSON.stringify(toDocument([])));
    expect(document.querySelector<HTMLInputElement>('input[name="item-name"]')?.disabled).toBe(false);
  });

  it("requires explicit replacement when a recovery copy already exists", () => {
    const memory = new MemoryStorage();
    memory.values.set(PRIMARY_KEY, "new rejected");
    memory.values.set(RECOVERY_KEY, "older rejected");
    start(memory);
    click(".danger-button");
    expect(document.body.textContent).toContain("Previous recovery copy found");
    expect(memory.values.get(PRIMARY_KEY)).toBe("new rejected");
    const replace = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Replace recovery copy & continue")!;
    replace.click();
    expect(memory.values.get(RECOVERY_KEY)).toBe("new rejected");
    expect(memory.values.get(PRIMARY_KEY)).toBe(JSON.stringify(toDocument([])));
  });

  it("adopts a valid external update, retains the filter, and announces it", () => {
    start(); add("Passport"); click('[data-filter="to-pack"]');
    const other = toDocument([{ id: IDS[1]!, name: "Socks", packed: false }]);
    external(JSON.stringify(other));
    expect(row("Socks")).toBeDefined();
    expect(row("Passport")).toBeUndefined();
    expect(document.querySelector('[data-filter="to-pack"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(document.body.textContent).toContain("List updated in another tab");
  });

  it("holds only the latest external document during an unsaved conflict and confirms adoption", () => {
    const memory = new MemoryStorage();
    memory.writeError = new Error("quota");
    const { confirmAction } = start(memory); add("Local");
    external(JSON.stringify(toDocument([{ id: IDS[1]!, name: "First remote", packed: false }])));
    external(JSON.stringify(toDocument([{ id: IDS[2]!, name: "Latest remote", packed: true }])));
    expect(document.body.textContent).toContain("Choose which list to keep");
    const use = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Use other tab's list")!;
    use.click();
    expect(confirmAction).toHaveBeenCalledWith(expect.stringContaining("Discard"));
    expect(row("Latest remote")?.classList.contains("is-packed")).toBe(true);
    expect(row("Local")).toBeUndefined();
  });

  it("keeps the last valid list read-only after an invalid external write and can restore it", () => {
    const memory = new MemoryStorage();
    start(memory); add("Passport");
    external("<not json>");
    expect(row("Passport")).toBeDefined();
    expect(row("Passport")!.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(true);
    const restore = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Restore my current list")!;
    restore.click();
    expect(memory.values.get(RECOVERY_KEY)).toBe("<not json>");
    expect(JSON.parse(memory.values.get(PRIMARY_KEY)!).items[0].name).toBe("Passport");
    expect(row("Passport")!.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(false);
  });

  it("treats external key removal as a valid empty list", () => {
    start(); add("Passport"); external(null);
    expect(document.querySelector('[data-empty-state="list"]')).not.toBeNull();
  });
});
