import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function enforceEntryBundleBudget(maxBytes = 500 * 1024) {
  return {
    name: "enforce-entry-bundle-budget",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.isEntry) continue;
        const byteSize = Buffer.byteLength(output.code, "utf8");
        if (byteSize > maxBytes) {
          this.error(
            `Entry bundle ${output.fileName} is ${(byteSize / 1024).toFixed(1)} KiB; ` +
            `the performance budget is ${(maxBytes / 1024).toFixed(0)} KiB.`
          );
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  define:
    mode === "test"
      ? { "import.meta.env.VITE_API_URL": JSON.stringify("/api") }
      : undefined,
  plugins: [react(), enforceEntryBundleBudget()],
  build: {
    // Mapbox is a deliberately route-gated engine. The custom plugin above
    // retains a strict budget for JavaScript that every visitor must download.
    chunkSizeWarningLimit: 1700,
  },
  resolve: {
    alias: {
      "@": path.resolve(projectDirectory, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        // Keep the development proxy on IPv4 because the API binds there in
        // local and Playwright runs; newer Node versions may resolve localhost
        // to ::1 first and surface the proxy refusal as a browser fetch error.
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
}));
