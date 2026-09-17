const limits = { title: 200, text: 65_536 };
const bytes = (value) => new TextEncoder().encode(value).byteLength;

const elements = {
  form: document.querySelector("#snippet-form"),
  title: document.querySelector("#title"),
  text: document.querySelector("#text"),
  titleCount: document.querySelector("#title-count"),
  textCount: document.querySelector("#text-count"),
  saveButton: document.querySelector("#save-button"),
  recovery: document.querySelector("#save-recovery"),
  recoveryNote: document.querySelector("#save-recovery-note"),
  checkSave: document.querySelector("#check-save"),
  startNewSave: document.querySelector("#start-new-save"),
  status: document.querySelector("#status"),
  statusText: document.querySelector("#status-text"),
  list: document.querySelector("#snippet-list"),
  count: document.querySelector("#snippet-count"),
  refresh: document.querySelector("#refresh-list"),
  reader: document.querySelector("#reader"),
  readerEmpty: document.querySelector("#reader-empty"),
  readerContent: document.querySelector("#reader-content"),
  readerTitle: document.querySelector("#reader-title"),
  readerText: document.querySelector("#reader-text"),
};

const state = {
  items: [],
  loadingList: true,
  selectedId: null,
  reader: null,
  readToken: 0,
  pendingSave: null,
  saving: false,
  inFlightDeletes: new Set(),
  checkingDeletes: new Set(),
  unknownDeletes: new Set(),
  missingReads: new Set(),
};

class ApiFailure extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

function setStatus(message, kind = "idle") {
  elements.status.dataset.status = kind;
  elements.statusText.textContent = message;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (response.status === 204) return { response, data: null };
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiFailure(
      response.status,
      "MALFORMED_RESPONSE",
      "The server returned an unreadable response.",
    );
  }
  if (!response.ok) {
    throw new ApiFailure(
      response.status,
      data?.error?.code ?? "REQUEST_FAILED",
      data?.error?.message ?? "The request failed.",
      data?.error?.field,
    );
  }
  return { response, data };
}

function updateCounters() {
  elements.titleCount.textContent = `${bytes(elements.title.value)} / 200 bytes`;
  elements.textCount.textContent = `${bytes(elements.text.value).toLocaleString()} / 65,536 bytes`;
}

function updateSaveControls() {
  elements.saveButton.disabled = state.saving || state.pendingSave !== null;
  elements.checkSave.disabled = state.saving;
  elements.startNewSave.disabled = state.saving;
  elements.recovery.hidden = state.pendingSave === null;
}

function clearReader() {
  state.readToken += 1;
  state.selectedId = null;
  state.reader = null;
  renderReader();
}

