import { AppLogo } from "@/components/brand/AppLogo";

/**
 * Head bar unificata dell'app: contiene SOLO il logo, centrato.
 * Slim e ottimizzata, con padding-top che rispetta la safe-area (notch) così
 * è user-friendly su qualsiasi dispositivo. I testi/titoli di pagina vanno
 * SEMPRE posizionati sotto questa barra, nel corpo della pagina.
 */
export function AppHeader() {
  return (
    <div
      className="flex justify-center px-4 pb-3 shrink-0"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        // Sfumatura orizzontale elegante: più chiara ai lati, colore pieno al centro.
        background:
          "linear-gradient(to right, hsl(205 65% 93%), hsl(var(--sidebar)) 50%, hsl(205 65% 93%))",
        // Linea di separazione che svanisce ai lati (gradiente trasparente→colore→trasparente).
        borderBottom: "1px solid transparent",
        borderImage:
          "linear-gradient(to right, transparent, hsl(var(--sidebar-border)) 50%, transparent) 1",
      }}
    >
      <AppLogo className="h-11 w-auto" />
    </div>
  );
}
