// Guida interattiva — STATO (context globale).
//
// Tiene solo lo stato minimo: guida attiva? quale passo? e le azioni per
// avviarla/chiuderla/navigare. Il "già vista" è un flag in localStorage
// PER-UTENTE (stesso pattern dei profili-prova), così ogni account ha la sua.
//
// NB: il rendering visivo NON è qui — vive in <GuideOverlay/>. Questo file è
// solo logica, così motore e stato restano separati (facili da modificare).

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { GUIDE_STEPS } from "./steps";

// Flag "guida completata/saltata" per-utente. Cambiare la versione (v1→v2)
// ri-mostra la guida a tutti dopo un aggiornamento importante dei passi.
const SEEN_KEY_PREFIX = "sticker_guide_seen_v1:";
const seenKey = (userId: number | undefined) => `${SEEN_KEY_PREFIX}${userId ?? "anon"}`;

export function hasSeenGuide(userId: number | undefined): boolean {
  try {
    return localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markGuideSeen(userId: number | undefined) {
  try {
    localStorage.setItem(seenKey(userId), "1");
  } catch {
    /* no-op */
  }
}

// Nella guida si va SOLO avanti: niente prev, niente contatori esposti.
interface GuideContextValue {
  active: boolean;
  stepIndex: number;
  /** Avvia la guida dal primo passo (trigger auto e Profilo → "Guida Stickers"). */
  start: () => void;
  /** Passo successivo; all'ultimo chiude e segna "vista". */
  next: () => void;
  /** Chiude la guida e la segna "vista" (ESC / fine). */
  finish: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({
  userId,
  children,
}: {
  userId: number | undefined;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const total = GUIDE_STEPS.length;

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    markGuideSeen(userId);
  }, [userId]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= total - 1) {
        // ultimo passo → chiudi e segna vista
        setActive(false);
        markGuideSeen(userId);
        return 0;
      }
      return i + 1;
    });
  }, [total, userId]);

  return (
    <GuideContext.Provider value={{ active, stepIndex, start, next, finish }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide deve stare dentro <GuideProvider>");
  return ctx;
}

// Id del passo corrente (null se la guida non è attiva). Serve alle pagine che
// mostrano lo stato-demo della guida (es. AlbumList: album di prova, tab forzato)
// senza accoppiarle all'indice numerico dei passi.
export function useGuideStepId(): string | null {
  const { active, stepIndex } = useGuide();
  return active ? (GUIDE_STEPS[stepIndex]?.id ?? null) : null;
}
