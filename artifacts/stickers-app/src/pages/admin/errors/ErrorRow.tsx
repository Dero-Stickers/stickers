import { ChevronRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  friendlyTitle,
  userLabel,
  timeAgo,
  typeLabel,
  typeColor,
  type ErrorRow as ErrorRowType,
} from "./types";

interface Props {
  row: ErrorRowType;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (row: ErrorRowType) => void;
}

export function ErrorRow({ row, selected, onToggleSelect, onOpen }: Props) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 hover:bg-muted/40 transition-colors">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(row.id)}
        className="mt-1 h-4 w-4 accent-primary cursor-pointer"
        aria-label="Seleziona"
      />
      <button onClick={() => onOpen(row)} className="flex-1 text-left min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {/* Badge TIPO per primo: distingue a colpo d'occhio bug/contenuto/proposta. */}
          <Badge className={`${typeColor(row.errorType)} border text-[10px] px-1.5 py-0`}>
            {typeLabel(row.errorType)}
          </Badge>
          <Badge
            className={`${PRIORITY_COLOR[row.priority]} border text-[10px] px-1.5 py-0`}
          >
            {PRIORITY_LABEL[row.priority]}
          </Badge>
          <Badge
            className={`${STATUS_COLOR[row.status]} border-0 text-[10px] px-1.5 py-0`}
          >
            {STATUS_LABEL[row.status]}
          </Badge>
          {row.count > 1 && (
            <Badge className="bg-foreground/10 text-foreground border-0 text-[10px] px-1.5 py-0">
              ×{row.count}
            </Badge>
          )}
        </div>
        {/* Descrizione SEMPLICE del problema (niente tecnicismi). */}
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {friendlyTitle(row)}
        </p>
        {/* Info utili a colpo d'occhio: chi l'ha avuto + quando. */}
        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {userLabel(row)}
          </span>
          <span>•</span>
          <span>{timeAgo(row.lastSeenAt)}</span>
        </div>
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
    </div>
  );
}
