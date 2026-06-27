import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, AlertTriangle, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useGetChatMessages,
  useSendMessage,
  useReportChat,
  useListChats,
  getGetChatMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { isRealtimeAvailable } from "@/lib/supabase";

export function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const chatIdNum = parseInt(chatId, 10);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const { data: chats } = useListChats();
  const chat = chats?.find(c => c.id === chatIdNum);
  const otherNickname = chat?.otherUserNickname ?? "Utente";

  const { data: messages, isLoading } = useGetChatMessages(chatIdNum, {
    query: {
      queryKey: getGetChatMessagesQueryKey(chatIdNum),
      // Fallback: col realtime attivo è raro (30s, solo rete di sicurezza);
      // senza realtime fa da meccanismo primario, quindi più frequente (8s).
      refetchInterval: isRealtimeAvailable() ? 30000 : 8000,
      refetchOnWindowFocus: true,
    },
  });

  // Realtime: a ogni nuovo messaggio nella chat, ricarica subito dall'API.
  useRealtimeSignal(
    Number.isFinite(chatIdNum) ? `chat:${chatIdNum}` : null,
    () => queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(chatIdNum) }),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        toast({ title: "Segnalazione inviata", description: "Il team di moderazione verificherà la chat al più presto.", duration: 3000 });
      },
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ chatId: chatIdNum, data: { text: text.trim() } });
  };

  const handleReport = () => {
    reportChat.mutate({ chatId: chatIdNum, data: { reason: "Segnalazione utente", reportedUserId: chat?.otherUserId ?? 0 } });
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-muted/40">
        <div className="relative mx-auto flex h-[100dvh] w-full max-w-md md:max-w-2xl flex-col bg-background md:shadow-xl">
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
    <div className="h-dvh overflow-hidden bg-muted/40">
      <div className="relative flex flex-col h-dvh mx-auto w-full max-w-md md:max-w-2xl bg-background md:shadow-xl">
        <AppHeader />

        {/* Sub-header: indietro + nome centrato + segnala (no avatar) */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
          <button
            onClick={() => window.history.back()}
            aria-label="Indietro"
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-bold text-center text-foreground truncate">{otherNickname}</h1>
          <button
            onClick={handleReport}
            aria-label="Segnala questa chat"
            title="Segnala"
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-destructive bg-destructive/10 hover:bg-destructive/15 active:scale-95 transition-transform"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>

        {/* Avviso sicurezza / moderazione (fisso) */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Per sicurezza e moderazione, i messaggi possono essere verificati dall'admin in caso di necessità o segnalazione.
            {" "}Si consiglia di incontrarsi in luoghi pubblici e, per i più giovani, in compagnia di un adulto.
          </p>
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

        {/* Barra input (fissa in basso) */}
        <div
          className="shrink-0 bg-card border-t border-border px-4 pt-3 flex items-center gap-2"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1"
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
    </div>
  );
}
