import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { MessageCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Chat } from "@workspace/api-client-react";

// Larghezza del cassetto rosso scoperto con lo swipe verso sinistra.
const REVEAL = 80;

// Riga di una conversazione con swipe-to-delete (stile WhatsApp/iOS):
// si trascina la card verso sinistra per scoprire il cestino; il tap normale
// apre la chat. La conferma di eliminazione è gestita dal genitore (onDelete).
export function ChatRow({ chat, onDelete }: { chat: Chat; onDelete: (chatId: number) => void }) {
  const [, setLocation] = useLocation();
  const [offset, setOffset] = useState(0); // px di scorrimento (0 = chiuso, REVEAL = aperto)
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  const unread = chat.unreadCount > 0;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    dragging.current = true;
    moved.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    // Solo swipe orizzontale a sinistra; clamp tra 0 e REVEAL.
    const next = Math.min(REVEAL, Math.max(0, startOffset.current - dx));
    setOffset(next);
  };

  const onTouchEnd = () => {
    dragging.current = false;
    // Snap: oltre metà resta aperto, altrimenti si richiude.
    setOffset(offset > REVEAL / 2 ? REVEAL : 0);
  };

  const openChat = () => {
    // Se ho appena fatto swipe (o il cassetto è aperto) il tap non naviga:
    // prima richiude, così non si apre la chat per sbaglio.
    if (moved.current || offset > 0) {
      setOffset(0);
      return;
    }
    setLocation(`/chat/${chat.id}`);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Cassetto: cestino rosso sotto la card, scoperto scorrendo a sinistra. */}
      <button
        type="button"
        aria-label="Elimina conversazione"
        onClick={() => onDelete(chat.id)}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground"
        style={{ width: REVEAL }}
      >
        <Trash2 className="h-5 w-5" />
      </button>

      {/* Card scorrevole sopra il cassetto. */}
      <div
        style={{ transform: `translateX(-${offset}px)`, transition: dragging.current ? "none" : "transform 0.2s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={openChat}
      >
        <Card className="shadow-sm cursor-pointer transition-colors hover:border-primary">
          <CardContent className="p-3 flex items-center gap-1">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <MessageCircle className={`h-5 w-5 ${unread ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-sm truncate flex-1 ${unread ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
              {chat.otherUserNickname}
            </p>
            {unread && (
              <span className="shrink-0 text-[11px] font-semibold text-green-600">
                Nuovi messaggi
              </span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
