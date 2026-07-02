import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useListChats,
  getListChatsQueryKey,
  useDeleteChat,
  type Chat,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { ChatRow } from "@/components/chat/ChatRow";

export function Messages() {
  const queryClient = useQueryClient();
  const listKey = getListChatsQueryKey();
  const { data: chats, isLoading } = useListChats({ query: { queryKey: listKey } });

  // Chat in attesa di conferma eliminazione (null = nessun dialog aperto).
  const [toDelete, setToDelete] = useState<number | null>(null);

  const deleteChat = useDeleteChat({
    mutation: {
      // Ottimistico: la conversazione sparisce subito dalla lista; se l'API
      // fallisce, si ripristina.
      onMutate: async (vars: { chatId: number }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const prev = queryClient.getQueryData<Chat[]>(listKey);
        queryClient.setQueryData<Chat[]>(listKey, old => old?.filter(c => c.id !== vars.chatId));
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        const prev = (ctx as { prev?: Chat[] } | undefined)?.prev;
        if (prev) queryClient.setQueryData(listKey, prev);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
    },
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
          {sorted.map(chat => (
            <ChatRow key={chat.id} chat={chat} onDelete={setToDelete} />
          ))}
        </div>
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa conversazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparirà dalla tua lista. L'altra persona continuerà a vederla finché non la elimina anche lei.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete !== null) deleteChat.mutate({ chatId: toDelete });
                setToDelete(null);
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
