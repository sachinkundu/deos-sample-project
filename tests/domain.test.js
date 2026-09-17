import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  addExpense,
  deleteExpense,
  editExpense,
  filterAfterVisibleMutation,
  formatCents,
  parseAmount,
  serializeDocument,
  totalCents,
  validateDocument,
  validateExpenseInput,
  visibleExpenses,
} from "../src/domain.js";

const expense = (overrides = {}) => ({
  id: "a",
  name: "Lunch",
  amountCents: "1250",
  category: "Food",
  ...overrides,
});

describe("exact amount handling", () => {
  it.each([
    ["12", "1200"],
    ["12.", "1200"],
    ["12.5", "1250"],
    ["12.50", "1250"],
    ["000.05", "5"],
    ["999999999999999999999999.99", "99999999999999999999999999"],
  ])("parses %s to canonical cents", (input, cents) => {
    expect(parseAmount(input)).toEqual({ ok: true, amountCents: cents });
  });

  it.each([
    ["", "Enter an amount."],
    ["  ", "Enter an amount."],
    ["hello", "Enter a numeric euro amount."],
    ["1,20", "Enter a numeric euro amount."],
    ["-1", "Amount must be more than zero."],
    ["0", "Amount must be more than zero."],
    ["0.00", "Amount must be more than zero."],
    ["1.999", "Amount can have no more than two decimal places."],
  ])("rejects %j with a field-specific message", (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error });
  });

  it("formats exact small, ordinary, and very large cent strings", () => {
    expect(formatCents("0")).toBe("€0.00");
    expect(formatCents("5")).toBe("€0.05");
    expect(formatCents("1250")).toBe("€12.50");
    expect(formatCents("900719925474099312")).toBe("€9007199254740993.12");
  });

  it("adds totals with BigInt rather than floating point", () => {
    expect(totalCents([
      expense({ amountCents: "900719925474099312" }),
      expense({ id: "b", amountCents: "88" }),
    ])).toBe("900719925474099400");
  });
});

describe("expense validation and transitions", () => {
  it("trims a valid name and accepts every fixed category", () => {
    for (const category of CATEGORIES) {
      expect(validateExpenseInput({ name: "  Lunch  ", amount: "12.50", category }))
        .toEqual({ ok: true, value: { name: "Lunch", amountCents: "1250", category } });
    }
  });

  it("returns errors for every invalid field together", () => {
    expect(validateExpenseInput({ name: " ", amount: "", category: "Entertainment" })).toEqual({
      ok: false,
      errors: {
        name: "Enter a name.",
        amount: "Enter an amount.",
        category: "Choose Food, Travel, Bills, or Other.",
      },
    });
  });

  it("targets edits and deletes by ID even when names are duplicated", () => {
    const start = [expense(), expense({ id: "b" })];
    const edited = editExpense(start, "b", { name: "Lunch", amountCents: "300", category: "Other" });
    expect(edited[0].amountCents).toBe("1250");
    expect(edited[1]).toEqual({ id: "b", name: "Lunch", amountCents: "300", category: "Other" });
    expect(deleteExpense(edited, "a")).toEqual([edited[1]]);
    expect(editExpense(start, "missing", {})).toBeNull();
    expect(deleteExpense(start, "missing")).toBeNull();
  });

  it("appends without mutating the prior collection", () => {
    const start = [expense()];
    const next = addExpense(start, expense({ id: "b", name: "Train" }));
    expect(start).toHaveLength(1);
    expect(next.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("derives all five filters and an empty result", () => {
    const rows = CATEGORIES.map((category, index) => expense({ id: String(index), category }));
    expect(visibleExpenses(rows, "All")).toHaveLength(4);
    for (const category of CATEGORIES) {
      expect(visibleExpenses(rows, category).map((row) => row.category)).toEqual([category]);
    }
    expect(visibleExpenses(rows.slice(0, 1), "Bills")).toEqual([]);
  });

  it("retains matching filters and reveals mismatched mutations via All", () => {
    expect(filterAfterVisibleMutation("All", "Travel")).toBe("All");
    expect(filterAfterVisibleMutation("Food", "Food")).toBe("Food");
    expect(filterAfterVisibleMutation("Food", "Travel")).toBe("All");
  });
});

describe("stored document validation", () => {
  it("accepts a canonical document and omits unknown fields when serializing", () => {
    const checked = validateDocument({ version: 1, ignored: true, expenses: [{ ...expense(), ignored: true }] });
    expect(checked.ok).toBe(true);
    expect(serializeDocument(checked.document)).toBe(
      '{"version":1,"expenses":[{"id":"a","name":"Lunch","amountCents":"1250","category":"Food"}]}'
    );
  });

  it.each([
    [null],
    [{ version: 2, expenses: [] }],
    [{ version: 1, expenses: {} }],
    [{ version: 1, expenses: [expense({ id: "" })] }],
    [{ version: 1, expenses: [expense({ name: " Lunch" })] }],
    [{ version: 1, expenses: [expense({ amountCents: "0" })] }],
    [{ version: 1, expenses: [expense({ amountCents: "12.5" })] }],
    [{ version: 1, expenses: [expense({ category: "Snacks" })] }],
    [{ version: 1, expenses: [expense(), expense()] }],
  ])("rejects malformed or duplicate data without partial recovery", (document) => {
    expect(validateDocument(document).ok).toBe(false);
  });
});
