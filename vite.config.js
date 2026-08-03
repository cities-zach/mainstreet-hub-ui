import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  define:
    mode === "test"
      ? { "import.meta.env.VITE_API_URL": JSON.stringify("/api") }
      : undefined,
  plugins: [react()],
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
