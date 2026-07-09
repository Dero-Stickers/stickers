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

// PWA auto-aggiornamento (SOLO in produzione). Obiettivo: ogni deploy deve
// raggiungere TUTTI gli utenti da solo, senza svuotare cache né reinstallare.
//
// vite-plugin-pwa registra già il service worker (injectRegister:"auto") con
// registerType:"autoUpdate" + skipWaiting (vedi vite.config.ts). Ma il browser
// controlla se c'è un SW nuovo solo al primo caricamento della pagina: su iOS,
// dove l'app installata resta "sospesa" in background per giorni senza mai
// ricaricare, un aggiornamento potrebbe non essere mai notato. Qui aggiungiamo
// due trigger che colmano quel buco:
//   1) update() ogni ora mentre l'app è aperta;
//   2) update() ogni volta che l'app torna in primo piano (visibilitychange) —
//      è il caso tipico iOS: riapri l'app dalla Home dopo giorni.
// Quando il nuovo SW è pronto, skipWaiting lo attiva subito e la pagina prende
// il codice aggiornato al giro successivo. Nessuna azione richiesta all'utente.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Registrazione GESTITA del service worker (prima la iniettava vite-plugin-pwa
  // con injectRegister:"auto", senza catch → se falliva usciva un
  // "unhandledrejection" che l'app segnalava come crash "Rejected"). La
  // registrazione può legittimamente fallire e NON è un guasto dell'app:
  //  - browser in incognito / SW disabilitati;
  //  - in-app browser (Facebook/Instagram su iOS) che limita i SW;
  //  - l'utente lascia la pagina (es. /login) prima che finisca.
  // In tutti questi casi l'app funziona lo stesso, solo senza offline/precache.
  // Usiamo l'API nativa (nessuna dipendenza extra): il SW è "sw.js" alla root,
  // generato da vite-plugin-pwa. Il catch assorbe il fallimento: niente crash,
  // niente report inutile.
  const registerServiceWorker = () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => {
      /* registrazione SW fallita: innocua (vedi sopra), non è un errore app */
    });
  };
  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }

  const checkForUpdate = () => {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        /* offline o SW non ancora pronto: si ritenta al trigger successivo */
      });
  };
  // Controllo periodico ogni ora mentre l'app resta aperta.
  const HOUR = 60 * 60 * 1000;
  setInterval(checkForUpdate, HOUR);
  // Controllo al ritorno in primo piano (riapertura app installata su iOS/Android).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
