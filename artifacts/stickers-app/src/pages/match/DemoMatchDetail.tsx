import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { getDemoProfile, dismissDemoMatch } from "@/lib/demo-matches";

// Dettaglio di un profilo-PROVA (demo). Tutto è VETRINA: nessuna chiamata al
// backend (l'id è negativo e non esiste nel DB), la chat mostra un messaggio
// guidato, lo scambio è simulato (non tocca l'album). Serve a far capire il
// meccanismo "cosa dai / cosa ricevi / apri chat / concludi scambio".
export function DemoMatchDetail({ userId }: { userId: number }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showChat, setShowChat] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const profile = getDemoProfile(userId);
  const name = profile?.nickname ?? "Utente";

  // Rimozione SINGOLA di questo profilo-prova (persistente, non torna più),
  // poi torna alla lista match.
  const removeThis = () => {
    dismissDemoMatch(userId);
    setShowRemove(false);
    toast({ title: "Profilo di prova rimosso", description: "Non comparirà più tra i tuoi match." });
    setLocation("/match");
  };
  // Numeri dimostrativi fissi per far vedere le due direzioni dello scambio.
  const give = profile?.totalExchanges ?? 8;
  const receive = Math.max(1, Math.round(give * 0.8));

  const simulateTrade = () => {
    toast({
      title: "Così funziona lo scambio! 🎉",
      description:
        "Con un collezionista reale, qui il tuo album si aggiornerebbe da solo. Questo è solo un esempio.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader />

      {/* Testata fissa (coerente con il dettaglio match reale) */}
      <div className="px-4 pt-3 pb-3 shrink-0 border-b border-border/60">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
            onClick={() => setLocation("/match")}
            aria-label="Torna ai match"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <h1 className="text-lg font-bold leading-tight text-foreground text-center truncate">{name}</h1>
            <span className="shrink-0 rounded-full bg-accent/15 text-accent text-[10px] font-bold px-1.5 py-0.5 leading-none">
              PROVA
            </span>
          </div>
          <Button
            onClick={() => setShowChat(true)}
            aria-label={`Apri chat con ${name}`}
            className="h-10 w-10 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-center text-sm text-foreground">
          <span className="font-black text-accent">{Math.min(give, receive)}</span> scambi possibili
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        {/* Spiegazione demo */}
        <div className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Questo è un <span className="font-semibold text-accent">profilo di prova</span>, non una persona
            reale. Serve a mostrarti come si vede uno scambio e come si apre la chat. Con i collezionisti veri
            tutto funziona allo stesso modo.
          </p>
        </div>

        {/* Cosa DAI */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Tu dai</p>
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-sm text-foreground">
              <span className="font-black text-accent">{give}</span> figurine tue doppie che a{" "}
              {name.toLowerCase()} mancano.
            </p>
          </div>
        </div>

        {/* Cosa RICEVI */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Tu ricevi</p>
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-sm text-foreground">
              <span className="font-black text-accent">{receive}</span> figurine che ti mancano e{" "}
              {name.toLowerCase()} ha doppie.
            </p>
          </div>
        </div>

        {/* Pulsante scambio simulato */}
        <Button
          onClick={simulateTrade}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          Scambio fatto (prova)
        </Button>

        {/* Rimozione SINGOLA di questo profilo-prova */}
        <Button
          variant="outline"
          onClick={() => setShowRemove(true)}
          className="w-full h-11 rounded-xl bg-white text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive font-semibold gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Rimuovi questo profilo di prova
        </Button>
      </div>

      {/* Conferma rimozione singola */}
      <AlertDialog open={showRemove} onOpenChange={setShowRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere questo profilo di prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparirà dai tuoi match e non tornerà più. Gli altri profili di prova restano finché non li
              rimuovi anche loro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={removeThis}
            >
              Sì, rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat guidata (nessuna conversazione reale) */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chat con {name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-muted px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground mb-0.5">{name} (prova)</p>
              <p className="text-sm text-foreground">
                Ciao! Questo è un profilo dimostrativo. Qui chatteresti con un vero collezionista per
                metterti d'accordo sullo scambio prima di incontrarvi o spedire le figurine. 😊
              </p>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Con gli utenti reali la chat è a tutti gli effetti: messaggi, conferma dello scambio e
              aggiornamento automatico del tuo album.
            </p>
            <Button className="w-full" onClick={() => setShowChat(false)}>
              Ho capito
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
