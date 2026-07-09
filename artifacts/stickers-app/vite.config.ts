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
      // La registrazione del service worker la facciamo NOI in main.tsx, con un
      // catch esplicito, via l'API nativa navigator.serviceWorker.register().
      // Con injectRegister:"auto" il plugin iniettava uno script inline senza
      // gestione dell'errore: se la registrazione falliva (browser in incognito,
      // in-app browser iOS, utente che lascia la pagina prima del load) la promise
      // rifiutava senza catch → "unhandledrejection" catturato come crash generico
      // "Rejected". Con null nessuno script viene iniettato: registriamo a mano.
      // Il SW buildato resta "sw.js" alla root (default del plugin).
      injectRegister: null,
      // Riusa il manifest statico esistente in public/manifest.webmanifest
      // (già linkato in index.html). NON generarne un secondo.
      manifest: false,
      workbox: {
        // Precache degli asset statici buildati. index.html serve da app-shell.
        globPatterns: ["**/*.{js,css,html,webp,png,svg,ico,woff2}"],
        navigateFallback: "index.html",
        // Le richieste alle API NON devono mai cadere sull'app-shell offline.
        // /admin* NEMMENO: l'app-shell precacheato è la versione UTENTE (apple-touch
        // + manifest User). Se il SW servisse quello per /admin, iOS leggerebbe
        // l'icona User all'"Aggiungi a Home". Escludendo /admin, la navigazione va
        // alla rete, dove il server riscrive l'HTML con manifest + icona Admin.
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting: il nuovo service worker si attiva SUBITO, senza aspettare
        // che l'utente chiuda tutte le schede. Senza questo, su iOS (dove l'app
        // resta sospesa in background per giorni) l'aggiornamento non arriva mai:
        // l'utente resterebbe bloccato su una versione vecchia in cache. Insieme a
        // registerType:"autoUpdate", garantisce che ogni deploy raggiunga tutti gli
        // utenti da solo, senza svuotare cache né reinstallare. Sicuro perché non
        // c'è stato client che dipenda dalla versione esatta del SW (nessuna
        // migrazione di cache incompatibile).
        skipWaiting: true,
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
    // Offuscamento del bundle client (il JS servito al browser è sempre
    // ispezionabile: qui lo rendiamo il più illeggibile/scomodo possibile a costo
    // zero). terser è più aggressivo di esbuild: rinomina TUTTE le variabili/funzioni
    // locali, elimina spazi/commenti, rimuove i console.* e i debugger in produzione.
    // NIENTE sourcemap (non le generiamo): eviterebbero tutto ricostruendo il sorgente.
    minify: "terser",
    sourcemap: false,
    // Cast: i tipi di terser non sono sempre risolti dai .d.ts di Vite, ma questi
    // campi sono validi a runtime (compress/mangle/format standard di terser).
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: { toplevel: true },
      format: { comments: false },
    } as Record<string, unknown>,
    rollupOptions: {
      output: {
        // Split dei "vendor" stabili in chunk separati: a ogni deploy il service
        // worker ri-scarica solo il codice app (cambia spesso), mentre React/
        // Radix/Query restano in cache (cambiano di rado) → update più leggeri.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/](react|react-dom|scheduler)@/.test(id)) return "react";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          return "vendor";
        },
      },
    },
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
