import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { Check, Minus, ChevronDown, CheckCircle2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useGetChatTrade,
  useConfirmChatTrade,
  getGetChatTradeQueryKey,
  getGetUserAlbumsQueryKey,
  getGetBestMatchesQueryKey,
  getGetNearbyMatchesQueryKey,
  getGetMatchDetailQueryKey,
} from "@workspace/api-client-react";
import type { MatchAlbumGroup } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TRADE_DIRECTION } from "@/lib/trade-labels";

// Oltre questa soglia un album aperto mostra prima un'anteprima, poi "Mostra tutte".
const PREVIEW_LIMIT = 50;

type SelState = "all" | "some" | "none";
type Setter = Dispatch<SetStateAction<Set<number>>>;

const TONE = {
  give: { text: "text-emerald-700", boxOn: "bg-emerald-600 border-emerald-600 text-white", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  receive: { text: "text-sky-700", boxOn: "bg-sky-600 border-sky-600 text-white", chip: "bg-sky-50 text-sky-700 border-sky-200", badge: "bg-sky-100 text-sky-700" },
};

/** Casella di spunta (album o intera sezione): piena / parziale / vuota. */
function Box({ state, tone, onClick, label }: { state: SelState; tone: keyof typeof TONE; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={state !== "none"}
      className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
        state === "none" ? "border-muted-foreground/40 bg-transparent" : TONE[tone].boxOn
      }`}
    >
      {state === "all" && <Check className="h-3.5 w-3.5" />}
      {state === "some" && <Minus className="h-3.5 w-3.5" />}
    </button>
  );
}

/**
 * Sezione direzione (DAI / RICEVI) a fisarmonica per album — coerente col
 * Dettaglio match. Di default gli album sono CHIUSI: vedi solo le righe-album
 * con la spunta. Tocchi un album per scegliere le singole figurine.
 */
function Section({
  variant,
  groups,
  selected,
  setSelected,
}: {
  variant: keyof typeof TONE;
  groups: MatchAlbumGroup[];
  selected: Set<number>;
  setSelected: Setter;
}) {
  const tone = TONE[variant];
  const label = TRADE_DIRECTION[variant]; // "Dai" / "Ricevi" — fonte unica
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [showAllIds, setShowAllIds] = useState<Set<number>>(new Set());

  if (!groups.length) return null;

  const allIds = groups.flatMap(g => g.stickers.map(s => s.id));
  const total = allIds.length;
  const sel = allIds.filter(id => selected.has(id)).length;
  const sectionState: SelState = sel === 0 ? "none" : sel === total ? "all" : "some";

  const setMany = (ids: number[], on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) on ? next.add(id) : next.delete(id);
      return next;
    });

  const toggleOpen = (id: number) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {variant === "give" ? <ArrowUp className={`h-4 w-4 ${tone.text}`} /> : <ArrowDown className={`h-4 w-4 ${tone.text}`} />}
        <span className={`text-sm font-bold ${tone.text}`}>{label}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{sel}/{total}</span>
        <button
          type="button"
          onClick={() => setMany(allIds, sectionState !== "all")}
          className="ml-auto text-xs font-semibold text-accent active:opacity-70"
        >
          {sectionState === "all" ? "Deseleziona" : "Seleziona tutto"}
        </button>
      </div>

      <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
        {groups.map(g => {
          const gTotal = g.stickers.length;
          const gSel = g.stickers.filter(s => selected.has(s.id)).length;
          const gState: SelState = gSel === 0 ? "none" : gSel === gTotal ? "all" : "some";
          const isOpen = openIds.has(g.albumId);
          const all = showAllIds.has(g.albumId);
          const visible = all ? g.stickers : g.stickers.slice(0, PREVIEW_LIMIT);
          const hidden = gTotal - visible.length;
          return (
            <div key={g.albumId} className="bg-card">
              <div className="flex items-center gap-2.5 px-2.5 py-2.5">
                <Box state={gState} tone={variant} onClick={() => setMany(g.stickers.map(s => s.id), gState !== "all")} label={`Seleziona ${g.albumTitle}`} />
                <button
                  type="button"
                  onClick={() => toggleOpen(g.albumId)}
                  aria-expanded={isOpen}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left active:opacity-70"
                >
                  <span className="flex-1 text-sm font-semibold text-foreground truncate">{g.albumTitle}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${tone.badge}`}>{gSel}/{gTotal}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              </div>
              {isOpen && (
                <div className="px-2.5 pb-3">
                  <div className="grid grid-cols-5 gap-1.5">
                    {visible.map(s => {
                      const on = selected.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setMany([s.id], !on)}
                          title={s.name}
                          className={`flex items-center justify-center h-9 rounded-lg text-sm font-bold tabular-nums border transition-colors ${
                            on ? tone.chip : "bg-muted/40 text-muted-foreground/70 border-transparent line-through"
                          }`}
                        >
                          {s.code || s.number}
                        </button>
                      );
                    })}
                  </div>
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllIds(prev => new Set(prev).add(g.albumId))}
                      className="mt-2 w-full text-xs font-semibold text-accent py-1.5 active:opacity-70"
                    >
                      Mostra tutte ({gTotal})
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Conferma scambio concluso. A fisarmonica per album (smart anche coi match
 * cross-album da centinaia di figurine): di default tutto spuntato e album
 * chiusi → un tap su "Conferma" basta. Apri un album per uno scambio parziale.
 * Applica gli stati SOLO al TUO album; l'altro conferma il suo.
 */
