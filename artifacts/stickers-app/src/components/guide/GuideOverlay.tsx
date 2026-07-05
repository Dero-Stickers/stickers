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
//  - "try"    → prova pratica dell'utente, SIMULATA (tocchi la cella, long-press
//    per il dettaglio read-only, o tieni premuto un filtro per colorare la
//    griglia): zero scritture.
//  - La guida non modifica MAI il database; a fine guida l'app è com'era.

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./guide-theme.css";
import { useGuide } from "@/lib/guide/GuideContext";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import { withGuideIcons } from "@/lib/guide/guide-icons";

// ── Costanti condivise (un solo punto di verità, niente stringhe duplicate) ──
// Dialog reale aperto (Radix): usato sia dal watcher long-press sia da ESC.
const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
// Classi-demo della SINGOLA cella (prova "tocca la figurina") — i 3 colori.
const CELL_DEMO_CYCLE = ["sg-cell-posseduta", "sg-cell-doppia", "sg-cell-mancante"] as const;
// Classi-demo dell'INTERA griglia (prova long-press sul filtro).
const GRID_DEMO_CLASSES = ["sg-demo-posseduta", "sg-demo-doppia", "sg-demo-mancante"] as const;
const GRID_SELECTOR = '[data-guide="guide-sticker-grid"]';

// Icone INLINE nel fumetto = LE STESSE dell'app: i segnaposto {album}/{match}/
// {messaggi}/{aggiungi} nel testo dei passi vengono sostituiti dall'SVG del
// componente lucide reale (vedi lib/guide/guide-icons — nessun markup duplicato).

