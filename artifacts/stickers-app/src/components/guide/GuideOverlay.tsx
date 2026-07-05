// Guida interattiva — MOTORE su driver.js (libreria consolidata dei product
// tour: spotlight + fumetto con FRECCIA classica che punta l'elemento).
//
// driver.js fa SOLO il rendering (velo con buco, fumetto, freccia, posizioni);
// il flusso resta nostro: passi da steps.ts, stato in GuideContext, navigazione
// tra le rotte, avanzamento.
//
// Regole (decise con l'owner) — guida SEMPLICE, DIRETTA, MINIMALE:
//  - Fumetti SOLO informativi: NESSUN pulsante (né avanti/indietro, né salta,
//    né pallini). Si va solo avanti; ESC (desktop) chiude.
//  - "info"   → si avanza toccando OVUNQUE lo schermo.
//  - "action" → si avanza toccando il PULSANTE REALE dell'app indicato dalla
//    freccia (l'azione avviene davvero: la guida naviga con l'utente).
//  - "try"    → prova pratica dell'utente, SIMULATA (colori finti / viste
//    read-only): zero scritture.
//  - "demo"   → dimostrazione automatica: la guida mostra e poi RIPRISTINA.
//  - La guida non modifica MAI il database; a fine guida l'app è com'era.

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./guide-theme.css";
import { useGuide } from "@/lib/guide/GuideContext";
import { GUIDE_STEPS } from "@/lib/guide/steps";

// ── Costanti condivise (un solo punto di verità, niente stringhe duplicate) ──
// Dialog reale aperto (Radix): usato sia dal watcher long-press sia da ESC.
const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
// Classi-demo della SINGOLA cella (prova "3 tocchi") — ordine del ciclo visivo.
const CELL_DEMO_CYCLE = ["sg-cell-posseduta", "sg-cell-doppia", "sg-cell-mancante"] as const;
// Classi-demo dell'INTERA griglia (demo automatica filtri).
const GRID_DEMO_CLASSES = ["sg-demo-posseduta", "sg-demo-doppia", "sg-demo-mancante"] as const;
const GRID_SELECTOR = '[data-guide="guide-sticker-grid"]';

// Corpo del fumetto — MINIMALE: solo la frase + un hint dove serve. Niente
// pulsanti, niente pallini, niente "salta": la guida si fa e basta.
function stepDescription(body: string, kind: string): string {
  const hint =
    kind === "info"
      ? `<p class="sg-hint">Tocca lo schermo per continuare</p>`
      : kind === "try"
        ? `<p class="sg-hint">Provaci ora 👇</p>`
        : "";
  return `<p class="sg-body">${body}</p>${hint}`;
}

