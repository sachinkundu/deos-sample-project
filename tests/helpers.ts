import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { handleRequest, type TestGates, type WorkerEnv } from "../src/worker";

export const ids = {
  greeting: "11111111-1111-4111-8111-111111111111",
  signoff: "22222222-2222-4222-8222-222222222222",
  third: "33333333-3333-4333-8333-333333333333",
};

export interface StoreCalls {
  d1: number;
  head: number;
  get: number;
  put: number;
  list: number;
  delete: number;
}

export interface Faults {
  failPut?: boolean;
  failGet?: boolean;
  failHead?: boolean;
  failDelete?: boolean;
  failListAt?: Set<number>;
}

export interface Harness {
  env: WorkerEnv;
  db: D1Database;
  bucket: R2Bucket;
  calls: StoreCalls;
  faults: Faults;
  assetRequests: Request[];
  request(path: string, init?: RequestInit): Promise<Response>;
  json(response: Response): Promise<any>;
  dispose(): Promise<void>;
}

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function trackD1(db: D1Database, calls: StoreCalls): D1Database {
  return new Proxy(db, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (
          property === "prepare" ||
          property === "batch" ||
          property === "exec"
        )
          calls.d1 += 1;
        return value.apply(target, args);
      };
    },
  }) as D1Database;
}

function trackR2(
  bucket: R2Bucket,
  calls: StoreCalls,
  faults: Faults,
): R2Bucket {
  return new Proxy(bucket, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        if (property === "head") {
          calls.head += 1;
          if (faults.failHead) throw new Error("injected head failure");
        }
        if (property === "get") {
          calls.get += 1;
          if (faults.failGet) throw new Error("injected get failure");
        }
        if (property === "put") {
          calls.put += 1;
          if (faults.failPut) throw new Error("injected put failure");
        }
        if (property === "list") {
          calls.list += 1;
          if (faults.failListAt?.has(calls.list))
            throw new Error("injected list failure");
        }
        if (property === "delete") {
          calls.delete += 1;
          if (faults.failDelete) throw new Error("injected delete failure");
        }
        return value.apply(target, args);
      };
    },
  }) as R2Bucket;
}

export async function createHarness(
  options: { faults?: Faults; gates?: TestGates } = {},
): Promise<Harness> {
  const miniflare = new Miniflare({
    compatibilityDate: "2025-06-01",
    modules: true,
    script: "export default { fetch() { return new Response('test'); } }",
    d1Databases: ["DB"],
    r2Buckets: ["BODIES"],
  });
  const bindings = await miniflare.getBindings<{
    DB: D1Database;
    BODIES: R2Bucket;
  }>();
  const migration = await readFile("migrations/0001_snippet_shelf.sql", "utf8");
  for (const statement of migration
    .split("-- migrate:split")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await bindings.DB.prepare(statement).run();
  }

  const calls: StoreCalls = {
    d1: 0,
    head: 0,
    get: 0,
    put: 0,
    list: 0,
    delete: 0,
  };
  const faults = options.faults ?? {};
  const assetRequests: Request[] = [];
  const env: WorkerEnv = {
    DB: trackD1(bindings.DB, calls),
    BODIES: trackR2(bindings.BODIES, calls, faults),
    ASSETS: {
      async fetch(input: RequestInfo | URL, init?: RequestInit) {
        const request = new Request(input, init);
        assetRequests.push(request);
        return new Response("asset:" + new URL(request.url).pathname, {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      },
      connect() {
        throw new Error("not implemented");
      },
    },
    TEST_GATES: options.gates,
  };

  return {
    env,
    db: bindings.DB,
    bucket: bindings.BODIES,
    calls,
    faults,
    assetRequests,
    request(path, init) {
      return handleRequest(
        new Request(`https://snippet.test${path}`, init),
        env,
      );
    },
    async json(response) {
      return response.json();
    },
    dispose() {
      return miniflare.dispose();
    },
  };
}

export function saveInit(
  id: string,
  title = "Greeting",
  text = "Hello, team!",
): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, title, text }),
  };
}

export async function save(
  harness: Harness,
  id: string,
  title = "Greeting",
  text = "Hello, team!",
) {
  return harness.request("/api/snippets", saveInit(id, title, text));
}
