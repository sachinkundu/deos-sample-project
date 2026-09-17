import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

await Promise.all([
  rm(new URL("../build", import.meta.url), { recursive: true, force: true }),
  rm(new URL("../dist", import.meta.url), { recursive: true, force: true }),
]);
await Promise.all([
  mkdir(new URL("../build", import.meta.url), { recursive: true }),
  mkdir(new URL("../dist", import.meta.url), { recursive: true }),
]);
await build({
  entryPoints: [new URL("../src/worker.ts", import.meta.url).pathname],
  outfile: new URL("../build/worker.mjs", import.meta.url).pathname,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  minify: false,
});
await cp(
  new URL("../src/web", import.meta.url),
  new URL("../dist", import.meta.url),
  {
    recursive: true,
  },
);
console.log("Built build/worker.mjs and dist static assets");