function renderReader() {
  const selected = state.items.find((item) => item.id === state.selectedId);
  if (!selected || selected.deletePending || !state.reader) {
    elements.reader.dataset.readerState =
      selected && !selected.deletePending ? "loading" : "empty";
    elements.readerEmpty.hidden = false;
    elements.readerContent.hidden = true;
    elements.readerEmpty.querySelector("p").textContent =
      selected && !selected.deletePending
        ? "Opening plain text"
        : "Choose a title from your shelf.";
    elements.readerEmpty.querySelector("span").textContent =
      selected && !selected.deletePending
        ? "Reading from cloud storage."
        : "The full text will open here.";
    elements.readerTitle.textContent = "";
    elements.readerText.textContent = "";
    return;
  }
  elements.reader.dataset.readerState = "ready";
  elements.readerEmpty.hidden = true;
  elements.readerContent.hidden = false;
  elements.readerTitle.textContent = state.reader.title;
  elements.readerText.textContent = state.reader.text;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Saved on this shelf";
  return `Saved ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function makeMessageCard(title, detail, className) {
  const card = document.createElement("div");
  card.className = className;
  const strong = document.createElement("strong");
  strong.textContent = title;
  const text = document.createElement("span");
  text.textContent = detail;
  card.append(strong, text);
  return card;
}

function renderList() {
  elements.list.replaceChildren();
  elements.list.setAttribute("aria-busy", String(state.loadingList));
  elements.count.textContent = state.loadingList
    ? "Loading saved titles…"
    : `${state.items.length} ${state.items.length === 1 ? "snippet" : "snippets"}`;

  if (state.loadingList) {
    elements.list.append(
      makeMessageCard(
        "Opening your shelf",
        "Loading the saved index from D1.",
        "loading-card",
      ),
    );
    return;
  }
  if (state.items.length === 0) {
    elements.list.append(
      makeMessageCard(
        "Your shelf is empty",
        "Save a snippet and its title will appear here.",
        "empty-card",
      ),
    );
    return;
  }

  for (const item of state.items) {
    const article = document.createElement("article");
    article.className = "snippet-item";
    article.dataset.id = item.id;
    article.dataset.title = item.title;
    if (item.id === state.selectedId) article.classList.add("is-selected");
    if (item.deletePending) article.classList.add("is-pending-delete");

    const main = document.createElement("div");
    main.className = "snippet-main";
    const title = document.createElement("button");
    title.type = "button";
    title.className = "snippet-title";
    title.dataset.selectId = item.id;
    title.textContent = item.title;
    title.disabled = item.deletePending;
    title.addEventListener("click", () => selectSnippet(item.id));

    const action = document.createElement("button");
    action.type = "button";
    action.className = "delete-button";
    action.dataset.deleteId = item.id;
    action.dataset.deleteTitle = item.title;
    const inFlight = state.inFlightDeletes.has(item.id);
    const checking = state.checkingDeletes.has(item.id);
    const unknown = state.unknownDeletes.has(item.id);
    if (inFlight) {
      action.textContent = "Deleting…";
      action.disabled = true;
    } else if (checking) {
      action.textContent = "Checking…";
      action.disabled = true;
    } else if (unknown) {
      action.textContent = "Retry status";
      action.addEventListener("click", () =>
        reconcileDelete(item.id, item.title),
      );
    } else if (item.deletePending) {
      action.textContent = "Retry delete";
      action.addEventListener("click", () =>
        deleteSnippet(item.id, item.title),
      );
    } else {
      action.textContent = "Delete";
      action.addEventListener("click", () =>
        deleteSnippet(item.id, item.title),
      );
    }
    main.append(title, action);

    const meta = document.createElement("p");
    meta.className = `item-meta${item.deletePending ? " pending" : ""}`;
    meta.textContent = item.deletePending
      ? "Deletion incomplete · retry available"
      : formatDate(item.createdAt);
    article.append(main, meta);
    elements.list.append(article);
  }
}

async function fetchList() {
  const { data } = await requestJson("/api/snippets", {
    headers: { accept: "application/json" },
  });
  if (!Array.isArray(data?.snippets))
    throw new ApiFailure(
      500,
      "MALFORMED_RESPONSE",
      "The snippet list was unreadable.",
    );
  return data.snippets;
}

function applyList(items) {
  state.items = items;
  state.loadingList = false;
  for (const id of [...state.unknownDeletes]) {
    if (!items.some((item) => item.id === id)) state.unknownDeletes.delete(id);
  }
  const selected = items.find((item) => item.id === state.selectedId);
  if (!selected || selected.deletePending) clearReader();
  renderList();
  renderReader();
}

async function loadList({ keepMessage = false } = {}) {
  if (state.items.length === 0) {
    state.loadingList = true;
    renderList();
  }
  try {
    applyList(await fetchList());
    if (!keepMessage) setStatus("Your shelf is up to date.", "idle");
    return true;
  } catch {
    state.loadingList = false;
    renderList();
    if (!keepMessage)
      setStatus("Snippets could not be loaded. Try again.", "error");
    return false;
  }
}

async function selectSnippet(id, { keepMessage = false } = {}) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item || item.deletePending) return;
  state.selectedId = id;
  state.reader = null;
  const token = ++state.readToken;
  renderList();
  renderReader();
  try {
    const { data } = await requestJson(
      `/api/snippets/${encodeURIComponent(id)}`,
      { headers: { accept: "application/json" } },
    );
    if (token !== state.readToken || state.selectedId !== id) return;
    state.reader = { title: data.title, text: data.text };
    state.missingReads.delete(id);
    renderReader();
    if (!keepMessage)
      setStatus(`Opened “${item.title}” from cloud storage.`, "idle");
  } catch (error) {
    if (token !== state.readToken || state.selectedId !== id) return;
    state.reader = null;
    if (error instanceof ApiFailure && error.code === "NOT_FOUND")
      state.missingReads.add(id);
    renderReader();
    setStatus(
      error instanceof ApiFailure && error.code === "NOT_FOUND"
        ? `“${item.title}” no longer exists. The reading area was cleared.`
        : `“${item.title}” could not be read. The reading area was cleared.`,
      "error",
    );
  }
}

function clientInput() {
  const title = elements.title.value;
  const text = elements.text.value;
  if (title.trim().length === 0) {
    setStatus("A title is needed before this snippet can be saved.", "error");
    elements.title.focus();
    return null;
  }
  if (bytes(title) > limits.title) {
    setStatus("The title must be 200 bytes or fewer.", "error");
    elements.title.focus();
    return null;
  }
  if (text.trim().length === 0) {
    setStatus("Text is needed before this snippet can be saved.", "error");
    elements.text.focus();
    return null;
  }
  if (bytes(text) > limits.text) {
    setStatus("The text must be 65,536 bytes or fewer.", "error");
    elements.text.focus();
    return null;
  }
  return { title, text };
}

function saveRecoveryMessage(error) {
  switch (error.code) {
    case "SAVE_IN_PROGRESS":
      return "This save is not finished and may still finish. Check save or start a new save.";
    case "IDEMPOTENCY_CONFLICT":
      return "This save attempt cannot continue. Start a new save.";
    case "SHELF_LIMIT_REACHED":
      return "This temporary shelf has no reserved capacity left. Pending saves may be using it; delete saved snippets or recreate the temporary environment.";
    case "ACTIVITY_LIMIT_REACHED":
      return "This temporary shelf has reached its activity limit.";
    default:
      return "The snippet was not saved. Its status is unknown; check this save or start a new one.";
  }
}

async function runSave(tuple) {
  state.saving = true;
  updateSaveControls();
  setStatus("Saving the title to D1 and the plain text to R2…", "info");
  try {
    const { data } = await requestJson("/api/snippets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(tuple),
    });
    state.pendingSave = null;
    state.saving = false;
    elements.form.reset();
    updateCounters();
    const saved = data.snippet;
    state.items = [
      saved,
      ...state.items.filter((item) => item.id !== saved.id),
    ];
    state.selectedId = saved.id;
    state.reader = null;
    updateSaveControls();
    renderList();
    renderReader();
    setStatus(`“${saved.title}” is saved on your shelf.`, "success");
    await loadList({ keepMessage: true });
    if (state.items.some((item) => item.id === saved.id))
      await selectSnippet(saved.id, { keepMessage: true });
  } catch (error) {
    state.saving = false;
    const failure =
      error instanceof ApiFailure
        ? error
        : new ApiFailure(0, "NETWORK_ERROR", "The save response was lost.");
    elements.recoveryNote.textContent = saveRecoveryMessage(failure);
    setStatus(saveRecoveryMessage(failure), "error");
    updateSaveControls();
  }
}

async function deleteSnippet(id, title) {
  state.inFlightDeletes.add(id);
  state.unknownDeletes.delete(id);
  renderList();
  setStatus(`Deleting “${title}” from D1 and R2…`, "info");
  try {
    const response = await fetch(`/api/snippets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.status !== 204)
      throw new ApiFailure(
        response.status,
        "DELETE_FAILED",
        "The delete was not confirmed.",
      );
    state.inFlightDeletes.delete(id);
    state.items = state.items.filter((item) => item.id !== id);
    if (state.selectedId === id) clearReader();
    renderList();
    const wasAlreadyMissing = state.missingReads.delete(id);
    setStatus(
      wasAlreadyMissing
        ? `“${title}” was already absent. The shelf was refreshed without claiming a new deletion.`
        : `“${title}” was deleted. Other snippets are unchanged.`,
      wasAlreadyMissing ? "info" : "success",
    );
    await loadList({ keepMessage: true });
  } catch {
    state.inFlightDeletes.delete(id);
    await reconcileDelete(id, title);
  }
}