// Corpo del fumetto — MINIMALE: solo la frase + un hint dove serve. Niente
// pulsanti, niente pallini, niente "salta": la guida si fa e basta.
function stepDescription(body: string, kind: string, hintOverride?: string): string {
  // Hint minimale: solo dove aggiunge informazione. I passi "try" NON hanno un
  // hint generico ("Provaci ora" era palese) — l'azione è già chiara dal testo;
  // eventuali istruzioni specifiche arrivano da hintOverride (es. "Tieni premuto").
  const hint =
    hintOverride
      ? `<p class="sg-hint">${hintOverride}</p>`
      : kind === "info"
        ? `<p class="sg-hint">Tocca lo schermo per continuare</p>`
        : "";
  // withGuideIcons: sostituisce i segnaposto {album}/{match}/… con l'SVG dell'app.
  return `<p class="sg-body">${withGuideIcons(body)}</p>${hint}`;
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

  // Stato dei passi a fasi (bulkPhases): indice fase, se è già colorata, e la
  // funzione "vai alla fase dopo" (esposta via ref così il tocco sul velo la usa).
  const bulkPhaseRef = useRef(0);
  const bulkColoredRef = useRef(false);
  const bulkNextRef = useRef<() => void>(() => {});

  const getDrv = (): Driver => {
    if (!drvRef.current) {
      drvRef.current = driver({
        animate: true,
        // Velo scuro della guida: chiaro (0.4) così la parte in ombra resta
        // ben leggibile, mantenendo un minimo di contrasto sull'elemento in
        // luce. Unico punto: vale per TUTTI i passi.
        overlayOpacity: 0.4,
        // Margine attorno all'elemento evidenziato: piccolo (2px) così lo
        // spotlight ADERISCE al target (es. la sola voce "Album" in navbar) e
        // NON sborda sopra/fuori dalla barra.
        stagePadding: 2,
        stageRadius: 12,
        allowClose: false,
        showButtons: [], // NIENTE pulsanti nel fumetto
        popoverClass: "sticker-guide",
        // Tocco sul VELO: nei passi info avanza ("tocca ovunque"); nei passi
        // try avanza SOLO a prova completata (lettura ultimo colore); nei passi
        // a fasi (bulkPhases) passa alla fase dopo; azione non fa nulla.
        overlayClickBehavior: () => {
          const s = stepRef.current;
          if (s?.bulkPhases && bulkColoredRef.current) { bulkNextRef.current(); return; }
          if (s?.kind === "info" || (s?.kind === "try" && tryDoneRef.current)) advance();
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
      // I passi a fasi (bulkPhases) hanno un fumetto PER FASE gestito dal loro
      // effetto dedicato: qui non mostriamo nulla (evita un flash col body vuoto).
      if (step.bulkPhases) { stepRef.current = step; return; }
      const el = step.target
        ? document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`)
        : null;
      if (step.target && !el && tries++ < 40) { setTimeout(show, 50); return; }
      if (step.target && !el) { if (step.kind === "action") next(); return; }
      stepRef.current = step; // letto dall'hook overlayClickBehavior
      getDrv().highlight({
        element: el ?? undefined,
        // Su info l'elemento è SOLO mostrato (nessuna interazione): impossibile
        // toccare l'app per sbaglio durante la guida.
        disableActiveInteraction: step.kind === "info",
        popover: {
          // le icone-app sono nei segnaposto {…}, sia nel titolo sia nel body
          title: withGuideIcons(step.title),
          description: stepDescription(step.body, step.kind),
          // side/align dal passo: forza il posizionamento quando l'auto-scelta
          // di driver.js coprirebbe il target (es. card larga in fondo).
          ...(step.side ? { side: step.side } : {}),
          ...(step.align ? { align: step.align } : {}),
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
    // Ripristina SEMPRE eventuali colori-demo rimasti (celle singole + griglia).
    document
      .querySelectorAll(CELL_DEMO_CYCLE.map((c) => `.${c}`).join(","))
      .forEach((el) => el.classList.remove(...CELL_DEMO_CYCLE));
    document.querySelector(GRID_SELECTOR)?.classList.remove(...GRID_DEMO_CLASSES);
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
      if (step.kind === "try" && step.bulkPhases) {
        // PROVA long-press sui filtri: gestita da pointerdown/up (effetto
        // dedicato, a fasi). Qui blocchiamo SOLO il click sul filtro, così l'app
        // non esegue il bulk reale. L'avanzamento avviene nel gestore pointer.
        e.preventDefault(); e.stopPropagation();
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
        const last = tapsRef.current >= step.taps;
        const phase = step.tapPhases?.[idx];
        if (phase) {
          // colore della FASE (il verde iniziale è già sulla cella demo)
          cell.classList.remove(...CELL_DEMO_CYCLE);
          cell.classList.add(phase.color);
          if (last) tryDoneRef.current = true; // niente auto-avanzamento
          getDrv().highlight({
            element: cell,
            disableActiveInteraction: false,
            popover: {
              title: withGuideIcons(step.title),
              // Hint solo sull'ULTIMO tocco (avanzo manuale); nei tocchi
              // intermedi il testo della fase dice già "Tocca ancora".
              // withGuideIcons → i pallini {rosso}/{grigio} diventano colori-app.
              description: `<p class="sg-body">${withGuideIcons(phase.body)}</p>${
                last ? `<p class="sg-hint">Tocca lo schermo per continuare</p>` : ""
              }`,
            },
          });
        } else if (last) {
          // prova senza fasi (es. ➕ aggiungi album): breve feedback e avanti
          setTimeout(() => { cell.classList.remove(...CELL_DEMO_CYCLE); advance(); }, 700);
        }
        return;
      }
      if (step.kind !== "action") return;
      const hit = t.closest(`[data-guide="${step.target}"]`) as HTMLElement | null;
      if (hit) {
        const href = hit.getAttribute("href");
        if (href) {
          // <Link href>: navighiamo noi (deterministico), niente click reale.
          e.preventDefault(); e.stopPropagation();
          advance();
          setLocation(href);
        } else {
          // <button onClick> che naviga da solo (es. apri chat): NON blocchiamo
          // il click — lasciamo scattare il suo handler reale, e avanziamo.
          advance();
        }
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

  // Passi "try" con long-press sui FILTRI (bulk), in una o più FASI (Mie, Doppie,
  // Mancanti). Ritmo per ogni fase, con calma: LEGGO l'istruzione → TENGO PREMUTO
  // il filtro → GUARDO la griglia colorarsi → TOCCO per continuare. Il rilascio
  // del long-press NON avanza (serve un tocco separato): così l'utente ha tutto
  // il tempo di guardare. All'ultima fase, il tocco va allo step successivo.
  // Solo CSS: zero dati; la guida ripristina SEMPRE i colori reali.
  // (bulkPhaseRef/bulkColoredRef/bulkNextRef dichiarati in alto.)
  useEffect(() => {
    if (!active || !step || step.kind !== "try" || !step.bulkPhases) return;
    const phases = step.bulkPhases;
    bulkPhaseRef.current = 0;
    bulkColoredRef.current = false;
    const clearGrid = () =>
      document.querySelector(GRID_SELECTOR)?.classList.remove(...GRID_DEMO_CLASSES);
    let pressTimer: number | null = null;
    let ignoreNextUp = false; // ignora il pointerup DEL long-press (non deve avanzare)

    // Mostra il fumetto-istruzione della fase corrente (freccia sul filtro).
    const showInstruction = () => {
      const ph = phases[bulkPhaseRef.current];
      const el = document.querySelector<HTMLElement>(`[data-guide="${ph.target}"]`);
      getDrv().highlight({
        element: el ?? undefined,
        disableActiveInteraction: false,
        popover: {
          title: withGuideIcons(ph.title),
          description: `<p class="sg-body">${withGuideIcons(ph.body)}</p><p class="sg-hint">Tieni premuto 👇</p>`,
        },
      });
    };
    // Dà tempo alla UI di montare (rotta album già aperta) poi mostra la 1ª fase.
    const t0 = window.setTimeout(showInstruction, 120);

    const onDown = (e: PointerEvent) => {
      if (bulkColoredRef.current) return; // già colorata: aspetto il tocco-avanza
      const ph = phases[bulkPhaseRef.current];
      const t = e.target as HTMLElement | null;
      if (!t?.closest(`[data-guide="${ph.target}"]`)) return;
      // preventDefault → il filtro reale non riceve nulla (nessun bulk sull'app)
      e.preventDefault(); e.stopPropagation();
      pressTimer = window.setTimeout(() => {
        // Long-press riuscito: colora TUTTA la griglia di questo stato.
        clearGrid();
        const grid = document.querySelector<HTMLElement>(GRID_SELECTOR);
        grid?.classList.add(ph.color);
        bulkColoredRef.current = true; // ora un tocco separato avanza
        ignoreNextUp = true;           // ...ma NON il pointerup di questo press
        // Spotlight sulla GRIGLIA: esce dal velo, si vede il cambio-colore.
        getDrv().highlight({
          element: grid ?? undefined,
          disableActiveInteraction: false,
          popover: {
            title: withGuideIcons(ph.title),
            description: `<p class="sg-body">${withGuideIcons(ph.doneBody)}</p>`,
          },
        });
      }, 550); // soglia long-press
    };
    const cancelPress = () => {
      if (pressTimer != null) { clearTimeout(pressTimer); pressTimer = null; }
    };
    // Passa alla fase dopo, o allo step successivo se era l'ultima.
    const nextPhase = () => {
      clearGrid();
      bulkColoredRef.current = false;
      if (bulkPhaseRef.current < phases.length - 1) {
        bulkPhaseRef.current += 1;
        showInstruction();
      } else {
        advance();
      }
    };
    bulkNextRef.current = nextPhase; // usato dal tocco sul velo (overlayClickBehavior)
    const onUp = (e: PointerEvent) => {
      if (ignoreNextUp) { ignoreNextUp = false; return; } // rilascio del long-press: NON avanza
      if (bulkColoredRef.current) {
        // tocco SEPARATO dopo aver colorato → avanti (con calma, l'ha deciso l'utente)
        e.preventDefault(); e.stopPropagation();
        nextPhase();
        return;
      }
      cancelPress(); // rilascio troppo presto (prima dei 550ms) → si può riprovare
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", cancelPress, true);
    return () => {
      clearTimeout(t0);
      cancelPress();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", cancelPress, true);
      clearGrid();
    };
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
