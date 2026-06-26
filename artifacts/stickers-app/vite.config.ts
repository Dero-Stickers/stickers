import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Riusa il manifest statico esistente in public/manifest.webmanifest
      // (già linkato in index.html). NON generarne un secondo.
      manifest: false,
      workbox: {
        // Precache degli asset statici buildati. index.html serve da app-shell.
        globPatterns: ["**/*.{js,css,html,webp,png,svg,ico,woff2}"],
        navigateFallback: "index.html",
        // Le richieste alle API NON devono mai cadere sull'app-shell offline.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Bundle React+Radix può superare il default di 2 MiB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Nessun runtime caching cross-origin: i font Inter sono self-hosted e
        // rientrano nel precache (globPatterns include woff2). Nessuna regola
        // intercetta /api: il contenuto resta sempre dalla rete.
      },
      devOptions: {
        // Niente service worker durante lo sviluppo (evita cache fastidiose).
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
