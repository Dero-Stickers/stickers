import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Si iscrive a un topic Supabase Realtime (broadcast) e invoca `onSignal` ad
 * ogni evento "refresh". È un segnale leggero: il canale NON trasporta dati
 * sensibili: il contenuto reale viene poi ricaricato dalle API autenticate.
 *
 * - `onSignal` tenuto in un ref → il canale non si ri-sottoscrive a ogni render.
 * - Cleanup con `removeChannel` → niente canali orfani (limiti free tier).
 * - Se il client non è configurato (env assenti) o `topic` è null → no-op:
 *   la chat resta funzionante via polling di fallback.
 */
export function useRealtimeSignal(topic: string | null, onSignal: () => void): void {
  const cb = useRef(onSignal);
  cb.current = onSignal;

  useEffect(() => {
    if (!topic) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(topic)
      .on("broadcast", { event: "refresh" }, () => cb.current())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [topic]);
}
