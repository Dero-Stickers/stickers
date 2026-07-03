import { memo } from "react";
import type { UserSticker } from "@workspace/api-client-react";

export type StickerState = "mancante" | "posseduta" | "doppia";

export const stateColors: Record<StickerState, string> = {
  mancante: "bg-gray-100 text-gray-400 border border-gray-200",
  posseduta: "bg-green-100 text-green-700 border border-green-200",
  doppia: "bg-red-100 text-red-600 border border-red-200",
};

// Cella singola della griglia figurine, MEMOIZZATA: con callback stabili dal
// genitore (useCallback), al cambio di stato di UNA figurina si ri-renderizza
// solo quella cella e non tutte le ~700-900. `content-visibility` (cv-cell)
// salta il paint fuori schermo; il memo evita il costo JS del re-render.
// Codici alfanumerici lunghi (es. "MEX10", "FWC19") su DUE righe: sigla sopra,
// numero sotto — leggibili nella cella quadrata senza strabordare. I codici
// corti (Calciatori "001".."624") restano su una riga come sempre.
function splitLongCode(code: string): { prefix: string; digits: string } | null {
  if (code.length <= 3) return null;
  const m = code.match(/^([A-Za-z]+)(\d+)$/);
  return m ? { prefix: m[1], digits: m[2] } : null;
}

export const StickerCell = memo(function StickerCell({ sticker, onTap, onPressStart, onPressEnd }: {
  sticker: UserSticker;
  onTap: (s: UserSticker) => void;
  onPressStart: (s: UserSticker) => void;
  onPressEnd: () => void;
}) {
  const st = (sticker.state ?? "mancante") as StickerState;
  const split = sticker.code ? splitLongCode(sticker.code) : null;
  return (
    <button
      className={`cv-cell aspect-square rounded-md flex flex-col items-center justify-center text-xs font-bold select-none transition-transform active:scale-95 ${stateColors[st]}`}
      onClick={() => onTap(sticker)}
      onPointerDown={() => onPressStart(sticker)}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
    >
      {split ? (
        <>
          <span className="text-[10px] leading-none opacity-70">{split.prefix}</span>
          <span className="leading-tight">{split.digits}</span>
        </>
      ) : (
        sticker.code || sticker.number
      )}
    </button>
  );
});
