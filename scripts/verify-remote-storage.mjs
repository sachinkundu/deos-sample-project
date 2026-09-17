import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";

const requestPaths = process.argv.slice(2);

if (requestPaths.length === 0) {
  throw new Error("Pass one or more saved deos-implementation request files.");
}

function lastJsonLine(output) {
  const lines = output.trim().split("\n").reverse();
  for (const line of lines) {
    try {
      return JSON.parse(line);
    } catch {
      // Keep looking for the completed operation record.
    }
  }
  throw new Error("The trusted runtime returned no JSON operation record.");
}

for (const requestPath of requestPaths) {
  const request = JSON.parse(readFileSync(requestPath, "utf8"));
  const run = spawnSync("deos-implementation", ["--wait", requestPath], {
    encoding: "utf8",
  });

  if (run.status !== 0) {
    process.stderr.write(run.stdout);
    process.stderr.write(run.stderr);
    process.exit(run.status ?? 1);
  }

  const operation = lastJsonLine(run.stdout);
  const providerResult = operation.result?.result ?? operation.result;
  const printable = { ...providerResult };
  if (typeof printable.contentBase64 === "string") {
    printable.contentUtf8 = Buffer.from(
      printable.contentBase64,
      "base64",
    ).toString("utf8");
  }

  console.log(`## ${basename(requestPath)}`);
  console.log(
    JSON.stringify(
      {
        request: {
          operation: request.operation,
          sql: request.sql,
          id: request.id,
          method: request.method,
          path: request.path,
          key: request.key,
        },
        environment: operation.result?.environment,
        result: printable,
      },
      null,
      2,
    ),
  );
}
