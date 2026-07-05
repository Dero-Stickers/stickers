import { createRoot } from "react-dom/client";
// Font Inter self-hosted (nessuna connessione a Google: privacy by design, GDPR).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/900.css";
import App from "./App";
import "./index.css";

// DEV-only kill-switch della PWA: in sviluppo NON deve mai esserci un service
// worker attivo. Se il browser ne ha uno registrato da una visita precedente
// alla PRODUZIONE (intercetta anche localhost sullo stesso host), servirebbe
// codice vecchio dalla cache → si vedono versioni obsolete anche dopo hard refresh.
// Qui, in dev, disregistriamo ogni SW e svuotiamo tutte le cache all'avvio.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
