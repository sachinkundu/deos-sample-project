// @vitest-environment happy-dom

import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = await readFile("src/web/index.html", "utf8");

interface Item {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  deletePending: boolean;
}

class BrowserBackend {
  items: Item[] = [];
  posts: any[] = [];
  saveFailure: { code: string; message: string } | null = null;
  deleteMode: "normal" | "recovery" | "lost-204" = "normal";
  listFailure = false;
  pendingReads = new Map<string, (response: Response) => void>();

  async fetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      "https://snippet.test",
    );
    const method =
      init.method ?? (input instanceof Request ? input.method : "GET");
    if (url.pathname === "/api/snippets" && method === "GET") {
      if (this.listFailure)
        return this.error(
          500,
          "LIST_FAILED",
          "Snippets could not be loaded. Try again.",
        );
      return Response.json({
        snippets: this.items.map(({ text: _text, ...item }) => item),
      });
    }
    if (url.pathname === "/api/snippets" && method === "POST") {
      const body = JSON.parse(String(init.body));
      this.posts.push(body);
      if (this.saveFailure)
        return this.error(409, this.saveFailure.code, this.saveFailure.message);
      const item = {
        ...body,
        createdAt: "2026-09-17T12:00:00.000Z",
        deletePending: false,
      };
      this.items = [
        item,
        ...this.items.filter((entry) => entry.id !== body.id),
      ];
      const { text: _text, ...metadata } = item;
      return Response.json({ snippet: metadata }, { status: 201 });
    }
    const match = url.pathname.match(/^\/api\/snippets\/([^/]+)$/);
    if (match && method === "GET") {
      const id = match[1]!;
      if (this.pendingReads.has(id)) {
        return new Promise((resolve) => this.pendingReads.set(id, resolve));
      }
      const item = this.items.find(
        (entry) => entry.id === id && !entry.deletePending,
      );
      return item
        ? Response.json(item)
        : this.error(404, "NOT_FOUND", "This snippet no longer exists.");
    }
    if (match && method === "DELETE") {
      const id = match[1]!;
      if (this.deleteMode === "recovery") {
        const item = this.items.find((entry) => entry.id === id);
        if (item?.deletePending) {
          this.items = this.items.filter((entry) => entry.id !== id);
          this.deleteMode = "normal";
          return new Response(null, { status: 204 });
        }
        if (item) item.deletePending = true;
        return this.error(
          500,
          "DELETE_FAILED",
          "The snippet was not deleted. Try again.",
        );
      }
      this.items = this.items.filter((entry) => entry.id !== id);
      if (this.deleteMode === "lost-204") {
        this.deleteMode = "normal";
        throw new TypeError("injected lost 204 response");
      }
      return new Response(null, { status: 204 });
    }
    return this.error(404, "NOT_FOUND", "Not found");
  }

  resolveRead(id: string, item: Item) {
    this.pendingReads.get(id)?.(Response.json(item));
    this.pendingReads.delete(id);
  }

  error(status: number, code: string, message: string) {
    return Response.json({ error: { code, message } }, { status });
  }
}

async function mount(backend: BrowserBackend) {
  document.open();
  document.write(
    html
      .replace(/<script[^>]*src="\/app\.js"[^>]*><\/script>/, "")
      .replace(/<link[^>]*href="\/styles\.css"[^>]*>/, ""),
  );
  document.close();
  vi.stubGlobal("fetch", vi.fn(backend.fetch.bind(backend)));
  vi.resetModules();
  // @ts-expect-error The production browser module intentionally has no exported type surface.
  await import("../src/web/app.js");
  await vi.waitFor(() =>
    expect(
      document.querySelector("#snippet-list")?.getAttribute("aria-busy"),
    ).toBe("false"),
  );
}

