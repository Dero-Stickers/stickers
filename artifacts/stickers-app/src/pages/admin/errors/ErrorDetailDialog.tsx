import { AlertTriangle, Copy, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  type ErrorRow,
  type Priority,
  type Status,
} from "./types";

interface Props {
  selected: ErrorRow | null;
  generating: boolean;
  onClose: () => void;
  onUpdate: (
    id: string,
    body: { status?: Status; priority?: Priority; adminNote?: string },
  ) => void;
  onGenerateReport: (ids: string[]) => void;
}

export function ErrorDetailDialog({
  selected,
  generating,
  onClose,
  onUpdate,
  onGenerateReport,
}: Props) {
  return (
    <Dialog open={!!selected} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dettaglio segnalazione
          </DialogTitle>
        </DialogHeader>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge className={`${PRIORITY_COLOR[selected.priority]} border`}>
                {PRIORITY_LABEL[selected.priority]}
              </Badge>
              <Badge className={`${STATUS_COLOR[selected.status]} border-0`}>
                {STATUS_LABEL[selected.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                ×{selected.count} occorrenze
              </Badge>
            </div>

            {selected.userNote && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Cosa ha scritto l'utente
                </p>
                <p className="text-sm bg-muted/50 rounded p-2.5 whitespace-pre-wrap">
                  {selected.userNote}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Pagina</p>
                <p className="font-mono text-xs break-all">{selected.page || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-xs">{selected.errorType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dispositivo</p>
                <p className="text-xs">{selected.uaClass ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Versione app</p>
                <p className="text-xs">{selected.appVersion ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prima volta</p>
                <p className="text-xs">
                  {new Date(selected.createdAt).toLocaleString("it-IT")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ultima volta</p>
                <p className="text-xs">
                  {new Date(selected.lastSeenAt).toLocaleString("it-IT")}
                </p>
              </div>
            </div>

            {selected.messageClean && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Errore tecnico
                </p>
                <pre className="text-[11px] bg-muted rounded p-2.5 whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto">
                  {selected.messageClean}
                </pre>
              </div>
            )}

            {selected.stackTop && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Stack
                </p>
                <pre className="text-[11px] bg-muted rounded p-2.5 whitespace-pre-wrap break-all font-mono max-h-40 overflow-y-auto">
                  {selected.stackTop}
                </pre>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cambia priorità
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdate(selected.id, { priority: p })}
                    className={`px-2.5 py-1 rounded-full border text-xs ${
                      selected.priority === p
                        ? PRIORITY_COLOR[p] + " border"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                Cambia stato
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdate(selected.id, { status: s })}
                    className={`px-2.5 py-1 rounded-full border text-xs ${
                      selected.status === s
                        ? STATUS_COLOR[s] + " border-transparent"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 gap-1.5"
                onClick={() => onGenerateReport([selected.id])}
                disabled={generating}
              >
                <Copy className="h-3.5 w-3.5" />
                Copia report tecnico
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => onUpdate(selected.id, { status: "ignored" })}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Ignora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
