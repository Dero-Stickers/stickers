import { useState } from "react";
import { mockChats } from "@/mock/chats";
import { mockUsers } from "@/mock/users";
import { MessageSquare, Eye, X, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function AdminMessages() {
  const { toast } = useToast();
  const [chats, setChats] = useState(mockChats);
  const [selectedChat, setSelectedChat] = useState<typeof mockChats[0] | null>(null);
  const [closedIds, setClosedIds] = useState<Set<number>>(new Set());

  const handleClose = (id: number) => {
    setClosedIds(prev => new Set([...prev, id]));
    toast({ title: "Chat chiusa", description: "Gli utenti non potranno più scrivere in questa chat." });
  };

  const getNickname = (userId: number) => mockUsers.find(u => u.id === userId)?.nickname ?? `Utente ${userId}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestione Messaggi</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Monitora le chat tra utenti</p>
      </div>

      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Partecipanti</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Messaggi</th>
                <th className="text-left px-4 py-3 font-medium">Stato</th>
                <th className="text-right px-4 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((chat, i) => {
                const isClosed = closedIds.has(chat.id);
                const hasReport = chat.hasReport;
                return (
                  <tr key={chat.id} className={`${i < chats.length - 1 ? "border-b border-border/50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground font-medium">
                          {chat.participants.map(p => getNickname(p)).join(" — ")}
                        </span>
                        {hasReport && <Flag className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-foreground">{chat.messages.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      {hasReport ? (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">Segnalata</Badge>
                      ) : isClosed ? (
                        <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Chiusa</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Attiva</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setSelectedChat(chat)}>
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Vedi</span>
                        </Button>
                        {!isClosed && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive/80" onClick={() => handleClose(chat.id)}>
                            <X className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Chiudi</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Chat: {selectedChat?.participants.map(p => getNickname(p)).join(" — ")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {selectedChat?.messages.map(msg => (
              <div key={msg.id} className="flex gap-2">
                <span className="text-xs font-semibold text-primary flex-shrink-0 w-24 truncate">{getNickname(msg.senderId)}:</span>
                <span className="text-xs text-foreground flex-1">{msg.text}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
