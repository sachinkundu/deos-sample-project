// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ExpenseTrackerApp } from "../src/app.js";
import { STORAGE_KEY } from "../src/storage.js";

const html = readFileSync("web/index.html", "utf8");
let sequence = 0;

function mount(options = {}) {
  document.documentElement.innerHTML = html;
  const app = new ExpenseTrackerApp({
    uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    ...options,
  });
  return app.start();
}

function add(app, input = {}) {
  return app.submitAdd({
    name: "Lunch",
    amount: "12.50",
    category: "Food",
    ...input,
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sequence = 0;
});

describe("rendered expense tracker", () => {
  it("starts with All selected and an exact empty total", () => {
    mount();
    expect(document.querySelector('[data-filter="All"]').getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector("#visible-total").textContent).toBe("€0.00");
    expect(document.querySelector("#empty-state").hidden).toBe(false);
  });

  it("adds literal text, filters rows, and totals only the visible list", () => {
    const app = mount();
    add(app, { name: "<img src=x onerror=alert(1)>" });
    add(app, { name: "Train", amount: "20", category: "Travel" });
    expect(document.querySelectorAll(".expense-row")).toHaveLength(2);
    expect(document.querySelector("#expense-list").textContent).toContain("<img src=x onerror=alert(1)>");
    expect(document.querySelector("#expense-list img")).toBeNull();
    expect(document.querySelector("#visible-total").textContent).toBe("€32.50");

    document.querySelector('[data-filter="Travel"]').click();
    expect(document.querySelectorAll(".expense-row")).toHaveLength(1);
    expect(document.querySelector("#expense-list").textContent).toContain("Train");
    expect(document.querySelector("#visible-total").textContent).toBe("€20.00");

    document.querySelector('[data-filter="Bills"]').click();
    expect(document.querySelectorAll(".expense-row")).toHaveLength(0);
    expect(document.querySelector("#visible-total").textContent).toBe("€0.00");
  });

  it("shows keyboard-visible add errors and preserves the draft", () => {
    const app = mount();
    app.nameInput.value = " ";
    app.amountInput.value = "1.999";
    app.categoryInput.value = "Food";
    app.form.requestSubmit();
    expect(document.querySelector("#name-error").textContent).toBe("Enter a name.");
    expect(document.querySelector("#amount-error").textContent).toContain("two decimal places");
    expect(document.activeElement).toBe(app.nameInput);
    expect(app.amountInput.value).toBe("1.999");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("rejects an unsupported category at the submission boundary without changing state or storage", () => {
    const app = mount();
    add(app);
    const before = localStorage.getItem(STORAGE_KEY);
    expect(app.submitAdd({ name: "Concert", amount: "30.00", category: "Entertainment" })).toBe(false);
    expect(app.expenses).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    expect(document.querySelector("#category-error").textContent)
      .toBe("Choose Food, Travel, Bills, or Other.");
  });

  it("keeps saved values and the edit draft after rejected edit validation", () => {
    const app = mount();
    add(app);
    const id = app.expenses[0].id;
    document.querySelector("[data-action=edit]").click();
    const editForm = document.querySelector(".edit-form");
    editForm.elements.amount.value = "0";
    editForm.requestSubmit();
    expect(document.querySelector(".saved-value").textContent).toContain("€12.50");
    expect(document.querySelector(".edit-form [name=amount]").value).toBe("0");
    expect(document.activeElement.name).toBe("amount");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).expenses[0].amountCents).toBe("1250");
    expect(app.editor.id).toBe(id);
  });

  it("edits all fields, preserves the ID, and returns focus to Edit", () => {
    const app = mount();
    add(app, { name: "Train", amount: "20", category: "Travel" });
    const id = app.expenses[0].id;
    document.querySelector("[data-action=edit]").click();
    const form = document.querySelector(".edit-form");
    form.elements.name.value = "Power bill";
    form.elements.amount.value = "45.75";
    form.elements.category.value = "Bills";
    form.requestSubmit();

    expect(app.expenses[0]).toEqual({ id, name: "Power bill", amountCents: "4575", category: "Bills" });
    expect(document.querySelector("#visible-total").textContent).toBe("€45.75");
    expect(document.activeElement.dataset.action).toBe("edit");
  });

  it("switches to All only when a successful mutation would be hidden", () => {
    const app = mount();
    add(app);
    document.querySelector('[data-filter="Food"]').click();
    add(app, { name: "Snack", amount: "1", category: "Food" });
    expect(app.filter).toBe("Food");

    add(app, { name: "Taxi", amount: "8.40", category: "Travel" });
    expect(app.filter).toBe("All");
    expect(document.querySelector("#status-message").textContent).toContain("filter changed to All");
    expect(document.querySelector("#visible-total").textContent).toBe("€21.90");
  });

  it("focuses the next row, previous row, then empty fallback after deletes", () => {
    const app = mount();
    add(app, { name: "One" });
    add(app, { name: "Two" });
    add(app, { name: "Three" });
    app.deleteById(app.expenses[1].id);
    expect(document.activeElement.getAttribute("aria-label")).toBe("Edit Three");
    app.deleteById(app.expenses[1].id);
    expect(document.activeElement.getAttribute("aria-label")).toBe("Edit One");
    app.deleteById(app.expenses[0].id);
    expect(document.activeElement).toBe(document.querySelector("#empty-state"));
  });

  it("restores successful add, edit, and delete mutations after reload-equivalent mounts", () => {
    let app = mount();
    add(app);
    add(app, { name: "Train", amount: "20", category: "Travel" });
    const lunchId = app.expenses[0].id;
    const trainId = app.expenses[1].id;
    app.submitEdit(trainId, { name: "Power bill", amount: "45.75", category: "Bills" });
    app.deleteById(lunchId);

    app = mount();
    expect(app.expenses).toEqual([
      { id: trainId, name: "Power bill", amountCents: "4575", category: "Bills" },
    ]);
    expect(document.querySelector("#visible-total").textContent).toBe("€45.75");
  });

  it("blocks malformed saved data, loads no partial rows, and requires confirmed clearing", () => {
    localStorage.setItem(STORAGE_KEY, '{"version":1,"expenses":[{"id":"a","name":"","amountCents":"12.5","category":"Snacks"}]}');
    const app = mount();
    expect(app.blocked.kind).toBe("invalid");
    expect(document.querySelectorAll(".expense-row")).toHaveLength(0);
    expect(document.querySelector("#add-fields").disabled).toBe(true);
    document.querySelector("#clear-storage").click();
    expect(document.querySelector("#clear-confirmation").hidden).toBe(false);
    document.querySelector("#confirm-clear-storage").click();
    expect(app.blocked).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.querySelector("#visible-total").textContent).toBe("€0.00");
  });

  it("reports inaccessible storage and can retry", () => {
    let denied = true;
    const storage = {
      getItem: () => { if (denied) throw new Error("denied"); return null; },
      setItem: () => {},
      removeItem: () => {},
    };
    const app = mount({ storage });
    expect(app.blocked.kind).toBe("access");
    denied = false;
    document.querySelector("#retry-storage").click();
    expect(app.blocked).toBeNull();
  });

  it("keeps canonical state and draft unchanged when UUID or storage writes fail", () => {
    let app = mount({ uuid: () => { throw new Error("unavailable"); } });
    app.nameInput.value = "Lunch";
    app.amountInput.value = "12.50";
    app.categoryInput.value = "Food";
    app.form.requestSubmit();
    expect(app.expenses).toEqual([]);
    expect(app.nameInput.value).toBe("Lunch");

    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error("full"); },
      removeItem: () => {},
    };
    app = mount({ storage });
    app.nameInput.value = "Lunch";
    app.amountInput.value = "12.50";
    app.form.requestSubmit();
    expect(app.expenses).toEqual([]);
    expect(app.nameInput.value).toBe("Lunch");
  });

  it("detects a preflight conflict, adopts latest data, and preserves the edit draft", () => {
    const app = mount();
    add(app);
    const id = app.expenses[0].id;
    document.querySelector("[data-action=edit]").click();
    const form = document.querySelector(".edit-form");
    form.elements.amount.value = "15.00";

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      expenses: [
        { id, name: "Lunch", amountCents: "1250", category: "Food" },
        { id: "coffee", name: "Coffee", amountCents: "300", category: "Food" },
      ],
    }));
    form.requestSubmit();

    expect(app.expenses).toHaveLength(2);
    expect(app.expenses[0].amountCents).toBe("1250");
    expect(document.querySelector(".edit-form [name=amount]").value).toBe("15.00");
    expect(document.querySelector("#status-message").textContent).toContain("changed in another tab");

    document.querySelector(".edit-form").requestSubmit();
    expect(app.expenses[0].amountCents).toBe("1500");
    expect(document.querySelector("#visible-total").textContent).toBe("€18.00");
  });

  it("adopts valid storage events and blocks invalid external data", () => {
    const app = mount();
    const valid = JSON.stringify({
      version: 1,
      expenses: [{ id: "external", name: "Coffee", amountCents: "300", category: "Food" }],
    });
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: valid }));
    expect(app.expenses[0].name).toBe("Coffee");
    expect(document.querySelector("#visible-total").textContent).toBe("€3.00");

    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "{" }));
    expect(app.blocked.kind).toBe("invalid");
    expect(document.querySelectorAll(".expense-row")).toHaveLength(0);
  });
});
