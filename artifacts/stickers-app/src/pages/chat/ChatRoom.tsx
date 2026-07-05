import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, AlertTriangle, ShieldAlert, ChevronDown, Check } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TradeConfirmDialog } from "@/components/chat/TradeConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetChatMessages,
  useSendMessage,
  useReportChat,
  useListChats,
  getGetChatMessagesQueryKey,
  getListChatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { isRealtimeAvailable } from "@/lib/supabase";

const REPORT_REASONS = [
  "Comportamento offensivo o molestie",
  "Tentativo di truffa",
  "Spam o pubblicità",
  "Contenuti inappropriati",
  "Altro",
];

export function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  // Chat PROVA: la rotta è /chat/demo{userId}. Riusa QUESTA stessa schermata,
  // ma senza toccare il backend (nessun chatId reale esiste per un demo). Le due
  // sole differenze rispetto al reale — invio messaggio e conferma scambio —
  // sono bloccate con un avviso "non attivo con i profili di prova".
  const isDemo = typeof chatId === "string" && chatId.startsWith("demo");
  const chatIdNum = isDemo ? NaN : parseInt(chatId, 10);
  // Rotta demo: /chat/demo{userId} → l'userId del profilo prova è negativo.
  const demoUserId = isDemo ? -parseInt(chatId.slice(4), 10) : 0;
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const { data: chats } = useListChats({ query: { enabled: !isDemo, queryKey: getListChatsQueryKey() } });
  const chat = chats?.find(c => c.id === chatIdNum);
  // Profili-prova: nickname fisso "Utente" (come nelle card/dettaglio).
  const otherNickname = isDemo ? "Utente" : (chat?.otherUserNickname ?? "Utente");

  const { data: realMessages, isLoading: realLoading } = useGetChatMessages(chatIdNum, {
    query: {
      // Demo: nessuna chiamata backend (chatIdNum è NaN, id inesistente).
      enabled: !isDemo,
      queryKey: getGetChatMessagesQueryKey(chatIdNum),
      // Fallback: col realtime attivo è raro (30s, solo rete di sicurezza);
      // senza realtime fa da meccanismo primario, quindi più frequente (8s).
      refetchInterval: isRealtimeAvailable() ? 30000 : 8000,
      refetchOnWindowFocus: true,
    },
  });
  // Demo: chat sempre "vuota" (estetica), nessun caricamento.
  const messages = isDemo ? [] : realMessages;
  const isLoading = isDemo ? false : realLoading;

  // Realtime: a ogni nuovo messaggio nella chat, ricarica subito dall'API.
  useRealtimeSignal(
    Number.isFinite(chatIdNum) ? `chat:${chatIdNum}` : null,
    () => queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(chatIdNum) }),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Aprendo la chat, il backend segna letti i messaggi (in getChatMessages).
  // Qui rinfreschiamo la LISTA chat così il pallino "Da leggere" e il badge
  // rosso in navbar si spengono subito, senza dover ricaricare l'app.
  useEffect(() => {
    if (!Number.isFinite(chatIdNum)) return;
    const thisChat = chats?.find(c => c.id === chatIdNum);
    if (thisChat && thisChat.unreadCount > 0 && messages) {
      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
    }
  }, [chatIdNum, chats, messages, queryClient]);

  const sendMessage = useSendMessage({
    mutation: {
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(chatIdNum) });
      },
    },
  });

  const reportChat = useReportChat({
    mutation: {
      onSuccess: () => {
        toast({ title: "Segnalazione inviata", description: "L'admin sta esaminando il caso. Grazie per la segnalazione." });
        setShowReport(false);
        setReportReason("");
        setReportNotes("");
      },
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    // Profili-prova: l'invio NON è reale → avviso, il messaggio non parte.
    if (isDemo) {
      toast({
        title: "Chat non attiva",
        description: "La chat non è attiva con i profili di prova: il messaggio non viene inviato. Con un collezionista reale, invece, potrai scrivergli davvero per accordarti sullo scambio.",
      });
      return;
    }
    sendMessage.mutate({ chatId: chatIdNum, data: { text: text.trim() } });
  };

  const submitReport = () => {
    if (!reportReason) return;
    const reason = reportNotes.trim() ? `${reportReason} — ${reportNotes.trim()}` : reportReason;
    reportChat.mutate({ chatId: chatIdNum, data: { reason, reportedUserId: chat?.otherUserId ?? 0 } });
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-hidden bg-muted/40">
        <div className="relative mx-auto flex h-full w-full max-w-md md:max-w-2xl flex-col bg-background md:shadow-xl">
          <AppHeader />
          <div className="shrink-0 px-4 py-2.5 border-b border-border/60">
            <Skeleton className="h-6 w-36 mx-auto" />
          </div>
          <div className="flex-1 px-4 py-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-muted/40">
      <div className="relative flex flex-col h-full mx-auto w-full max-w-md md:max-w-2xl bg-background md:shadow-xl">
        <AppHeader />

        {/* Sub-header: indietro + nome centrato + segnala (no avatar) */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
          <button
            onClick={() => setLocation("/messaggi")}
            aria-label="Indietro"
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-bold text-center text-foreground truncate">{otherNickname}</h1>
          <button
            onClick={() => setShowReport(true)}
            aria-label="Segnala questa chat"
            title="Segnala"
            data-guide="guide-chat-report"
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-destructive bg-destructive/10 hover:bg-destructive/15 active:scale-95 transition-transform"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>

        {/* Avviso sicurezza — comprimibile (di default una riga, si apre a tendina) */}
        <div data-guide="guide-chat-notice" className="shrink-0 bg-amber-50 border-b border-amber-200">
          <button
            type="button"
            onClick={() => setNoticeOpen(o => !o)}
            aria-expanded={noticeOpen}
            className="w-full flex items-center gap-2 px-4 py-2 text-left"
          >
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            {noticeOpen ? (
              <span className="flex-1 text-xs font-semibold text-amber-800">Avviso sicurezza</span>
            ) : (
              <span className="flex-1 text-xs text-amber-700 truncate">Per sicurezza, i messaggi sono controllati dall'admin…</span>
            )}
            <ChevronDown className={`h-4 w-4 text-amber-600 shrink-0 transition-transform ${noticeOpen ? "rotate-180" : ""}`} />
          </button>
          {noticeOpen && (
            <div className="px-4 pb-3 space-y-1.5 text-xs text-amber-700">
              <p>Per sicurezza, i messaggi possono essere verificati dall'admin.</p>
              <p>La verifica avviene solo in caso di segnalazione o necessità, per mantenere la chat sicura e corretta.</p>
              <p>Incontratevi in luoghi pubblici; per i più giovani è consigliata la presenza di un adulto.</p>
            </div>
          )}
        </div>

        {/* SOLO i messaggi scorrono */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {messages?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nessun messaggio. Inizia la conversazione!
            </div>
          )}
          {messages?.map(msg => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"}`}>
                  <p>{msg.text}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Barra input (fissa in basso) — con FAB "Scambio fatto" sopra a destra */}
        <div
          className="relative shrink-0 bg-card border-t border-border px-4 pt-3 flex items-center gap-2"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={() => setShowTrade(true)}
            aria-label="Conferma scambio concluso"
            title="Scambio fatto"
            data-guide="guide-chat-confirm"
            className="absolute right-4 -top-18 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-transform"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1"
            data-guide="guide-chat-input"
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          />
          <Button
            size="icon"
            className="bg-primary text-primary-foreground shrink-0"
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conferma scambio concluso: aggiorna solo il proprio album.
          Per i profili-prova (isDemo) NON tocca l'album: mostra l'avviso. */}
      <TradeConfirmDialog chatId={chatIdNum} isDemo={isDemo} demoUserId={demoUserId} open={showTrade} onOpenChange={setShowTrade} />

      {/* Modale segnalazione: motivo + note + conferma esplicita */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Segnala la chat
            </DialogTitle>
            <DialogDescription>
              Scegli un motivo e, se vuoi, aggiungi dettagli. La segnalazione è anonima verso l'altro utente e sarà valutata dall'amministratore.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${reportReason === r ? "border-destructive bg-destructive/10 text-destructive font-semibold" : "border-border hover:bg-muted text-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              placeholder="Aggiungi dettagli (facoltativo)…"
              rows={3}
              maxLength={500}
            />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowReport(false)}>Annulla</Button>
              <Button
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!reportReason || reportChat.isPending}
                onClick={submitReport}
              >
                {reportChat.isPending ? "Invio…" : "Invia segnalazione"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