async function reconcileDelete(id, title) {
  state.checkingDeletes.add(id);
  state.unknownDeletes.delete(id);
  renderList();
  setStatus(`Checking the deletion status of “${title}”…`, "info");
  try {
    const items = await fetchList();
    state.checkingDeletes.delete(id);
    state.items = items;
    const item = items.find((candidate) => candidate.id === id);
    if (!item) {
      if (state.selectedId === id) clearReader();
      setStatus(
        `“${title}” is already absent. The shelf was refreshed.`,
        "info",
      );
    } else if (item.deletePending) {
      if (state.selectedId === id) clearReader();
      setStatus(
        `“${title}” was not deleted completely. Retry delete is available.`,
        "error",
      );
    } else {
      setStatus(`“${title}” was not deleted. Try again.`, "error");
    }
    renderList();
    renderReader();
  } catch {
    state.checkingDeletes.delete(id);
    state.unknownDeletes.add(id);
    setStatus(
      `The deletion status of “${title}” could not be loaded. Retry status before deleting again.`,
      "error",
    );
    renderList();
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.saving) return;
  if (state.pendingSave) {
    setStatus(
      "Check the pending save or start a new save before submitting again.",
      "info",
    );
    return;
  }
  const input = clientInput();
  if (!input) return;
  state.pendingSave = Object.freeze({
    id: crypto.randomUUID(),
    title: input.title,
    text: input.text,
  });
  updateSaveControls();
  void runSave(state.pendingSave);
});

elements.checkSave.addEventListener("click", () => {
  if (state.pendingSave && !state.saving) void runSave(state.pendingSave);
});

elements.startNewSave.addEventListener("click", () => {
  if (!state.pendingSave || state.saving) return;
  state.pendingSave = null;
  elements.recoveryNote.textContent = "";
  updateSaveControls();
  setStatus(
    "A new save can be started. The old attempt was not canceled and may still finish.",
    "info",
  );
});

elements.refresh.addEventListener("click", () => void loadList());
elements.title.addEventListener("input", updateCounters);
elements.text.addEventListener("input", updateCounters);

updateCounters();
updateSaveControls();
renderList();
renderReader();
void loadList();
