import { Bug, ChevronRight, Globe, Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  timeAgo,
  type ErrorRow as ErrorRowType,
} from "./types";

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
  if (ua.startsWith("mobile"))
    return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />;
  if (ua === "bot") return <Bug className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Monitor className="h-3.5 w-3.5 text-muted-foreground" />;
}

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
        <p className="text-sm font-medium text-foreground line-clamp-1 break-all">
          {row.userNote || row.messageClean || "(nessun dettaglio)"}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span className="font-mono">{row.page || "—"}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <DeviceIcon ua={row.uaClass} />
            {row.uaClass ?? "?"}
          </span>
          <span>•</span>
          <span>{timeAgo(row.lastSeenAt)}</span>
        </div>
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
    </div>
  );
}
