import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Plain Vite SPA: `vite build` emits a static bundle into dist/.
// No SSR, no Nitro, no Cloudflare adapter.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsConfigPaths()],
  server: {
    host: true,
    port: 8080,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
