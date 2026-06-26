import { useState } from "react";
import { MessageSquare, Eye, X, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListChats,
  useAdminGetChatMessages,
  useCloseChat,
  getAdminListChatsQueryKey,
} from "@workspace/api-client-react";
import type { AdminChat } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";

function ChatMessages({ chatId }: { chatId: number }) {
  const { data: messages, isLoading } = useAdminGetChatMessages(chatId);
  if (isLoading) return <div className="p-4"><Skeleton className="h-16 rounded" /></div>;
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {messages?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun messaggio</p>}
      {messages?.map(msg => (
        <div key={msg.id} className="flex gap-2">
          <span className="text-xs font-semibold text-primary shrink-0 w-24 truncate">{msg.senderNickname}:</span>
          <span className="text-xs text-foreground flex-1">{msg.text}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<AdminChat | null>(null);

  const { data: chats, isLoading } = useAdminListChats();

  const closeChat = useCloseChat({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListChatsQueryKey() });
        toast({ title: "Chat chiusa", description: "Gli utenti non potranno più scrivere in questa chat." });
      },
    },
  });

  return (
    <AdminPage title="Gestione Messaggi" subtitle="Monitora le chat tra utenti">
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>Partecipanti</th>
            <th className="hidden md:table-cell">Messaggi</th>
            <th>Stato</th>
            <th>Azioni</th>
          </>
        }
      >
        {(chats ?? []).map(chat => (
          <tr key={chat.id}>
            <td>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground font-medium">
                  {chat.user1Nickname} — {chat.user2Nickname}
                </span>
                {chat.hasReport && <Flag className="h-3.5 w-3.5 text-destructive shrink-0" />}
              </div>
            </td>
            <td className="hidden md:table-cell text-center text-foreground">{chat.messageCount}</td>
            <td className="text-center">
              {chat.hasReport ? (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">Segnalata</Badge>
              ) : chat.status === "closed" ? (
                <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Chiusa</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">Attiva</Badge>
              )}
            </td>
            <td>
              <div className="flex items-center justify-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setSelectedChat(chat)}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vedi</span>
                </Button>
                {chat.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive/80"
                    disabled={closeChat.isPending}
                    onClick={() => closeChat.mutate({ chatId: chat.id })}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chiudi</span>
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {(chats?.length ?? 0) === 0 && (
          <tr>
            <td colSpan={4} className="text-center text-muted-foreground">
              <div className="py-8">Nessuna chat trovata</div>
            </td>
          </tr>
        )}
      </AdminTable>

      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Chat: {selectedChat?.user1Nickname} — {selectedChat?.user2Nickname}
            </DialogTitle>
          </DialogHeader>
          {selectedChat && <ChatMessages chatId={selectedChat.id} />}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
