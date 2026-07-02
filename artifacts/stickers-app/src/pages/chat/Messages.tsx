import { useMemo } from "react";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useListChats, getListChatsQueryKey } from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";

export function Messages() {
  const { data: chats, isLoading } = useListChats({
    query: { queryKey: getListChatsQueryKey() },
  });

  // Non lette in cima, poi per messaggio più recente. Ordine stabile e naturale.
  const sorted = useMemo(
    () =>
      [...(chats ?? [])].sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      }),
    [chats],
  );

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-3 text-center shrink-0">
        <h1 className="text-base font-bold text-foreground">Messaggi</h1>
        <p className="text-muted-foreground text-xs">Le tue conversazioni</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 min-h-0">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessuna conversazione</p>
            <p className="text-sm mt-1">Trova un match e inizia a scambiare</p>
          </div>
        )}

        <div className="space-y-2">
          {sorted.map(chat => {
            const unread = chat.unreadCount > 0;
            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <Card className="shadow-sm cursor-pointer transition-colors hover:border-primary">
                  <CardContent className="p-3 flex items-center gap-1">
                    {/* Contenitore icona alto 40px: fissa l'altezza della card
                        esattamente come l'originale (che aveva un cerchietto 40px),
                        ma senza sfondo/contorno. */}
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
