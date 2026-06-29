import { useEffect, type RefObject } from "react";
import { useLocation } from "wouter";

/**
 * Comportamento standard delle app mobile: a OGNI cambio di rotta la pagina
 * viene mostrata dall'inizio (scroll in cima), come se l'utente non avesse mai
 * scrollato o toccato il contenuto.
 *
 * Necessario perché wouter riusa la struttura DOM dei layout tra una rotta e
 * l'altra: senza reset esplicito il contenitore scrollabile mantiene la
 * posizione della pagina precedente.
 *
 * Logica CONSOLIDATA in un unico punto: va usata SOLO nei layout radice
 * (MobileLayout, AdminLayout) passando il ref del contenitore scrollabile.
 * Resetta il contenitore stesso e tutti i suoi discendenti scrollabili.
 */
export function useScrollResetOnNavigate(ref: RefObject<HTMLElement | null>) {
  const [location] = useLocation();
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reset = () => {
      root.scrollTop = 0;
      root
        .querySelectorAll<HTMLElement>(".overflow-y-auto, .overflow-auto")
        .forEach((el) => {
          el.scrollTop = 0;
        });
    };
    // Subito dopo il commit della nuova pagina e di nuovo al frame successivo,
    // per coprire i layout che cambiano altezza dopo il primo render.
    reset();
    const raf = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(raf);
  }, [location, ref]);
}
