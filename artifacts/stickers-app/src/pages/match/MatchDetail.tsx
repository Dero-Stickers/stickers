import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, MessageCircle, X, Lock, Unlock, ChevronDown, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { useSupportEmail } from "@/hooks/useSupportEmail";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetMatchDetail,
  useOpenChat,
  useBillingCheckout,
  useListAlbums,
  getGetMatchDetailQueryKey,
  getListAlbumsQueryKey,
} from "@workspace/api-client-react";
import { TRADE_DIRECTION } from "@/lib/trade-labels";
import { isDemoUserId, buildDemoDetail, dismissDemoMatch } from "@/lib/demo-matches";

type MatchGroup = { albumId: number; albumTitle: string; stickers: { id: number; number: number; code?: string }[] };

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
  total,
  groups,
}: {
  variant: "give" | "receive";
  total: number;
  groups: MatchGroup[];
}) {
  const give = variant === "give";
  const label = TRADE_DIRECTION[variant]; // "Dai" / "Ricevi" — fonte unica
  const tone = give
    ? { label: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-100 text-emerald-700" }
    : { label: "text-sky-700", chip: "bg-sky-50 text-sky-700", badge: "bg-sky-100 text-sky-700" };

  // Album sempre CHIUSI all'apertura della pagina: l'utente li espande al tap.
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
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
                          {s.code || s.number}
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
  return <MatchDetailInner matchUserId={matchUserId} />;
}

// Dettaglio match: STESSO componente/layout/PERCORSO per utenti reali e profili
// PROVA. I demo (userId<0) NON toccano il backend: l'hook dati è disabilitato e
// il `detail` è costruito lato client da album reali del catalogo (figurine di
// esempio). Il percorso è IDENTICO al reale: si apre la chat (bottone tondo),
// dentro la chat c'è il bottone verde "Scambio fatto". Le uniche due differenze
// (invio messaggio e conferma scambio bloccati con avviso) vivono DENTRO la
// chat prova, non qui. Per i demo la chat si apre su una rotta /chat/demo{id}
// che riusa lo stesso ChatRoom senza chiamare il backend.
function MatchDetailInner({ matchUserId }: { matchUserId: number }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const supportEmail = useSupportEmail();
  const { currentUser } = useAuth();
  const isDemo = isDemoUserId(matchUserId);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showRemoveDemo, setShowRemoveDemo] = useState(false);

  // Elimina QUESTO profilo-prova per l'utente corrente (solo frontend, in
  // localStorage) e torna alla lista match. Non tocca il DB: i demo non esistono.
  const handleRemoveDemo = () => {
    dismissDemoMatch(currentUser?.id, matchUserId);
    toast({ title: "Profilo di prova eliminato", description: "Questo profilo di prova non comparirà più tra i tuoi match." });
    setLocation("/match");
  };

  // Dati reali: solo per utenti veri (per i demo l'hook è disabilitato → nessuna
  // chiamata GET /api/matches/:id, che con id negativo fallirebbe).
  const { data: realDetail, isLoading: realLoading } = useGetMatchDetail(matchUserId, {
    query: { enabled: !isDemo, queryKey: getGetMatchDetailQueryKey(matchUserId) },
  });
  // Album del catalogo: servono ai demo per le figurine di esempio (per gli
  // utenti reali il dettaglio arriva già dal backend, quindi non serve).
  const { data: albums } = useListAlbums({ query: { enabled: isDemo, queryKey: getListAlbumsQueryKey() } });

  const detail = isDemo ? buildDemoDetail(matchUserId, null, albums) : realDetail;
  const isLoading = isDemo ? false : realLoading;

  const openChat = useOpenChat({
    mutation: {
      onSuccess: (chat) => {
        setLocation(`/chat/${chat.id}`);
      },
      onError: (err: any) => {
        // Il backend risponde 403 PREMIUM_REQUIRED se la chat è a pagamento e
        // non ancora sbloccata → mostra il paywall (due opzioni di acquisto).
        if (err?.status === 403 || err?.data?.error === "PREMIUM_REQUIRED") {
          setShowPaywall(true);
        } else {
          toast({ title: "Errore", description: "Impossibile aprire la chat", variant: "destructive" });
        }
      },
    },
  });

  // Checkout: per ora è uno STUB lato server ({ status: 'not_configured' }).
  // NON sblocca nulla dal client: mostra solo un avviso "pagamenti in arrivo".
  const checkout = useBillingCheckout({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Pagamenti in arrivo",
          description: "Lo sblocco delle chat non è ancora attivo. Torna presto!",
        });
        setShowPaywall(false);
      },
      onError: () => {
        toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" });
      },
    },
  });

  const handleOpenChat = () => {
    // Profili-prova: apre la STESSA schermata chat, ma su una rotta demo che non
    // tocca il backend (ChatRoom la riconosce dal prefisso "demo"). Il percorso
    // è identico al reale; l'invio messaggio e lo scambio sono bloccati là.
    if (isDemo) {
      setLocation(`/chat/demo${Math.abs(matchUserId)}`);
      return;
    }
    // chatUnlocked = true se l'utente può già aprire la chat (premium/all,
    // sblocco coppia, oppure paywall spento). Se non sbloccata, tentiamo
    // comunque l'apertura: il gate vero è lato server (403 → paywall).
    if (detail?.chatUnlocked) {
      openChat.mutate({ data: { otherUserId: matchUserId } });
    } else if (detail?.chatUnlocked === false) {
      setShowPaywall(true);
    } else {
      openChat.mutate({ data: { otherUserId: matchUserId } });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
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
      <div className="flex flex-col h-full">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Match non trovato</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
            data-guide="guide-chat-button"
            className="h-10 w-10 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
          >
            <MessageCircle className="h-5 w-5" />
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
          // Wrapper con anchor per la guida interattiva (passo "Dai e Ricevi").
          <div data-guide="guide-trade-sections" className="space-y-4">
            <DirectionSection variant="give" total={detail.totalGive} groups={detail.give} />
            <DirectionSection variant="receive" total={detail.totalReceive} groups={detail.receive} />
          </div>
        )}
      </div>

      {/* Solo per i profili-PROVA: pulsante FISSO in fondo (sopra la nav bar),
          fuori dallo scroll → sempre raggiungibile. Elimina questo profilo
          dimostrativo dai propri match (frontend, con conferma). Non tocca il DB. */}
      {isDemo && (
        <div
          className="shrink-0 bg-background px-4 pt-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Button
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold gap-2"
            onClick={() => setShowRemoveDemo(true)}
          >
            <Trash2 className="h-4 w-4" />
            Elimina profilo di prova
          </Button>
        </div>
      )}

      {/* Conferma eliminazione profilo-prova */}
      <AlertDialog open={showRemoveDemo} onOpenChange={setShowRemoveDemo}>
        <AlertDialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-3xl border-0">
          <AlertDialogHeader className="sm:text-center items-center">
            <div className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Eliminare il profilo di prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Questo profilo dimostrativo non comparirà più tra i tuoi match. Serve solo a mostrarti come funziona l'app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="w-full rounded-xl mt-0">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveDemo}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sblocca la chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <Lock className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="font-semibold text-foreground">Scrivi a {detail.nickname}</p>
              <p className="text-sm text-muted-foreground mt-1">
                L'app è gratis: paghi solo per aprire la chat di un match.
              </p>
            </div>
            <div className="space-y-2">
              {/* Sblocca SOLO questa chat (acquisto 'single', coppia con questo utente) */}
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold gap-2"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate({ data: { kind: "single", otherUserId: matchUserId } })}
              >
                <MessageCircle className="h-4 w-4" />
                Sblocca questa chat
              </Button>
              {/* Sblocca TUTTE le chat (acquisto 'all') */}
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate({ data: { kind: "all" } })}
              >
                <Unlock className="h-4 w-4" />
                Sblocca tutte le chat
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Pagamenti in arrivo. Per info: <a href={`mailto:${supportEmail}`} className="text-primary underline">{supportEmail}</a>
            </p>
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
