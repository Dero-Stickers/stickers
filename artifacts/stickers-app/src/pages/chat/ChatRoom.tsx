import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { mockChats } from "@/mock/chats";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, Flag, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const chat = mockChats.find(c => c.id === parseInt(chatId, 10));
  const otherUserId = chat?.participants.find(p => p !== (currentUser?.id ?? 1));
  const otherNickname = chat?.participantNames[otherUserId ?? 0] ?? "Utente";

  const [messages, setMessages] = useState(chat?.messages ?? []);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    const newMsg = {
      id: Date.now(),
      chatId: chat?.id ?? parseInt(chatId, 10),
      senderId: currentUser?.id ?? 1,
      senderNickname: currentUser?.nickname ?? "Tu",
      text: text.trim(),
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setText("");
  };

  const handleReport = () => {
    toast({ title: "Segnalazione inviata", description: "Il team di moderazione verificherà la chat al più presto." });
  };

  if (!chat) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Chat non trovata</p>
          <Button variant="outline" size="sm" onClick={() => setLocation("/match")}>Torna ai match</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
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

      {/* Moderation notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 flex-shrink-0">
        <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Per sicurezza e moderazione, i messaggi possono essere verificati dall'admin in caso di necessità o segnalazione.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background pb-20">
        {messages.map(msg => {
          const isMe = msg.senderId === (currentUser?.id ?? 1);
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"}`}>
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.sentAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
