import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Only the Next routing boundary is replaced. All ordering/payment components,
// receipt polling, hooks, storage and WhatsApp helpers are production imports.
export default defineConfig({
  root: local("./app"),
  envDir: local("./app"), // Never read the application's .env files.
  resolve: {
    alias: {
      "@": local("../../src"),
      "next/navigation": local("./app/navigation.ts"),
      "next/link": local("./app/link.tsx"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4179,
    strictPort: true,
    fs: { allow: [local("../..")] },
  },
});
