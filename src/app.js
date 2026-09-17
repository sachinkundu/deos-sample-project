import {
  CATEGORIES,
  addExpense,
  centsToInput,
  deleteExpense,
  editExpense,
  emptyDocument,
  filterAfterVisibleMutation,
  formatCents,
  totalCents,
  validateExpenseInput,
  visibleExpenses,
} from "./domain.js";
import { ExpenseStorageAdapter, STORAGE_KEY } from "./storage.js";

const firstErrorField = (errors) => ["name", "amount", "category"].find((field) => errors[field]);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class ExpenseTrackerApp {
  constructor({ root = document, storage = window.localStorage, uuid = () => crypto.randomUUID() } = {}) {
    this.root = root;
    this.adapter = new ExpenseStorageAdapter(storage);
    this.uuid = uuid;
    this.expenses = [];
    this.snapshot = null;
    this.filter = "All";
    this.editor = null;
    this.addErrors = {};
    this.status = null;
    this.blocked = null;
    this.pendingClear = false;

    this.form = root.querySelector("#expense-form");
    this.nameInput = root.querySelector("#expense-name");
    this.amountInput = root.querySelector("#expense-amount");
    this.categoryInput = root.querySelector("#expense-category");
    this.list = root.querySelector("#expense-list");
    this.emptyState = root.querySelector("#empty-state");
    this.total = root.querySelector("#visible-total");
    this.statusNode = root.querySelector("#status-message");
    this.recoveryPanel = root.querySelector("#recovery-panel");
    this.filterButtons = root.querySelector("#filter-buttons");
  }

  start() {
    this.bind();
    this.load();
    return this;
  }

  bind() {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submitAdd({
        name: this.nameInput.value,
        amount: this.amountInput.value,
        category: this.categoryInput.value,
      });
    });

    this.filterButtons.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      this.filter = button.dataset.filter;
      this.setStatus(`Showing ${this.filter === "All" ? "all expenses" : `${this.filter} expenses`}.`);
      this.render();
    });

    this.list.addEventListener("click", (event) => this.handleListClick(event));
    this.list.addEventListener("submit", (event) => {
      const form = event.target.closest(".edit-form");
      if (!form) return;
      event.preventDefault();
      this.submitEdit(form.dataset.id, {
        name: form.elements.name.value,
        amount: form.elements.amount.value,
        category: form.elements.category.value,
      });
    });

    this.root.querySelector("#clear-storage").addEventListener("click", () => {
      this.pendingClear = true;
      this.renderRecovery();
      this.root.querySelector("#confirm-clear-storage").focus();
    });
    this.root.querySelector("#cancel-clear-storage").addEventListener("click", () => {
      this.pendingClear = false;
      this.renderRecovery();
      this.root.querySelector("#clear-storage").focus();
    });
    this.root.querySelector("#confirm-clear-storage").addEventListener("click", () => this.clearStorage());
    this.root.querySelector("#retry-storage").addEventListener("click", () => this.load(true));

    window.addEventListener("storage", (event) => this.handleStorageEvent(event));
  }

  load(isRetry = false) {
    const loaded = this.adapter.read();
    if (!loaded.ok) {
      this.enterBlocked(loaded);
      if (isRetry) this.setStatus("Saved data is still unavailable.", "error");
      this.render();
      return false;
    }
    this.expenses = loaded.document.expenses;
    this.snapshot = loaded.snapshot;
    this.blocked = null;
    this.pendingClear = false;
    this.filter = "All";
    if (isRetry) this.setStatus("Saved data is available again.");
    this.render();
    return true;
  }

  enterBlocked(result) {
    this.expenses = [];
    this.snapshot = null;
    this.blocked = result;
    this.editor = null;
  }

  setStatus(message, tone = "success") {
    this.status = { message, tone };
  }

  submitAdd(input) {
    if (this.blocked) return false;
    const validated = validateExpenseInput(input);
    this.addErrors = validated.ok ? {} : validated.errors;
    if (!validated.ok) {
      this.setStatus("Fix the highlighted field and try again.", "error");
      this.render();
      this.focusAddError();
      return false;
    }

    let id;
    try {
      id = this.uuid();
      if (typeof id !== "string" || !id) throw new Error("Invalid UUID");
    } catch {
      this.setStatus("The expense could not be created. Try again.", "error");
      this.render();
      return false;
    }

    const candidate = addExpense(this.expenses, { id, ...validated.value });
    const result = this.persist(candidate);
    if (!result) return false;

    const previousFilter = this.filter;
    this.filter = filterAfterVisibleMutation(this.filter, validated.value.category);
    this.form.reset();
    this.categoryInput.value = CATEGORIES[0];
    this.addErrors = {};
    this.setStatus(
      previousFilter !== this.filter
        ? "Expense saved. The filter changed to All so the new expense is visible."
        : "Expense saved."
    );
    this.render();
    this.nameInput.focus();
    return true;
  }

  submitEdit(id, input) {
    if (this.blocked) return false;
    if (!this.expenses.some((expense) => expense.id === id)) {
      this.editor = null;
      this.setStatus("That expense is no longer available.", "error");
      this.render();
      return false;
    }

    const validated = validateExpenseInput(input);
    this.editor = { id, ...input, errors: validated.ok ? {} : validated.errors };
    if (!validated.ok) {
      this.setStatus("Fix the highlighted field and try again.", "error");
      this.render();
      this.focusEditError(id, firstErrorField(validated.errors));
      return false;
    }

    const candidate = editExpense(this.expenses, id, validated.value);
    const result = this.persist(candidate);
    if (!result) return false;

    const previousFilter = this.filter;
    this.filter = filterAfterVisibleMutation(this.filter, validated.value.category);
    this.editor = null;
    this.setStatus(
      previousFilter !== this.filter
        ? "Expense updated. The filter changed to All so the edited expense is visible."
        : "Expense updated."
    );
    this.render();
    this.focusRowAction(id, "edit");
    return true;
  }

  deleteById(id) {
    if (this.blocked) return false;
    const before = visibleExpenses(this.expenses, this.filter);
    const index = before.findIndex((expense) => expense.id === id);
    const candidate = deleteExpense(this.expenses, id);
    if (!candidate) {
      this.setStatus("That expense is no longer available.", "error");
      this.render();
      return false;
    }
    if (!this.persist(candidate)) return false;

    if (this.editor?.id === id) this.editor = null;
    this.setStatus("Expense deleted.");
    this.render();

    const after = visibleExpenses(this.expenses, this.filter);
    const focusTarget = after[index] ?? after[index - 1];
    if (focusTarget) this.focusRowAction(focusTarget.id, "edit");
    else this.emptyState.focus();
    return true;
  }

  persist(candidateExpenses) {
    const document = { ...emptyDocument(), expenses: candidateExpenses };
    const result = this.adapter.write(document, this.snapshot);
    if (result.ok) {
      this.expenses = result.document.expenses;
      this.snapshot = result.snapshot;
      return true;
    }

    if (result.kind === "conflict") {
      this.expenses = result.document.expenses;
      this.snapshot = result.snapshot;
      if (this.editor && !this.expenses.some((expense) => expense.id === this.editor.id)) {
        this.editor = null;
        this.setStatus("Expenses changed in another tab. This expense is no longer available.", "notice");
      } else {
        this.setStatus("Expenses changed in another tab. Review the latest list, then retry your change.", "notice");
      }
      this.render();
      return false;
    }

    if (result.kind === "invalid" || result.kind === "access") {
      this.enterBlocked(result);
      this.setStatus("The change was not accepted because saved data needs attention.", "error");
    } else {
      this.setStatus(result.error, "error");
    }
    this.render();
    return false;
  }

  handleListClick(event) {
    const action = event.target.closest("button[data-action]");
    if (!action) return;
    const row = action.closest("[data-id]");
    const id = row?.dataset.id;
    if (!id) return;

    if (action.dataset.action === "edit") {
      const expense = this.expenses.find((item) => item.id === id);
      if (!expense) return;
      this.editor = {
        id,
        name: expense.name,
        amount: centsToInput(expense.amountCents),
        category: expense.category,
        errors: {},
      };
      this.render();
      this.list.querySelector(`[data-id="${id}"] input[name="name"]`)?.focus();
    } else if (action.dataset.action === "cancel") {
      this.editor = null;
      this.setStatus("Edit cancelled.");
      this.render();
      this.focusRowAction(id, "edit");
    } else if (action.dataset.action === "delete") {
      this.deleteById(id);
    }
  }

  handleStorageEvent(event) {
    if (event.key !== STORAGE_KEY) return;
    const loaded = this.adapter.parseRaw(event.newValue);
    if (!loaded.ok) {
      this.enterBlocked(loaded);
      this.setStatus("Saved data changed in another tab and is invalid. Clear it or retry access.", "error");
    } else {
      this.expenses = loaded.document.expenses;
      this.snapshot = loaded.snapshot;
      this.blocked = null;
      this.setStatus("Expenses were updated from another tab.", "notice");
    }
    this.render();
  }

  clearStorage() {
    const result = this.adapter.clear();
    if (!result.ok) {
      this.enterBlocked(result);
      this.pendingClear = false;
      this.setStatus(result.error, "error");
      this.render();
      return;
    }
    this.expenses = [];
    this.snapshot = null;
    this.blocked = null;
    this.pendingClear = false;
    this.filter = "All";
    this.setStatus("Unreadable saved data was cleared. You can add expenses again.");
    this.render();
    this.nameInput.focus();
  }

  focusAddError() {
    const field = firstErrorField(this.addErrors);
    this.form.elements[field]?.focus();
  }

  focusEditError(id, field) {
    this.list.querySelector(`[data-id="${id}"] [name="${field}"]`)?.focus();
  }

  focusRowAction(id, action) {
    [...this.list.querySelectorAll("[data-id]")]
      .find((row) => row.dataset.id === id)
      ?.querySelector(`[data-action="${action}"]`)
      ?.focus();
  }

  render() {
    this.renderStatus();
    this.renderRecovery();
    this.renderFilters();
    this.renderAddErrors();
    this.renderRows();
  }

  renderStatus() {
    if (!this.status) {
      this.statusNode.hidden = true;
      this.statusNode.textContent = "";
      return;
    }
    this.statusNode.hidden = false;
    this.statusNode.dataset.tone = this.status.tone;
    this.statusNode.textContent = this.status.message;
  }

  renderRecovery() {
    const addFields = this.root.querySelector("#add-fields");
    addFields.disabled = Boolean(this.blocked);
    this.recoveryPanel.hidden = !this.blocked;
    if (!this.blocked) return;

    this.root.querySelector("#recovery-message").textContent =
      this.blocked.kind === "invalid"
        ? "The saved document is invalid, so no partial expenses were loaded. Clear it only if you want to start over."
        : "Browser storage is unavailable. Your expenses cannot be changed until access returns.";
    this.root.querySelector("#clear-storage").hidden = this.blocked.kind !== "invalid";
    this.root.querySelector("#retry-storage").hidden = this.blocked.kind === "invalid";
    this.root.querySelector("#clear-confirmation").hidden = !this.pendingClear;
  }

  renderFilters() {
    for (const button of this.filterButtons.querySelectorAll("[data-filter]")) {
      button.setAttribute("aria-pressed", String(button.dataset.filter === this.filter));
    }
  }

  renderAddErrors() {
    for (const field of ["name", "amount", "category"]) {
      const input = this.form.elements[field];
      const error = this.root.querySelector(`#${field}-error`);
      error.textContent = this.addErrors[field] ?? "";
      input.setAttribute("aria-invalid", String(Boolean(this.addErrors[field])));
    }
  }

  renderRows() {
    this.list.replaceChildren();
    const visible = visibleExpenses(this.expenses, this.filter);
    this.total.textContent = formatCents(totalCents(visible));
    this.emptyState.hidden = visible.length > 0;
    this.emptyState.querySelector("h3").textContent =
      this.filter === "All" ? "No expenses here yet" : `No ${this.filter.toLowerCase()} expenses`;

    for (const expense of visible) {
      this.list.append(this.editor?.id === expense.id
        ? this.renderEditor(expense, this.editor)
        : this.renderExpense(expense));
    }
  }

  renderExpense(expense) {
    const row = element("li", "expense-row");
    row.dataset.id = expense.id;
    const view = element("div", "expense-view");

    const name = element("div", "expense-name");
    name.append(element("strong", "", expense.name));

    const category = element("span", "category-badge", expense.category);
    const amount = element("span", "expense-amount", formatCents(expense.amountCents));
    amount.dataset.amount = expense.id;

    const actions = element("div", "row-actions");
    const edit = element("button", "icon-button edit-action", "Edit");
    edit.type = "button";
    edit.dataset.action = "edit";
    edit.setAttribute("aria-label", `Edit ${expense.name}`);
    edit.disabled = Boolean(this.blocked);
    const remove = element("button", "icon-button delete-action", "Delete");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.setAttribute("aria-label", `Delete ${expense.name}`);
    remove.disabled = Boolean(this.blocked);
    actions.append(edit, remove);

    view.append(name, category, amount, actions);
    row.append(view);
    return row;
  }

  renderEditor(expense, draft) {
    const row = element("li", "expense-row");
    row.dataset.id = expense.id;
    const form = element("form", "edit-form");
    form.dataset.id = expense.id;
    form.noValidate = true;
    form.append(element(
      "p",
      "saved-value",
      `Saved expense: ${expense.name} · ${formatCents(expense.amountCents)} · ${expense.category}`
    ));

    const grid = element("div", "edit-grid");
    const fields = [
      ["name", "Name", "text"],
      ["amount", "Amount", "text"],
      ["category", "Category", "select"],
    ];
    for (const [field, labelText, type] of fields) {
      const wrapper = element("div", "field");
      const label = element("label", "", labelText);
      label.htmlFor = `edit-${field}-${expense.id}`;
      let control;
      if (type === "select") {
        control = element("select");
        for (const category of CATEGORIES) {
          const option = element("option", "", category);
          option.value = category;
          control.append(option);
        }
        if (!CATEGORIES.includes(draft[field])) {
          const option = element("option", "", draft[field]);
          option.value = draft[field];
          control.append(option);
        }
      } else {
        control = element("input");
        control.type = type;
        control.autocomplete = "off";
      }
      control.id = label.htmlFor;
      control.name = field;
      control.value = draft[field];
      control.setAttribute("aria-invalid", String(Boolean(draft.errors?.[field])));
      const error = element("p", "field-error", draft.errors?.[field] ?? "");
      wrapper.append(label, control, error);
      grid.append(wrapper);
    }

    const actions = element("div", "edit-actions");
    const save = element("button", "secondary-button", "Save");
    save.type = "submit";
    const cancel = element("button", "text-button", "Cancel");
    cancel.type = "button";
    cancel.dataset.action = "cancel";
    actions.append(save, cancel);
    grid.append(actions);
    form.append(grid);
    row.append(form);
    return row;
  }
}

export function startExpenseTracker(options) {
  return new ExpenseTrackerApp(options).start();
}

if (document.querySelector("#expense-form")) {
  window.expenseTracker = startExpenseTracker();
}
