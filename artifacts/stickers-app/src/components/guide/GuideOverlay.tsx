// Guida interattiva — MOTORE VISIVO.
//
// Disegna un velo scuro con un "buco" (spotlight) sull'elemento del passo
// corrente e un fumetto con testo breve.
//
// INTERATTIVITÀ (importante): il buco NON è coperto dal velo → l'elemento
// evidenziato resta CLICCABILE. Nei passi "action" la guida ASPETTA che l'utente
// tocchi quell'elemento e avanza da sola (niente bottone "Avanti"); nei passi
// "info" si avanza col bottone.
//
// Il velo è fatto di 4 pannelli scuri attorno al target (sopra/sotto/sx/dx): così
// il rettangolo centrale (il target) è un vero foro che lascia passare i click.
//
// Aggancio: cerca `[data-guide="<target>"]`. Se il target non esiste, il passo
// "info" diventa a tutto schermo; un passo "action" senza target viene saltato
// automaticamente (non deve mai bloccare la guida).

import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Hand } from "lucide-react";
import { useGuide } from "@/lib/guide/GuideContext";
import { GUIDE_STEPS } from "@/lib/guide/steps";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6; // margine dello spotlight attorno all'elemento

export function GuideOverlay() {
  const { active, stepIndex, totalSteps, next, prev, finish } = useGuide();
  const [location, setLocation] = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);

  const step = active ? GUIDE_STEPS[stepIndex] : null;

  // Porta l'utente sulla rotta del passo (se serve) prima di cercare il target.
  // I passi su rotta DINAMICA (album/match aperti dal passo "action" precedente)
  // NON forzano la navigazione: restano dove l'utente è stato portato.
  useEffect(() => {
    if (!step || step.dynamicRoute) return;
    if (step.route && location !== step.route) setLocation(step.route);
  }, [step, location, setLocation]);

  // Misura la posizione dell'elemento target (o null se assente / passo full).
  // Aggiorna lo stato SOLO se la posizione è cambiata (>0.5px) → evita re-render
  // ad ogni frame del loop rAF.
  const measure = useCallback(() => {
    const el = step?.target
      ? document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`)
      : null;
    if (!el) { setRect((prev) => (prev === null ? prev : null)); return; }
    const r = el.getBoundingClientRect();
    const nextRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect((prev) => {
      if (
        prev &&
        Math.abs(prev.top - nextRect.top) < 0.5 &&
        Math.abs(prev.left - nextRect.left) < 0.5 &&
        Math.abs(prev.width - nextRect.width) < 0.5 &&
        Math.abs(prev.height - nextRect.height) < 0.5
      ) return prev;
      return nextRect;
    });
  }, [step]);

  // Rimisura CONTINUA finché il passo è attivo (loop rAF leggero): così lo
  // spotlight e il fumetto seguono SEMPRE la posizione reale del target, anche
  // se la pagina è caricata async (griglia figurine, lista match), se il layout
  // cambia (banner che appaiono) o l'utente scrolla. Niente misure "congelate"
  // su posizioni intermedie sbagliate.
  useLayoutEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => { measure(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, stepIndex, measure]);

  // Passo "action": al tocco del target la GUIDA gestisce la navigazione in modo
  // DETERMINISTICO (niente race col <Link> di wouter). Se il target è un link
  // (ha href) → naviga lì con setLocation; poi avanza. Se è un'azione sulla stessa
  // pagina (navbar già lì) → avanza e basta. Intercettiamo in CAPTURE e
  // preveniamo il default così controlliamo noi la transizione.
  useEffect(() => {
    if (!active || !step || step.kind !== "action" || !step.target) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const hit = t?.closest(`[data-guide="${step.target}"]`) as HTMLElement | null;
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      const href = hit.getAttribute("href");
      // Avanza PRIMA (il passo successivo è dynamicRoute → non rinaviga), POI
      // naviga: così l'effetto di navigazione del passo corrente non riporta
      // indietro l'utente sulla rotta di partenza.
      next();
      if (href) setLocation(href); // naviga a /album/:id o /match/:id
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, step, next, setLocation]);

  // Passo "action" senza target montato: non deve bloccare → auto-skip dopo un
  // attimo (l'elemento navbar è però sempre presente, quindi raro).
  useEffect(() => {
    if (!active || !step || step.kind !== "action") return;
    if (rect) return;
    const t = setTimeout(() => { if (!rect) next(); }, 1200);
    return () => clearTimeout(t);
  }, [active, step, rect, next]);

  // ESC chiude.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active || !step) return null;

  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;
  const isAction = step.kind === "action";

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;

  // Fumetto SEMPRE fuori dallo spotlight (mai lo copre → l'utente vede e tocca
  // il target). Scegliamo il lato — sopra o sotto — con più spazio libero e
  // ancoriamo il fumetto a quel bordo. GAP separa fumetto e spotlight. Senza
  // target → centrato.
  const GAP = 16;
  const spaceAbove = rect ? rect.top - PAD : 0;          // px liberi sopra lo spotlight
  const spaceBelow = rect ? vh - (rect.top + rect.height + PAD) : 0; // px liberi sotto
  const putBelow = rect ? spaceBelow >= spaceAbove : false; // lato con più spazio
  const bubbleStyle: React.CSSProperties = rect
    ? putBelow
      ? { left: 12, right: 12, top: rect.top + rect.height + PAD + GAP }
      : { left: 12, right: 12, bottom: vh - rect.top + PAD + GAP }
    : { left: 12, right: 12, top: "50%", transform: "translateY(-50%)" };

  // 4 pannelli scuri attorno al foro (se c'è target). Il foro resta cliccabile.
  // Colore INLINE (non classe Tailwind): la palette slate non è generata in
  // questo progetto Tailwind v4 → `bg-slate-900/70` renderebbe trasparente.
  const VEIL = "rgba(15, 23, 42, 0.72)";
  const holeTop = rect ? rect.top - PAD : 0;
  const holeLeft = rect ? rect.left - PAD : 0;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;

  return createPortal(
    // Container ROOT trasparente ai click (pointerEvents:none): così il "buco"
    // dello spotlight lascia passare i tocchi al target reale sotto. I singoli
    // pezzi che DEVONO ricevere click (pannelli velo, X, fumetto) riattivano
    // pointerEvents:auto inline. Il ring resta 'none' (non deve mai bloccare).
    <div
      className="fixed inset-0 z-[200]"
      role="dialog" aria-modal="true" aria-label="Guida Stickers"
      style={{ pointerEvents: "none" }}
    >
      {rect ? (
        <>
          {/* VELO a 4 pannelli: lascia libero (e cliccabile) il rettangolo del
              target. I pannelli sono opachi ai click (pe:auto) → tutto ciò che
              NON è il buco resta "coperto" e un tocco lì non fa nulla. */}
          <div className="fixed" style={{ pointerEvents: "auto", background: VEIL, top: 0, left: 0, width: vw, height: Math.max(0, holeTop) }} />
          <div className="fixed" style={{ pointerEvents: "auto", background: VEIL, top: holeTop + holeH, left: 0, width: vw, height: Math.max(0, vh - (holeTop + holeH)) }} />
          <div className="fixed" style={{ pointerEvents: "auto", background: VEIL, top: holeTop, left: 0, width: Math.max(0, holeLeft), height: holeH }} />
          <div className="fixed" style={{ pointerEvents: "auto", background: VEIL, top: holeTop, left: holeLeft + holeW, width: Math.max(0, vw - (holeLeft + holeW)), height: holeH }} />
          {/* Cornice luminosa attorno al foro (pulsa sui passi action). MAI
              cliccabile (pointerEvents:none INLINE — la classe Tailwind non basta). */}
          <motion.div
            key={`${stepIndex}-ring`}
            initial={{ opacity: 0 }}
            animate={isAction ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
            transition={isAction ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
            className="fixed rounded-xl"
            style={{ pointerEvents: "none", top: holeTop, left: holeLeft, width: holeW, height: holeH, outline: "3px solid rgba(255,255,255,0.95)", boxShadow: "0 0 0 3px rgba(244,164,37,0.6)" }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={{ pointerEvents: "auto", background: VEIL }} />
      )}

      {/* Chiudi (X) — in alto a SINISTRA per non collidere con il pulsante U/A
          (DevQuickSwitch, z-9999, in alto a destra). Touch-friendly; pe:auto
          perché il root è pe:none. */}
      <button
        onClick={finish}
        aria-label="Chiudi la guida"
        style={{ pointerEvents: "auto" }}
        className="absolute left-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md active:scale-95"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Fumetto */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="absolute z-10 mx-auto max-w-sm rounded-2xl bg-popover p-4 shadow-xl border border-border/60"
          style={{ ...bubbleStyle, pointerEvents: "auto" }}
        >
          <div className="flex items-start gap-2.5">
            {step.emoji && <span className="text-xl leading-none mt-0.5">{step.emoji}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-accent">{step.title}</p>
              <p className="mt-1 text-sm leading-snug text-foreground/90">{step.body}</p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2">
            {/* Contatore a puntini */}
            <div className="flex items-center gap-1">
              {GUIDE_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-4 bg-accent" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="inline-flex h-11 items-center gap-1 rounded-xl px-3.5 text-sm font-semibold text-muted-foreground active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Indietro
                </button>
              )}
              {isAction ? (
                // Passo interattivo: nessun "Avanti" — la guida aspetta il tocco.
                // Mostriamo un promemoria animato "tocca qui".
                <span className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent/15 px-4 text-sm font-bold text-accent">
                  <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    <Hand className="h-4 w-4" />
                  </motion.span>
                  Tocca lì
                </span>
              ) : (
                <button
                  onClick={next}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm active:scale-95"
                >
                  {isLast ? "Fine" : "Avanti"}
                  {!isLast && <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Salta: sempre disponibile tranne all'ultimo passo */}
          {!isLast && (
            <button
              onClick={finish}
              className="mt-1 flex h-11 w-full items-center justify-center text-xs text-muted-foreground/70 active:opacity-70"
            >
              Salta la guida
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
