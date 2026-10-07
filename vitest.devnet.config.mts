import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Tests contre le vrai devnet (lecture/simulation uniquement) : npm run test:devnet
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: { include: ["e2e/**/*.devnet.ts"], env: loadEnv("development", process.cwd(), ""), testTimeout: 60_000 },
});
