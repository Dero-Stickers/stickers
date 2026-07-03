import { useState, useMemo } from "react";
import { Bug, PencilLine, Lightbulb, ChevronLeft, Send, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useListAlbums } from "@workspace/api-client-react";
import { reportError, type ReportMeta } from "@/lib/report-error";

/**
 * "Segnala o proponi" — dialog a 2 passi, unico punto d'ingresso per:
 *   • bug        → qualcosa non funziona (tecnico)
 *   • content    → errore nei contenuti (figurina/album sbagliati)
 *   • proposal   → proposta / richiesta (nuovo album, sezione, ecc.)
 * Passo 1: scelta del tipo (3 card). Passo 2: form adattivo al tipo scelto.
 * Minimale e guidato: l'utente vede solo i campi pertinenti; l'admin riceve
 * dati già classificati (errorType) e strutturati (meta: album/figurina).
 */

type Kind = "bug" | "content" | "proposal";

const KINDS: { key: Kind; icon: typeof Bug; title: string; hint: string; accent: string }[] = [
  { key: "bug", icon: Bug, title: "Qualcosa non funziona", hint: "Un errore, un pulsante che non risponde…", accent: "text-red-500" },
  { key: "content", icon: PencilLine, title: "Errore in un album", hint: "Una figurina o un dato sbagliato", accent: "text-amber-500" },
  { key: "proposal", icon: Lightbulb, title: "Proposta o richiesta", hint: "Un nuovo album, una sezione…", accent: "text-blue-500" },
];

// errorType inviato al backend per ciascun tipo (l'admin filtra su questo).
const ERROR_TYPE: Record<Kind, string> = {
  bug: "user_report",
  content: "content_error",
  proposal: "feature_request",
};

export function ReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind | null>(null);
  const [note, setNote] = useState("");
  const [albumId, setAlbumId] = useState<string>("");
  const [stickerRef, setStickerRef] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Elenco album (pubblicati) per il menu di "Errore in un album".
  const { data: albums } = useListAlbums();
  const publishedAlbums = useMemo(
    () => (albums ?? []).filter(a => a.isPublished).map(a => ({ id: a.id, title: a.title })),
    [albums],
  );

  const reset = () => {
    setKind(null); setNote(""); setAlbumId(""); setStickerRef(""); setSending(false); setSent(false);
  };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const canSend = note.trim().length >= 5 && !sending && !sent;

  const handleSend = async () => {
    if (!kind || !canSend) return;
    setSending(true);
    const meta: ReportMeta = {};
    if (kind === "content") {
      const sel = publishedAlbums.find(a => String(a.id) === albumId);
      if (sel) { meta.albumId = sel.id; meta.albumTitle = sel.title; }
      if (stickerRef.trim()) meta.stickerRef = stickerRef.trim();
    }
    if (kind === "proposal") meta.requestKind = "user_proposal";

    const ok = await reportError({
      errorType: ERROR_TYPE[kind] as never,
      userNote: note.trim(),
      meta: Object.keys(meta).length ? meta : undefined,
    });
    setSending(false);
    if (ok) {
      setSent(true);
      toast({ title: "Grazie!", description: "La tua segnalazione è stata inviata." });
      setTimeout(() => close(false), 1400);
    } else {
      toast({ title: "Invio non riuscito", description: "Riprova tra poco.", variant: "destructive" });
    }
  };

  const current = kind ? KINDS.find(k => k.key === kind)! : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind && (
              <button
                onClick={() => { setKind(null); setSent(false); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Indietro"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {current ? current.title : "Segnala o proponi"}
          </DialogTitle>
          {!kind && (
            <DialogDescription>
              Aiutaci a migliorare l'app. Scegli di cosa si tratta.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* PASSO 1 — scelta del tipo */}
        {!kind && (
          <div className="space-y-2">
            {KINDS.map(k => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
              >
                <k.icon className={`h-6 w-6 shrink-0 ${k.accent}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{k.title}</p>
                  <p className="text-xs text-muted-foreground">{k.hint}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* PASSO 2 — form adattivo */}
        {kind && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Non serve scrivere dati personali: non li raccogliamo.
            </p>

            {/* Solo "Errore in un album": album + figurina */}
            {kind === "content" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Quale album?</label>
                  <select
                    value={albumId}
                    onChange={e => setAlbumId(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— Seleziona l'album —</option>
                    {publishedAlbums.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Numero o codice figurina <span className="text-muted-foreground font-normal">(facoltativo)</span>
                  </label>
                  <input
                    value={stickerRef}
                    onChange={e => setStickerRef(e.target.value)}
                    placeholder="es. 45, oppure MEX10"
                    className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {kind === "bug" && "Cosa è andato storto?"}
                {kind === "content" && "Cosa c'è di sbagliato?"}
                {kind === "proposal" && "Cosa proponi?"}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={6}
                autoFocus
                placeholder={
                  kind === "bug"
                    ? "es. Clicco 'Aggiungi' e non succede niente. Più dettagli ci dai, meglio è."
                    : kind === "content"
                    ? "es. La figurina 45 riporta 'Rossi' ma dovrebbe essere 'Bianchi'."
                    : "es. Mi piacerebbe l'album Champions League, o una sezione per le amichevoli."
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11" onClick={() => close(false)} disabled={sending}>
                Annulla
              </Button>
              <Button
                className="flex-1 h-11 bg-primary text-primary-foreground gap-1.5"
                onClick={handleSend}
                disabled={!canSend}
              >
                {sent ? <><Check className="h-4 w-4" /> Inviata</> : <><Send className="h-4 w-4" /> {sending ? "Invio…" : "Invia"}</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