export function GuideOverlay() {
  const { active, stepIndex, next, finish } = useGuide();
  const [location, setLocation] = useLocation();
  const drvRef = useRef<Driver | null>(null);

  // Refs letti dall'hook di driver.js (l'istanza è unica, i passi cambiano).
  const stepRef = useRef<(typeof GUIDE_STEPS)[number] | null>(null);
  const nextRef = useRef(next);
  nextRef.current = next;
  stepRef.current = active ? GUIDE_STEPS[stepIndex] : null; // sempre aggiornato

  // ANTI doppio-avanzamento: un solo tocco fisico genera più eventi (pointerdown
  // dell'overlay di driver.js + click del documento). Qualunque strada porti ad
  // avanzare, entro 350ms conta UNA volta sola.
  const lastAdvanceRef = useRef(0);
  const advance = () => {
    const now = Date.now();
    if (now - lastAdvanceRef.current < 350) return;
    lastAdvanceRef.current = now;
    nextRef.current();
  };

  const getDrv = (): Driver => {
    if (!drvRef.current) {
      drvRef.current = driver({
        animate: true,
        overlayOpacity: 0.72,
        stagePadding: 6,
        stageRadius: 12,
        allowClose: false,
        showButtons: [], // NIENTE pulsanti nel fumetto
        popoverClass: "sticker-guide",
        // Tocco sul VELO: nei passi info avanza ("tocca ovunque"); nei passi
        // try avanza SOLO a prova completata (lettura ultimo colore); nei passi
        // azione non fa nulla (si avanza toccando il pulsante vero).
        overlayClickBehavior: () => {
          const k = stepRef.current?.kind;
          if (k === "info" || (k === "try" && tryDoneRef.current)) advance();
        },
      });
    }
    return drvRef.current;
  };

  const step = active ? GUIDE_STEPS[stepIndex] : null;

  // Porta l'utente sulla rotta del passo (i passi su rotta dinamica — album/
  // match aperti dal passo precedente — non forzano la navigazione).
  useEffect(() => {
    if (!step || step.dynamicRoute) return;
    if (step.route && location !== step.route) setLocation(step.route);
  }, [step, location, setLocation]);

  // Evidenzia il passo corrente. Le pagine caricano async → poll (~2s) finché
  // l'elemento appare; un passo "action" senza target si salta da solo (mai
  // bloccare la guida). Senza target → fumetto centrato.
  useEffect(() => {
    if (!active || !step) {
      drvRef.current?.destroy();
      drvRef.current = null;
      return;
    }
    let cancelled = false;
    let tries = 0;
    const show = () => {
      if (cancelled) return;
      const el = step.target
        ? document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`)
        : null;
      if (step.target && !el && tries++ < 40) { setTimeout(show, 50); return; }
      if (step.target && !el) { if (step.kind === "action") next(); return; }
      stepRef.current = step; // letto dall'hook overlayClickBehavior
      getDrv().highlight({
        element: el ?? undefined,
        // Su info/demo l'elemento è SOLO mostrato (nessuna interazione):
        // impossibile toccare l'app per sbaglio durante la guida.
        disableActiveInteraction: step.kind === "info" || step.kind === "demo",
        popover: {
          title: step.title,
          description: stepDescription(step.body, step.kind),
        },
      });
    };
    const t = setTimeout(show, 80); // lascia montare la rotta
    return () => { cancelled = true; clearTimeout(t); };
  }, [active, step, stepIndex, next]);

  // Avanzamento via tocchi NON gestiti dall'overlay di driver.js (che copre il
  // resto): tocco sul FUMETTO nei passi info → avanza; tocco sul TARGET nei
  // Contatore tocchi per i passi "try" (si azzera a ogni passo) + pulizia di
  // eventuali colori-demo rimasti sulle celle (la guida ripristina SEMPRE).
  // `tryDoneRef`: prova a fasi completata → si resta sull'ultimo colore finché
  // l'utente non tocca lo schermo (avanzamento MANUALE, tempo di leggere).
  const tapsRef = useRef(0);
  const tryDoneRef = useRef(false);
  useEffect(() => {
    tapsRef.current = 0;
    tryDoneRef.current = false;
    document
      .querySelectorAll(CELL_DEMO_CYCLE.map((c) => `.${c}`).join(","))
      .forEach((el) => el.classList.remove(...CELL_DEMO_CYCLE));
  }, [stepIndex]);

  useEffect(() => {
    if (!active || !step) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (step.kind === "info") {
        // QUALSIASI tocco avanza (velo, fumetto, area evidenziata): la guardia
        // anti-doppio garantisce un solo avanzamento anche quando l'hook
        // overlay di driver.js scatta sullo stesso tocco. preventDefault →
        // il tocco non arriva mai all'app (nessun dato toccato per sbaglio).
        e.preventDefault(); e.stopPropagation(); advance();
        return;
      }
      if (step.kind === "try" && step.taps) {
        // PROVA PRATICA SIMULATA: il tocco NON arriva all'app (preventDefault →
        // ZERO scritture DB). La cella cambia colore solo VISIVAMENTE
        // (verde → rosso → grigio) e il fumetto spiega OGNI colore (tapPhases).
        e.preventDefault(); e.stopPropagation();
        // Prova completata: si resta sull'ultimo colore finché l'utente non
        // tocca lo schermo → avanzamento MANUALE (tempo di leggere il grigio).
        if (tryDoneRef.current) { advance(); return; }
        const cell = t.closest(`[data-guide="${step.target}"]`) as HTMLElement | null;
        if (!cell) return; // prima della fine contano solo i tocchi sulla figurina
        tapsRef.current += 1;
        const idx = Math.min(tapsRef.current, step.taps) - 1;
        cell.classList.remove(...CELL_DEMO_CYCLE);
        cell.classList.add(CELL_DEMO_CYCLE[idx % CELL_DEMO_CYCLE.length]);
        const last = tapsRef.current >= step.taps;
        const phase = step.tapPhases?.[idx];
        if (phase) {
          if (last) tryDoneRef.current = true; // niente auto-avanzamento
          getDrv().highlight({
            element: cell,
            disableActiveInteraction: false,
            popover: {
              title: step.title,
              description: `<p class="sg-body">${phase.body}</p><p class="sg-hint">${
                last ? "Tocca lo schermo per continuare" : "Provaci ora 👇"
              }</p>`,
            },
          });
        } else if (last) {
          // prova senza fasi (es. ➕ aggiungi album): breve feedback e avanti
          setTimeout(() => { cell.classList.remove(...CELL_DEMO_CYCLE); advance(); }, 700);
        }
        return;
      }
      if (step.kind === "demo") {
        // Dimostrazione automatica in corso: i tocchi non fanno nulla.
        e.preventDefault(); e.stopPropagation();
        return;
      }
      if (step.kind !== "action") return;
      const hit = t.closest(`[data-guide="${step.target}"]`) as HTMLElement | null;
      if (hit) {
        e.preventDefault(); e.stopPropagation();
        const href = hit.getAttribute("href");
        advance();
        if (href) setLocation(href);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, setLocation]);

  // Passi "try" con long-press: quando l'utente APRE il dettaglio (dialog reale)
  // la guida evidenzia IL DIALOG con l'istruzione "chiudi per continuare" (così
  // l'utente sa come proseguire); alla CHIUSURA del dialog si avanza.
  useEffect(() => {
    if (!active || !step || step.kind !== "try" || !step.waitDialogClose) return;
    let seenOpen = false;
    const iv = setInterval(() => {
      const dialog = document.querySelector<HTMLElement>('[data-guide="guide-sticker-dialog"]')
        ?? document.querySelector<HTMLElement>(OPEN_DIALOG_SELECTOR);
      if (dialog) {
        if (!seenOpen) {
          // Sposta lo spotlight+fumetto SUL dialog aperto (il dialog Radix ha uno
          // z-index alto: evidenziandolo, il fumetto-guida resta visibile sopra).
          getDrv().highlight({
            element: dialog,
            disableActiveInteraction: false, // l'utente deve poter chiudere il dialog
            popover: {
              title: step.dialogTitle ?? step.title,
              description: `<p class="sg-body">${step.dialogBody ?? "Chiudi per continuare."}</p>`,
            },
          });
        }
        seenOpen = true;
        return;
      }
      if (seenOpen) { clearInterval(iv); setTimeout(() => advance(), 250); }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // Passi "demo": DIMOSTRAZIONE AUTOMATICA dei 3 filtri (bulk). La guida mostra
  // da sola, UN filtro alla volta, cosa succede tenendolo premuto: evidenzia il
  // filtro e colora TUTTA la griglia di quello stato (solo CSS, zero dati),
  // poi RIPRISTINA tutto e avanza. L'app torna esattamente com'era.
  useEffect(() => {
    if (!active || !step || step.kind !== "demo") return;
    let cancelled = false;
    const clearGrid = () =>
      document.querySelector(GRID_SELECTOR)?.classList.remove(...GRID_DEMO_CLASSES);
    const phases = [
      { target: "guide-filter-possedute", cls: GRID_DEMO_CLASSES[0], title: "Tieni premuto “Mie” ✋", body: "…e le segni TUTTE come possedute." },
      { target: "guide-filter-doppie", cls: GRID_DEMO_CLASSES[1], title: "Tieni premuto “Doppie” ✋", body: "…tutte doppie, in un colpo solo." },
      { target: "guide-filter-mancanti", cls: GRID_DEMO_CLASSES[2], title: "Tieni premuto “Mancanti” ✋", body: "…o azzeri tutto. Ora rimetto com'era!" },
    ];
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(() => { if (!cancelled) fn(); }, ms));
    // Il fumetto-intro del passo è già a schermo → poi le 3 fasi → ripristino.
    phases.forEach((ph, i) =>
      at(1600 + i * 1800, () => {
        clearGrid();
        document.querySelector(GRID_SELECTOR)?.classList.add(ph.cls);
        const el = document.querySelector<HTMLElement>(`[data-guide="${ph.target}"]`);
        getDrv().highlight({
          element: el ?? undefined,
          disableActiveInteraction: true,
          popover: { title: ph.title, description: `<p class="sg-body">${ph.body}</p>` },
        });
      }),
    );
    at(1600 + phases.length * 1800 + 500, () => { clearGrid(); advance(); });
    return () => { cancelled = true; timers.forEach(clearTimeout); clearGrid(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  // ESC chiude · resize/rotazione riallineano spotlight e fumetto.
  useEffect(() => {
    if (!active) return;
    // CAPTURE: così controlliamo PRIMA che Radix chiuda il dialog (altrimenti
    // al momento del check il dialog risulterebbe già chiuso e ESC terminerebbe
    // la guida invece di chiudere solo il dialog).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return; // ESC chiude il dialog reale, non la guida
      finish();
    };
    const onResize = () => drvRef.current?.refresh();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
    };
  }, [active, finish]);

  // Pulizia allo smontaggio.
  useEffect(() => () => { drvRef.current?.destroy(); drvRef.current = null; }, []);

  return null;
}
