import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Los formateadores dependen de la configuración pública: se fija para que
    // los resultados no cambien según el .env local.
    env: {
      NEXT_PUBLIC_CURRENCY: "USD",
      NEXT_PUBLIC_LOCALE: "es-ES",
      NEXT_PUBLIC_TIME_ZONE: "UTC",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/supabase/**", "src/lib/api-client.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
