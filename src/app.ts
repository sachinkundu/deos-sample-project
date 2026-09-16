import {
  addItem,
  deleteItem,
  renameItem,
  setPacked,
  toDocument,
  validateName,
  visibleItems,
  type CryptoSource,
  type ListFilter,
  type PackingItem,
  type PackingListDocument,
  type PersistenceStatus,
} from "./model";
import { downloadText, PackingStorage, parseDocument, PRIMARY_KEY } from "./storage";

type AppMode = "ready" | "read-denied" | "invalid" | "conflict" | "external-invalid";
type RecoveryIntent = "reset" | "restore";
type RowControl = "packed" | "rename" | "delete";

interface AppDependencies {
  root: HTMLElement;
  storage: PackingStorage;
  cryptoSource: CryptoSource;
  windowRef: Window;
  confirmAction: (message: string) => boolean;
}

interface RowReferences {
  itemId: string;
  checkbox: HTMLInputElement;
  rename: HTMLButtonElement;
  delete: HTMLButtonElement;
}

interface FocusTarget {
  itemId: string;
  control: RowControl;
  index: number;
}

function makeButton(text: string, className = "button secondary"): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

export class PackingListApp {
  private items: PackingItem[] = [];
  private filter: ListFilter = "all";
  private persistence: PersistenceStatus = "saved";
  private mode: AppMode = "ready";
  private rejectedRaw: string | null = null;
  private pendingExternal: PackingListDocument | null = null;
  private message = "";
  private addError = "";
  private editId: string | null = null;
  private editDraft = "";
  private editError = "";
  private recoveryIntent: RecoveryIntent | null = null;
  private previousRecoveryRaw: string | null = null;
  private rowReferences: RowReferences[] = [];
  private listStatus: HTMLElement | null = null;
  private addInput: HTMLInputElement | null = null;

  constructor(private readonly deps: AppDependencies) {}

  start(): void {
    this.deps.windowRef.addEventListener("storage", this.handleStorageEvent);
    this.loadFromStorage();
  }

  destroy(): void {
    this.deps.windowRef.removeEventListener("storage", this.handleStorageEvent);
  }

