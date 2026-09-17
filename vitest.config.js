import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentOptions: { jsdom: { url: "https://expense.test/" } },
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
    clearMocks: true,
  },
});