export function TradeConfirmDialog({
  chatId,
  open,
  onOpenChange,
}: {
  chatId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetChatTrade(chatId, {
    query: { queryKey: getGetChatTradeQueryKey(chatId), enabled: open },
  });

  const [step, setStep] = useState<"intro" | "select">("intro");
  const [confirmStage, setConfirmStage] = useState(0); // 0 chiuso · 1 prima conferma · 2 seconda
  const [selGive, setSelGive] = useState<Set<number>>(new Set());
  const [selReceive, setSelReceive] = useState<Set<number>>(new Set());
  const initialized = useRef(false);

  // All'apertura riparti sempre dalla spiegazione; precompila tutto spuntato
  // alla prima apertura con dati; reset alla chiusura.
  useEffect(() => {
    if (!open) { initialized.current = false; setStep("intro"); setConfirmStage(0); return; }
    if (data && !initialized.current) {
      setSelGive(new Set(data.give.flatMap(g => g.stickers.map(s => s.id))));
      setSelReceive(new Set(data.receive.flatMap(g => g.stickers.map(s => s.id))));
      initialized.current = true;
    }
  }, [open, data]);

  const confirm = useConfirmChatTrade({
    mutation: {
      onSuccess: (resp) => {
        toast({
          title: "Scambio confermato",
          description: `Aggiornate ${resp.givenApplied + resp.receivedApplied} figurine nel tuo album.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBestMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNearbyMatchesQueryKey() });
        if (data) queryClient.invalidateQueries({ queryKey: getGetMatchDetailQueryKey(data.otherUserId) });
        queryClient.invalidateQueries({ queryKey: getGetChatTradeQueryKey(chatId) });
        onOpenChange(false);
      },
    },
  });

  const total = (data?.totalGive ?? 0) + (data?.totalReceive ?? 0);
  const selCount = selGive.size + selReceive.size;
  const doConfirm = () => confirm.mutate({ chatId, data: { giveStickerIds: [...selGive], receiveStickerIds: [...selReceive] } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 gap-0 max-h-[88vh] grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl sm:rounded-3xl border-0 shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogHeader className="sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Conferma scambio
            </DialogTitle>
            <DialogDescription>
              {step === "intro"
                ? "Avete completato lo scambio di persona?"
                : "Scambio parziale? Gestisci le modifiche."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* STEP 1 — solo comunicativo: o annulla o vai avanti */}
        {step === "intro" ? (
          <>
            <div className="overflow-y-auto min-h-0 px-6 py-6 space-y-4 text-center">
              {isLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : total === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nessuna figurina da scambiare con questo utente al momento.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  Proseguendo e confermando,<br />
                  i tuoi album si aggiorneranno in automatico<br />
                  con le figurine scambiate.
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border/60 bg-popover flex items-center gap-2">
              {total === 0 || isLoading ? (
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>Chiudi</Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                    Annulla
                  </Button>
                  <Button
                    className="flex-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setStep("select")}
                  >
                    Avanti
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          /* STEP 2 — selezione fine per scambio parziale */
          <>
            <div className="overflow-y-auto min-h-0 px-5 py-4 space-y-4">
              <Section variant="give" groups={data?.give ?? []} selected={selGive} setSelected={setSelGive} />
              <Section variant="receive" groups={data?.receive ?? []} selected={selReceive} setSelected={setSelReceive} />
              {data?.myConfirmedAt && (
                <p className="text-center text-xs text-muted-foreground">
                  Avevi già confermato: confermando di nuovo aggiorni le figurine ancora in elenco.
                </p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border/60 bg-popover flex items-center gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("intro")}>
                Indietro
              </Button>
              <Button
                className="flex-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={selCount === 0 || confirm.isPending}
                onClick={() => setConfirmStage(1)}
              >
                {confirm.isPending ? "Aggiorno…" : `Conferma (${selCount})`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      {/* Conferma doppia (due passaggi) prima di scrivere negli album */}
      <AlertDialog open={confirmStage > 0} onOpenChange={(v) => { if (!v) setConfirmStage(0); }}>
        <AlertDialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-3xl border-0">
          <AlertDialogHeader className="sm:text-center items-center">
            <div className={`mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full ${confirmStage === 2 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-600"}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            {confirmStage === 1 ? (
              <>
                <AlertDialogTitle>Confermi lo scambio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stai per aggiornare <strong>{selCount}</strong> {selCount === 1 ? "figurina" : "figurine"} nei tuoi album.
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>Sei davvero sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'operazione aggiorna i tuoi album e <strong>non è annullabile in automatico</strong>. Procedo?
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="w-full rounded-xl mt-0" onClick={() => setConfirmStage(0)}>
              Annulla
            </Button>
            {confirmStage === 1 ? (
              <Button className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setConfirmStage(2)}>
                Sì, continua
              </Button>
            ) : (
              <Button
                className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={confirm.isPending}
                onClick={() => { setConfirmStage(0); doConfirm(); }}
              >
                Sì, conferma e aggiorna
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
