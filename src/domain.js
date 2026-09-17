export const CATEGORIES = Object.freeze(["Food", "Travel", "Bills", "Other"]);
export const FILTERS = Object.freeze(["All", ...CATEGORIES]);
export const DOCUMENT_VERSION = 1;

export function emptyDocument() {
  return { version: DOCUMENT_VERSION, expenses: [] };
}

export function parseAmount(value) {
  const input = String(value ?? "").trim();
  if (!input) return { ok: false, error: "Enter an amount." };

  if (/^-\d+(?:\.\d*)?$/.test(input)) {
    return { ok: false, error: "Amount must be more than zero." };
  }

  const numeric = /^(\d+)(?:\.(\d*))?$/.exec(input);
  if (!numeric) {
    return { ok: false, error: "Enter a numeric euro amount." };
  }

  const fraction = numeric[2] ?? "";
  if (fraction.length > 2) {
    return { ok: false, error: "Amount can have no more than two decimal places." };
  }

  const canonical = `${numeric[1]}${fraction.padEnd(2, "0")}`.replace(/^0+/, "") || "0";
  if (canonical === "0") {
    return { ok: false, error: "Amount must be more than zero." };
  }

  return { ok: true, amountCents: canonical };
}

export function formatCents(value) {
  const cents = String(value);
  const padded = cents.padStart(3, "0");
  return `€${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

export function centsToInput(value) {
  return formatCents(value).slice(1);
}

export function validateExpenseInput(input) {
  const errors = {};
  const name = String(input.name ?? "").trim();
  if (!name) errors.name = "Enter a name.";

  const amount = parseAmount(input.amount);
  if (!amount.ok) errors.amount = amount.error;

  const category = String(input.category ?? "");
  if (!CATEGORIES.includes(category)) {
    errors.category = "Choose Food, Travel, Bills, or Other.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, amountCents: amount.amountCents, category },
  };
}

export function validateDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Saved data is not a document." };
  }
  if (value.version !== DOCUMENT_VERSION || !Array.isArray(value.expenses)) {
    return { ok: false, error: "Saved data uses an unsupported format." };
  }

  const ids = new Set();
  const expenses = [];
  for (const expense of value.expenses) {
    const valid = expense && typeof expense === "object" && !Array.isArray(expense)
      && typeof expense.id === "string" && expense.id.length > 0
      && typeof expense.name === "string" && expense.name.length > 0
      && expense.name === expense.name.trim()
      && typeof expense.amountCents === "string" && /^[1-9]\d*$/.test(expense.amountCents)
      && CATEGORIES.includes(expense.category)
      && !ids.has(expense.id);
    if (!valid) return { ok: false, error: "Saved data contains an invalid expense." };
    ids.add(expense.id);
    expenses.push({
      id: expense.id,
      name: expense.name,
      amountCents: expense.amountCents,
      category: expense.category,
    });
  }

  return { ok: true, document: { version: DOCUMENT_VERSION, expenses } };
}

export function serializeDocument(document) {
  return JSON.stringify({
    version: DOCUMENT_VERSION,
    expenses: document.expenses.map(({ id, name, amountCents, category }) => ({
      id, name, amountCents, category,
    })),
  });
}

export function visibleExpenses(expenses, filter) {
  return filter === "All" ? expenses : expenses.filter((expense) => expense.category === filter);
}

export function totalCents(expenses) {
  return expenses.reduce((total, expense) => total + BigInt(expense.amountCents), 0n).toString();
}

export function addExpense(expenses, expense) {
  return [...expenses, expense];
}

export function editExpense(expenses, id, replacement) {
  if (!expenses.some((expense) => expense.id === id)) return null;
  return expenses.map((expense) => expense.id === id ? { ...expense, ...replacement, id } : expense);
}

export function deleteExpense(expenses, id) {
  if (!expenses.some((expense) => expense.id === id)) return null;
  return expenses.filter((expense) => expense.id !== id);
}

export function filterAfterVisibleMutation(filter, category) {
  return filter === "All" || filter === category ? filter : "All";
}
