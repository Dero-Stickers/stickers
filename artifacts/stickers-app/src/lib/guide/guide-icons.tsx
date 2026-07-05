// Icone della guida = LE STESSE dell'app, senza duplicare markup.
//
// Regola owner: "usa la stessa icona della navbar, non crearne un'altra".
// Perciò NON incolliamo path SVG a mano: importiamo i COMPONENTI lucide reali
// (gli stessi usati in MobileLayout) e ne estraiamo l'SVG a runtime, una volta,
// renderizzandoli in un nodo off-screen. Se lucide aggiorna un'icona, la guida
// la eredita automaticamente.
//
// USO: nel testo di un passo scrivi il segnaposto {album}/{match}/{messaggi}/
// {aggiungi}; il motore (GuideOverlay) lo sostituisce con questo SVG.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { BookOpen, Zap, MessageCircle, Plus, Search, type LucideIcon } from "lucide-react";

// Mappa segnaposto → componente lucide (STESSI import dell'app).
// `filled`: il fulmine "Match" in navbar da attivo è arancione PIENO (fill-accent).
const ICONS: Record<string, { Comp: LucideIcon; filled?: boolean }> = {
  album: { Comp: BookOpen },
  match: { Comp: Zap, filled: true },
  messaggi: { Comp: MessageCircle },
  aggiungi: { Comp: Plus },
  search: { Comp: Search }, // lente "Cerca figurina" / Home
};

const ACCENT = "hsl(37 90% 55%)"; // arancione della palette (= fill-accent)

let cache: Record<string, string> | null = null;

// Renderizza ogni icona lucide in un nodo nascosto e ne legge l'outerHTML,
// così l'SVG è ESATTAMENTE quello del componente. Fatto una sola volta.
function buildCache(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof document === "undefined") return out;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;width:0;height:0;overflow:hidden";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    for (const [name, { Comp, filled }] of Object.entries(ICONS)) {
      const mount = document.createElement("span");
      host.appendChild(mount);
      const sub = createRoot(mount);
      // stessa dimensione/props della navbar; se "filled" coloriamo di arancione
      flushSync(() =>
        sub.render(
          createElement(Comp, {
            className: "sg-icon" + (filled ? " sg-icon-match" : ""),
            width: "1.1em",
            height: "1.1em",
            ...(filled ? { fill: ACCENT, color: ACCENT, strokeWidth: 0.75 } : {}),
            "aria-hidden": true,
          }),
        ),
      );
      const svg = mount.querySelector("svg");
      if (svg) out[name] = svg.outerHTML;
      sub.unmount();
    }
  } finally {
    root.unmount();
    host.remove();
  }
  return out;
}

/** SVG (stringa) dell'icona lucide per il segnaposto, o il segnaposto se ignoto. */
export function guideIconSvg(name: string): string {
  if (!cache) cache = buildCache();
  return cache[name] ?? `{${name}}`;
}

// Pallini-colore = gli STESSI colori delle celle-figurina dell'app (stateColors):
// verde=posseduta, rosso=doppia, grigio=mancante. Segnaposto {verde}/{rosso}/
// {grigio} nel testo → un pallino tondo pieno di quel colore.
const DOT_COLORS: Record<string, string> = {
  verde: "#22c55e",
  rosso: "#ef4444",
  grigio: "#9ca3af",
};
function colorDot(name: string): string {
  const c = DOT_COLORS[name];
  if (!c) return `{${name}}`;
  return `<span class="sg-dot" style="background:${c}" aria-hidden="true"></span>`;
}

/** Sostituisce i segnaposto {nome} nel testo con l'icona-app o il pallino-colore. */
export function withGuideIcons(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    name in DOT_COLORS ? colorDot(name) : guideIconSvg(name),
  );
}