function fill(selector: string, value: string) {
  const field = document.querySelector(selector) as
    HTMLInputElement | HTMLTextAreaElement;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function submit(title: string, text: string) {
  fill("#title", title);
  fill("#text", text);
  document
    .querySelector("#snippet-form")!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function waitForStatus(kind: string) {
  await vi.waitFor(() =>
    expect(document.querySelector("#status")?.getAttribute("data-status")).toBe(
      kind,
    ),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("one-screen browser state", () => {
  it("saves two snippets, reads exact text, renders markup literally, and deletes only one", async () => {
    const backend = new BrowserBackend();
    await mount(backend);
    submit("Greeting", "Hello, team!");
    await waitForStatus("success");
    submit("Markup sample", "<b>Hello</b>");
    await waitForStatus("success");
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".snippet-item")).toHaveLength(2),
    );

    (
      document.querySelector(
        '[data-title="Markup sample"] .snippet-title',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector("#reader-text")?.textContent).toBe(
        "<b>Hello</b>",
      ),
    );
    expect(document.querySelector("#reader-text b")).toBeNull();

    (
      document.querySelector(
        '[data-title="Greeting"] .snippet-title',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector("#reader-text")?.textContent).toBe(
        "Hello, team!",
      ),
    );
    (
      document.querySelector(
        '[data-title="Markup sample"] .delete-button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-title="Markup sample"]')).toBeNull(),
    );
    expect(document.querySelector('[data-title="Greeting"]')).not.toBeNull();
  });

  it("shows field-specific blank messages without calling save", async () => {
    const backend = new BrowserBackend();
    await mount(backend);
    submit("", "Hello");
    await waitForStatus("error");
    expect(document.querySelector("#status-text")?.textContent).toContain(
      "title is needed",
    );
    submit("Empty note", "   ");
    await waitForStatus("error");
    expect(document.querySelector("#status-text")?.textContent).toContain(
      "Text is needed",
    );
    expect(backend.posts).toHaveLength(0);
  });

  it("keeps an immutable failed save tuple and starts again with a new ID without clearing fields", async () => {
    const backend = new BrowserBackend();
    backend.saveFailure = {
      code: "SAVE_IN_PROGRESS",
      message:
        "This save is not finished and may still finish. Check save or start a new save.",
    };
    await mount(backend);
    submit("Pending", "Keep these words");
    await waitForStatus("error");
    const firstId = backend.posts[0].id;
    (document.querySelector("#check-save") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(backend.posts).toHaveLength(2));
    await waitForStatus("error");
    expect(backend.posts[1].id).toBe(firstId);

    (document.querySelector("#start-new-save") as HTMLButtonElement).click();
    expect((document.querySelector("#title") as HTMLInputElement).value).toBe(
      "Pending",
    );
    expect((document.querySelector("#text") as HTMLTextAreaElement).value).toBe(
      "Keep these words",
    );
    expect(document.querySelector("#status-text")?.textContent).toContain(
      "old attempt was not canceled",
    );
    backend.saveFailure = null;
    document
      .querySelector("#snippet-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitForStatus("success");
    expect(backend.posts[2].id).not.toBe(firstId);
  });

  it("suppresses a stale read and reconciles incomplete and lost-response deletes", async () => {
    const backend = new BrowserBackend();
    backend.items = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Alpha",
        text: "First body",
        createdAt: "2026-09-17T12:00:00.000Z",
        deletePending: false,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Beta",
        text: "Second body",
        createdAt: "2026-09-17T11:00:00.000Z",
        deletePending: false,
      },
    ];
    await mount(backend);

    backend.pendingReads.set(backend.items[0]!.id, () => undefined);
    (
      document.querySelector(
        '[data-title="Alpha"] .snippet-title',
      ) as HTMLButtonElement
    ).click();
    (
      document.querySelector(
        '[data-title="Beta"] .snippet-title',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector("#reader-text")?.textContent).toBe(
        "Second body",
      ),
    );
    backend.resolveRead(
      "11111111-1111-4111-8111-111111111111",
      backend.items[0]!,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector("#reader-text")?.textContent).toBe(
      "Second body",
    );

    backend.deleteMode = "recovery";
    (
      document.querySelector(
        '[data-title="Beta"] .delete-button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-title="Beta"] .delete-button')
          ?.textContent,
      ).toBe("Retry delete"),
    );
    expect(document.querySelector("#status")?.getAttribute("data-status")).toBe(
      "error",
    );
    (
      document.querySelector(
        '[data-title="Beta"] .delete-button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-title="Beta"]')).toBeNull(),
    );

    backend.items.push({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Gamma",
      text: "Third",
      createdAt: "2026-09-17T10:00:00.000Z",
      deletePending: false,
    });
    document.querySelector<HTMLButtonElement>("#refresh-list")!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-title="Gamma"]')).not.toBeNull(),
    );
    backend.deleteMode = "lost-204";
    (
      document.querySelector(
        '[data-title="Gamma"] .delete-button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-title="Gamma"]')).toBeNull(),
    );
    expect(document.querySelector('[data-title="Alpha"]')).not.toBeNull();
    expect(document.querySelector("#status-text")?.textContent).toContain(
      "already absent",
    );
  });
});
