import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, Flag, ShieldAlert } from "lucide-react";
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

export function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const chatIdNum = parseInt(chatId, 10);
  const [, setLocation] = useLocation();
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
      refetchInterval: 5000,
    },
  });

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
        toast({ title: "Segnalazione inviata", description: "Il team di moderazione verificherà la chat al più presto." });
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
      <div className="flex flex-col min-h-[100dvh] bg-sidebar">
        <div className="px-4 pt-12 pb-4">
          <Skeleton className="h-8 w-36 bg-white/10" />
        </div>
        <div className="flex-1 bg-background px-4 py-4 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/match")} className="text-sidebar-foreground/70">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-sm uppercase">
              {otherNickname.slice(0, 2)}
            </div>
            <span className="font-semibold">{otherNickname}</span>
          </div>
          <button onClick={handleReport} className="text-sidebar-foreground/70 p-1">
            <Flag className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 flex-shrink-0">
        <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Per sicurezza e moderazione, i messaggi possono essere verificati dall'admin in caso di necessità o segnalazione.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background pb-20">
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

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 flex items-center gap-2 pb-safe">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1"
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
        />
        <Button
          size="icon"
          className="bg-primary text-primary-foreground flex-shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