  private loadFromStorage(): void {
    const result = this.deps.storage.read();
    this.filter = "all";
    this.persistence = "saved";
    this.pendingExternal = null;
    this.recoveryIntent = null;
    this.previousRecoveryRaw = null;
    if (result.status === "missing" || result.status === "valid") {
      this.items = result.document.items;
      this.mode = "ready";
      this.rejectedRaw = null;
      this.message = "";
    } else if (result.status === "invalid") {
      this.items = [];
      this.mode = "invalid";
      this.rejectedRaw = result.raw;
      this.message = result.reason;
    } else {
      this.items = [];
      this.mode = "read-denied";
      this.rejectedRaw = null;
      this.message = result.reason;
    }
    this.editId = null;
    this.render();
  }

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== PRIMARY_KEY) return;
    const focus = this.captureFocus();
    const parsed = event.newValue === null
      ? { ok: true as const, document: toDocument([]) }
      : parseDocument(event.newValue);

    if (!parsed.ok) {
      this.mode = "external-invalid";
      this.rejectedRaw = event.newValue ?? "";
      this.pendingExternal = null;
      this.editId = null;
      this.message = parsed.reason;
      this.render();
      this.focusAfterReplacement(focus);
      return;
    }

    if (this.persistence === "unsaved") {
      this.mode = "conflict";
      this.pendingExternal = parsed.document;
      this.editId = null;
      this.message = "Another tab changed this list while your latest changes are not saved.";
      this.render();
      this.focusAfterReplacement(focus);
      return;
    }

    this.adoptExternal(parsed.document, focus);
  };

  private adoptExternal(documentValue: PackingListDocument, focus: FocusTarget | null): void {
    this.items = documentValue.items;
    this.mode = "ready";
    this.persistence = "saved";
    this.pendingExternal = null;
    this.rejectedRaw = null;
    this.editId = null;
    this.message = "List updated in another tab.";
    this.render();
    this.focusAfterReplacement(focus);
  }

  private isBlocked(): boolean {
    return this.mode !== "ready";
  }

  private commit(nextItems: PackingItem[], focus: FocusTarget | "add" | null): boolean {
    if (nextItems === this.items || this.isBlocked()) return false;
    this.items = nextItems;
    const result = this.deps.storage.save(toDocument(this.items));
    this.persistence = result.ok ? "saved" : "unsaved";
    this.message = result.ok ? "" : result.reason;
    this.render();
    if (focus === "add") this.addInput?.focus();
    else this.focusAfterReplacement(focus);
    return true;
  }

  private retrySave(): void {
    const result = this.deps.storage.save(toDocument(this.items));
    if (result.ok) {
      this.persistence = "saved";
      this.message = "Your latest changes are saved.";
    } else {
      this.persistence = "unsaved";
      this.message = result.reason;
    }
    this.render();
  }

  private keepLocalChanges(): void {
    const result = this.deps.storage.save(toDocument(this.items));
    if (result.ok) {
      this.mode = "ready";
      this.persistence = "saved";
      this.pendingExternal = null;
      this.message = "Your changes are saved and kept.";
    } else {
      this.persistence = "unsaved";
      this.message = result.reason;
    }
    this.render();
  }

  private useExternalChanges(): void {
    if (!this.pendingExternal) return;
    if (!this.deps.confirmAction("Discard your unsaved changes and use the other tab's list?")) return;
    const focus = this.captureFocus();
    this.adoptExternal(this.pendingExternal, focus);
  }

  private requestRecovery(intent: RecoveryIntent): void {
    const description = intent === "reset"
      ? "Reset the saved list? The rejected data will be backed up first."
      : "Restore your current list? The rejected data will be backed up first.";
    if (!this.deps.confirmAction(description)) return;
    const slot = this.deps.storage.readRecoverySlot();
    if (slot.status === "denied") {
      this.message = `The recovery copy could not be checked: ${slot.reason}`;
      this.render();
      return;
    }
    if (slot.status === "occupied") {
      this.recoveryIntent = intent;
      this.previousRecoveryRaw = slot.raw;
      this.message = "A previous recovery copy already exists. Download it if needed, then explicitly replace it to continue.";
      this.render();
      return;
    }
    this.completeRecovery(intent);
  }

  private replaceRecoveryAndContinue(): void {
    if (!this.recoveryIntent) return;
    if (!this.deps.confirmAction("Replace the previous recovery copy with the newest rejected data?")) return;
    this.completeRecovery(this.recoveryIntent);
  }

  private completeRecovery(intent: RecoveryIntent): void {
    if (this.rejectedRaw === null) return;
    const backup = this.deps.storage.backupRejected(this.rejectedRaw);
    if (!backup.ok) {
      this.message = `The rejected data could not be backed up: ${backup.reason}`;
      this.render();
      return;
    }
    const nextItems = intent === "restore" ? this.items : [];
    const saved = this.deps.storage.save(toDocument(nextItems));
    if (!saved.ok) {
      this.message = `The rejected data was backed up, but the list could not be written: ${saved.reason}`;
      this.render();
      return;
    }
    this.items = nextItems;
    this.mode = "ready";
    this.persistence = "saved";
    this.rejectedRaw = null;
    this.pendingExternal = null;
    this.previousRecoveryRaw = null;
    this.recoveryIntent = null;
    this.message = "Saved data recovered. The rejected value is preserved as the latest recovery copy.";
    this.render();
    this.addInput?.focus();
  }

  private captureFocus(): FocusTarget | null {
    const active = document.activeElement;
    for (let index = 0; index < this.rowReferences.length; index += 1) {
      const refs = this.rowReferences[index];
      if (!refs) continue;
      if (active === refs.checkbox) return { itemId: refs.itemId, control: "packed", index };
      if (active === refs.rename) return { itemId: refs.itemId, control: "rename", index };
      if (active === refs.delete) return { itemId: refs.itemId, control: "delete", index };
    }
    return null;
  }

  private focusAfterReplacement(target: FocusTarget | null): void {
    if (!target) return;
    const same = this.rowReferences.find((refs) => refs.itemId === target.itemId);
    if (same) {
      const control = target.control === "packed" ? same.checkbox : same[target.control];
      control.focus();
      return;
    }
    const fallback = this.rowReferences[target.index] ?? this.rowReferences[target.index - 1];
    if (fallback) fallback.checkbox.focus();
    else this.listStatus?.focus();
  }

  private render(): void {
    const { root } = this.deps;
    root.replaceChildren();
    this.rowReferences = [];

    const page = document.createElement("main");
    page.className = "page-shell";

    const hero = document.createElement("header");
    hero.className = "hero";
    hero.innerHTML = `
      <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="hero-copy">
        <p class="eyebrow">TRIP ESSENTIALS</p>
        <h1>Carry On</h1>
        <p class="hero-subtitle">Pack with a clear head. Your list stays in this browser.</p>
      </div>
      <div class="trip-stamp" aria-hidden="true"><span>READY FOR</span><strong>DEPARTURE</strong></div>`;
    page.append(hero);

    const workspace = document.createElement("section");
    workspace.className = "workspace";
    workspace.setAttribute("aria-labelledby", "list-title");

    const topbar = document.createElement("div");
    topbar.className = "workspace-topbar";
    const titleBlock = document.createElement("div");
    titleBlock.innerHTML = `<p class="section-kicker">CURRENT TRIP</p><h2 id="list-title">Packing list</h2>`;
    const count = document.createElement("div");
    count.className = "count-block";
    const left = this.items.filter((item) => !item.packed).length;
    count.innerHTML = `<strong>${left}</strong><span>${left === 1 ? "item" : "items"} left</span>`;
    topbar.append(titleBlock, count);
    workspace.append(topbar);

    const notices = this.renderNotices();
    if (notices) workspace.append(notices);

    const addForm = document.createElement("form");
    addForm.className = "add-form";
    addForm.noValidate = true;
    const addLabel = document.createElement("label");
    addLabel.htmlFor = "new-item";
    addLabel.textContent = "What do you need to pack?";
    const addControls = document.createElement("div");
    addControls.className = "add-controls";
    const addInput = document.createElement("input");
    addInput.id = "new-item";
    addInput.name = "item-name";
    addInput.type = "text";
    addInput.autocomplete = "off";
    addInput.placeholder = "e.g. Passport";
    addInput.disabled = this.isBlocked();
    addInput.setAttribute("aria-describedby", this.addError ? "add-error add-help" : "add-help");
    addInput.setAttribute("aria-invalid", String(Boolean(this.addError)));
    this.addInput = addInput;
    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.className = "button primary";
    addButton.textContent = "Add item";
    addButton.disabled = this.isBlocked();
    addControls.append(addInput, addButton);
    const addHelp = document.createElement("p");
    addHelp.id = "add-help";
    addHelp.className = "field-help";
    addHelp.textContent = "Saved locally after every change";
    addForm.append(addLabel, addControls);
    if (this.addError) {
      const error = document.createElement("p");
      error.id = "add-error";
      error.className = "field-error";
      error.setAttribute("role", "alert");
      error.textContent = this.addError;
      addForm.append(error);
    }
    addForm.append(addHelp);
    addForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = addItem(this.items, addInput.value, this.deps.cryptoSource);
      if (!result.ok) {
        this.addError = result.message;
        this.render();
        this.addInput!.value = addInput.value;
        this.addInput!.focus();
        return;
      }
      this.addError = "";
      if (this.commit(result.items, "add")) this.addInput!.value = "";
    });
    workspace.append(addForm);

    const listToolbar = document.createElement("div");
    listToolbar.className = "list-toolbar";
    const filterGroup = document.createElement("div");
    filterGroup.className = "filter-group";
    filterGroup.setAttribute("role", "group");
    filterGroup.setAttribute("aria-label", "Filter packing items");
    for (const [value, label] of [["all", "All"], ["to-pack", "To pack"]] as const) {
      const filterButton = makeButton(label, "filter-button");
      filterButton.dataset.filter = value;
      filterButton.setAttribute("aria-pressed", String(this.filter === value));
      filterButton.addEventListener("click", () => {
        this.filter = value;
        this.editId = null;
        this.editError = "";
        this.render();
      });
      filterGroup.append(filterButton);
    }
    const legend = document.createElement("p");
    legend.className = "packed-legend";
    legend.innerHTML = `<span aria-hidden="true">✓</span> Packed items are crossed out`;
    listToolbar.append(filterGroup, legend);
    workspace.append(listToolbar);

    const listArea = document.createElement("div");
    listArea.className = "list-area";
    const shownItems = visibleItems(this.items, this.filter);
    if (shownItems.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.tabIndex = -1;
      empty.setAttribute("role", "status");
      empty.dataset.emptyState = this.items.length === 0 ? "list" : "to-pack";
      empty.innerHTML = this.items.length === 0
        ? `<div class="empty-icon" aria-hidden="true">＋</div><h3>Your bag is waiting</h3><p>Add the first thing you don't want to forget.</p>`
        : `<div class="empty-icon complete" aria-hidden="true">✓</div><h3>Nothing left to pack</h3><p>Everything on your list is packed. Bon voyage.</p>`;
      this.listStatus = empty;
      listArea.append(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "item-list";
      list.setAttribute("aria-label", "Packing items");
      shownItems.forEach((item, index) => list.append(this.renderRow(item, index)));
      this.listStatus = list;
      list.tabIndex = -1;
      listArea.append(list);
    }
    workspace.append(listArea);

    const footer = document.createElement("footer");
    footer.className = "workspace-footer";
    footer.innerHTML = `<span class="privacy-dot" aria-hidden="true"></span><p><strong>Private to this browser</strong><br>Your packing list is stored on this device, not in an account.</p>`;
    workspace.append(footer);

    page.append(workspace);
    root.append(page);
  }

  private renderNotices(): HTMLElement | null {
    const stack = document.createElement("div");
    stack.className = "notice-stack";

    if (this.persistence === "unsaved") {
      const notice = this.notice("warning", "Changes not saved", "Your latest changes are still in this tab but may be lost on refresh. Free browser storage or allow site storage, then retry.");
      const retry = makeButton("Retry save");
      retry.addEventListener("click", () => this.retrySave());
      notice.append(retry);
      stack.append(notice);
    }

    if (this.mode === "read-denied") {
      const notice = this.notice("danger", "Saved list could not be read", "Nothing has been overwritten. List changes stay locked until browser storage can be read safely.");
      const retry = makeButton("Retry storage access");
      retry.addEventListener("click", () => this.loadFromStorage());
      notice.append(retry);
      stack.append(notice);
    }

    if (this.mode === "invalid" || this.mode === "external-invalid") {
      const external = this.mode === "external-invalid";
      const notice = this.notice("danger", external ? "Another tab saved unreadable data" : "Saved data needs attention", external
        ? "Your last valid list is still visible and locked. Download the exact rejected value before restoring or resetting."
        : "The saved value was left untouched. Download it before resetting if you may need it later.");
      const actions = document.createElement("div");
      actions.className = "notice-actions";
      const download = makeButton("Download saved data");
      download.addEventListener("click", () => { if (this.rejectedRaw !== null) downloadText(this.rejectedRaw); });
      actions.append(download);
      if (external) {
        const restore = makeButton("Restore my current list");
        restore.addEventListener("click", () => this.requestRecovery("restore"));
        actions.append(restore);
      }
      const reset = makeButton("Reset saved list", "button danger-button");
      reset.addEventListener("click", () => this.requestRecovery("reset"));
      actions.append(reset);
      notice.append(actions);
      stack.append(notice);
    }

    if (this.mode === "conflict") {
      const notice = this.notice("warning", "Choose which list to keep", "Another tab changed the list while this tab has unsaved work. List controls are locked until you choose.");
      const actions = document.createElement("div");
      actions.className = "notice-actions";
      const keep = makeButton("Keep my changes");
      keep.addEventListener("click", () => this.keepLocalChanges());
      const use = makeButton("Use other tab's list");
      use.addEventListener("click", () => this.useExternalChanges());
      actions.append(keep, use);
      notice.append(actions);
      stack.append(notice);
    }

    if (this.previousRecoveryRaw !== null && this.recoveryIntent) {
      const notice = this.notice("warning", "Previous recovery copy found", "The recovery slot keeps one value. Download the previous copy before replacing it with the newest rejected data.");
      const actions = document.createElement("div");
      actions.className = "notice-actions";
      const downloadPrevious = makeButton("Download previous recovery copy");
      downloadPrevious.addEventListener("click", () => downloadText(this.previousRecoveryRaw!));
      const replace = makeButton("Replace recovery copy & continue", "button danger-button");
      replace.addEventListener("click", () => this.replaceRecoveryAndContinue());
      actions.append(downloadPrevious, replace);
      notice.append(actions);
      stack.append(notice);
    }

    if (this.message && this.mode === "ready" && this.persistence === "saved") {
      const status = document.createElement("p");
      status.className = "status-message";
      status.setAttribute("role", "status");
      status.textContent = this.message;
      stack.append(status);
    } else if (this.message && this.mode !== "ready") {
      const detail = document.createElement("p");
      detail.className = "status-detail";
      detail.setAttribute("role", "status");
      detail.textContent = this.message;
      stack.append(detail);
    }

    return stack.childElementCount > 0 ? stack : null;
  }

  private notice(kind: "warning" | "danger", title: string, copy: string): HTMLElement {
    const notice = document.createElement("section");
    notice.className = `notice ${kind}`;
    notice.setAttribute("role", "alert");
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `⚠ ${title}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = copy;
    content.append(heading, paragraph);
    notice.append(content);
    return notice;
  }

  private renderRow(item: PackingItem, visibleIndex: number): HTMLLIElement {
    const row = document.createElement("li");
    row.className = `packing-item${item.packed ? " is-packed" : ""}`;
    row.dataset.itemName = item.name;

    if (this.editId === item.id) {
      row.classList.add("is-editing");
      const form = document.createElement("form");
      form.className = "rename-form";
      form.noValidate = true;
      const label = document.createElement("label");
      label.textContent = "Rename item";
      label.htmlFor = `rename-${visibleIndex}`;
      const input = document.createElement("input");
      input.id = `rename-${visibleIndex}`;
      input.name = "rename-item";
      input.value = this.editDraft;
      input.disabled = this.isBlocked();
      input.setAttribute("aria-invalid", String(Boolean(this.editError)));
      if (this.editError) input.setAttribute("aria-describedby", `rename-error-${visibleIndex}`);
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "button primary compact";
      save.textContent = "Save";
      const cancel = makeButton("Cancel", "button secondary compact");
      actions.append(save, cancel);
      form.append(label, input, actions);
      if (this.editError) {
        const error = document.createElement("p");
        error.id = `rename-error-${visibleIndex}`;
        error.className = "field-error row-error";
        error.setAttribute("role", "alert");
        error.textContent = this.editError;
        form.append(error);
      }
      const cancelEdit = () => {
        this.editId = null;
        this.editError = "";
        this.render();
        this.rowReferences.find((refs) => refs.itemId === item.id)?.rename.focus();
      };
      cancel.addEventListener("click", cancelEdit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEdit();
        } else if (event.key === "Enter") {
          event.preventDefault();
          form.requestSubmit();
        }
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const valid = validateName(input.value);
        if (!valid.ok) {
          this.editDraft = input.value;
          this.editError = valid.message;
          this.render();
          const nextInput = this.deps.root.querySelector<HTMLInputElement>("input[name=rename-item]");
          nextInput?.focus();
          return;
        }
        const next = renameItem(this.items, item.id, valid.name);
        this.editId = null;
        this.editError = "";
        this.commit(next, { itemId: item.id, control: "rename", index: visibleIndex });
      });
      row.append(form);
      queueMicrotask(() => input.focus());
      return row;
    }

    const packedLabel = document.createElement("label");
    packedLabel.className = "packed-control";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.packed;
    checkbox.disabled = this.isBlocked();
    checkbox.setAttribute("aria-label", `Mark ${item.name} as ${item.packed ? "not packed" : "packed"}`);
    const checkmark = document.createElement("span");
    checkmark.className = "custom-check";
    checkmark.setAttribute("aria-hidden", "true");
    const stateText = document.createElement("span");
    stateText.className = "state-text";
    stateText.textContent = item.packed ? "Packed" : "To pack";
    packedLabel.append(checkbox, checkmark, stateText);

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const rename = makeButton("Rename", "text-button");
    rename.disabled = this.isBlocked();
    rename.setAttribute("aria-label", `Rename ${item.name}`);
    const remove = makeButton("Delete", "text-button delete-button");
    remove.disabled = this.isBlocked();
    remove.setAttribute("aria-label", `Delete ${item.name}`);
    actions.append(rename, remove);
    row.append(packedLabel, name, actions);

    checkbox.addEventListener("change", () => {
      const focus: FocusTarget = { itemId: item.id, control: "packed", index: visibleIndex };
      this.commit(setPacked(this.items, item.id, checkbox.checked), focus);
    });
    rename.addEventListener("click", () => {
      this.editId = item.id;
      this.editDraft = item.name;
      this.editError = "";
      this.render();
    });
    remove.addEventListener("click", () => {
      this.commit(deleteItem(this.items, item.id), { itemId: item.id, control: "delete", index: visibleIndex });
    });

    this.rowReferences.push({ itemId: item.id, checkbox, rename, delete: remove });
    return row;
  }
}
