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
export const StickerCell = memo(function StickerCell({ sticker, onTap, onPressStart, onPressEnd }: {
  sticker: UserSticker;
  onTap: (s: UserSticker) => void;
  onPressStart: (s: UserSticker) => void;
  onPressEnd: () => void;
}) {
  const st = (sticker.state ?? "mancante") as StickerState;
  return (
    <button
      className={`cv-cell aspect-square rounded-md flex items-center justify-center text-xs font-bold select-none transition-transform active:scale-95 ${stateColors[st]}`}
      onClick={() => onTap(sticker)}
      onPointerDown={() => onPressStart(sticker)}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
    >
      {sticker.code || sticker.number}
    </button>
  );
});
