import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageSquare, X, Star, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { useToast } from "@/hooks/use-toast";
import {
  useGetMatchDetail,
  useOpenChat,
  useActivateDemo,
  getGetDemoStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type MatchGroup = { albumId: number; albumTitle: string; stickers: { id: number; number: number }[] };

// Oltre questa soglia un album mostra prima un'anteprima, poi "Mostra tutte".
const PREVIEW_LIMIT = 60;

/**
 * Sezione direzione (DAI / RICEVI). Lo scambio è CROSS-ALBUM: i numeri di ogni
 * album sono indipendenti dall'altra direzione (puoi dare figurine di un album e
 * riceverne di un altro). Per restare leggibile anche con tanti album e tante
 * figurine, ogni album è una riga "a fisarmonica": si tocca per aprire/chiudere
 * la griglia dei numeri. Con un solo album resta già aperto (niente tocco inutile).
 */
function DirectionSection({
  variant,
  label,
  total,
  groups,
}: {
  variant: "give" | "receive";
  label: string;
  total: number;
  groups: MatchGroup[];
}) {
  const give = variant === "give";
  const tone = give
    ? { label: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-100 text-emerald-700" }
    : { label: "text-sky-700", chip: "bg-sky-50 text-sky-700", badge: "bg-sky-100 text-sky-700" };

  const single = groups.length === 1;
  const [openIds, setOpenIds] = useState<Set<number>>(() => (single ? new Set(groups.map(g => g.albumId)) : new Set()));
  const [showAllIds, setShowAllIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="shadow-sm p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-bold uppercase tracking-wide ${tone.label}`}>{label}</span>
        <span className={`text-sm font-bold ${tone.label}`}>{total}</span>
        <span className="text-xs text-muted-foreground">figurine {give ? "doppie" : "mancanti"}</span>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">Nessuna figurina</p>
      ) : (
        <div className="divide-y divide-border/60">
          {groups.map(g => {
            const isOpen = openIds.has(g.albumId);
            const all = showAllIds.has(g.albumId);
            const visible = all ? g.stickers : g.stickers.slice(0, PREVIEW_LIMIT);
            const hidden = g.stickers.length - visible.length;
            return (
              <div key={g.albumId}>
                <button
                  type="button"
                  onClick={() => toggle(g.albumId)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-2 py-2.5 text-left active:opacity-70"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                  <span className="flex-1 text-sm font-semibold text-foreground truncate">{g.albumTitle}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${tone.badge}`}>
                    {g.stickers.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {visible.map(s => (
                        <span
                          key={s.id}
                          className={`flex items-center justify-center h-9 rounded-lg text-sm font-bold tabular-nums ${tone.chip}`}
                        >
                          {s.number}
                        </span>
                      ))}
                    </div>
                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllIds(prev => new Set(prev).add(g.albumId))}
                        className="mt-2 w-full text-xs font-semibold text-accent py-1.5 active:opacity-70"
                      >
                        Mostra tutte ({g.stickers.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function MatchDetail() {
  const { userId } = useParams<{ userId: string }>();
  const matchUserId = parseInt(userId, 10);
  const [, setLocation] = useLocation();
  const { demoStatus, premiumDemoEnabled } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPaywall, setShowPaywall] = useState(false);

  const { data: detail, isLoading } = useGetMatchDetail(matchUserId);

  const openChat = useOpenChat({
    mutation: {
      onSuccess: (chat) => {
        setLocation(`/chat/${chat.id}`);
      },
      onError: (err: any) => {
        if (err?.error === "PREMIUM_REQUIRED" || err?.statusCode === 403) {
          setShowPaywall(true);
        } else {
          toast({ title: "Errore", description: "Impossibile aprire la chat", variant: "destructive" });
        }
      },
    },
  });

  const activateDemo = useActivateDemo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDemoStatusQueryKey() });
        toast({ title: "Demo attivata!", description: "Hai 24 ore per usare tutte le funzioni premium" });
        setShowPaywall(false);
        openChat.mutate({ data: { otherUserId: matchUserId } });
      },
    },
  });

  const canChat = !premiumDemoEnabled || demoStatus === "premium" || demoStatus === "demo_active";

  const handleOpenChat = () => {
    if (canChat) {
      openChat.mutate({ data: { otherUserId: matchUserId } });
    } else {
      setShowPaywall(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)]">
        <AppHeader />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)]">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Match non trovato</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <AppHeader />

      {/* Testata FISSA, compatta e centrata (coerente con Dettaglio Album):
          riga 1 = indietro + nome centrato + chat tondo; riga 2 = info su una riga. */}
      <div className="px-4 pt-3 pb-3 shrink-0 border-b border-border/60">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
            onClick={() => setLocation("/match")}
            aria-label="Torna ai match"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold leading-tight text-foreground text-center truncate">{detail.nickname}</h1>
          <Button
            onClick={handleOpenChat}
            disabled={openChat.isPending}
            aria-label={`Apri chat con ${detail.nickname}`}
            title={`Apri chat con ${detail.nickname}`}
            className="h-10 w-10 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-center text-sm text-foreground">
          <span className="font-black text-accent">{detail.totalExchanges}</span> scambi possibili
        </p>
      </div>

      {/* SOLO questo blocco scorre. Scambi CROSS-ALBUM: prima tutto ciò che DAI
          (per album), poi tutto ciò che RICEVI (per album). */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        {detail.totalGive === 0 && detail.totalReceive === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nessuno scambio possibile al momento.</p>
        ) : (
          <>
            <DirectionSection variant="give" label="Dai" total={detail.totalGive} groups={detail.give} />
            <DirectionSection variant="receive" label="Ricevi" total={detail.totalReceive} groups={detail.receive} />
          </>
        )}
      </div>

      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Funzione Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {demoStatus === "free" ? (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <Star className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Prova premium gratis per 24 ore</p>
                  <p className="text-sm text-muted-foreground mt-1">Attiva la demo e scrivi subito a {detail.nickname}</p>
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                  disabled={activateDemo.isPending}
                  onClick={() => activateDemo.mutate()}
                >
                  Attiva demo gratuita
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  La tua demo è scaduta. Passa a Premium per continuare a scambiare.
                </p>
                <div className="space-y-2">
                  <Button disabled className="w-full" variant="outline">Mensile — €2,99/mese</Button>
                  <Button disabled className="w-full" variant="outline">Annuale — €19,99/anno</Button>
                  <Button disabled className="w-full" variant="outline">Una tantum — €34,99</Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Pagamenti in arrivo. Contatta <a href="mailto:stickersmatchbox@hotmail.com" className="text-primary underline">stickersmatchbox@hotmail.com</a>
                </p>
              </>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setShowPaywall(false)}>
              <X className="h-4 w-4 mr-2" />
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
