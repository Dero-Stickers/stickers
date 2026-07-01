import { useState, useMemo } from "react";
import { MessageSquare, Eye, X, Flag, AlertTriangle, Trash2, Ban, RotateCcw, CheckCircle2 } from "lucide-react";
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
import { SortHeader, type SortDir } from "@/components/admin/SortHeader";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { authHeaders } from "@/pages/admin/errors/types";

// Il backend restituisce anche gli id dei partecipanti (per il blocco utente),
// non ancora nel type generato AdminChat: li leggiamo con questa estensione.
type AdminChatExt = AdminChat & { user1Id?: number; user2Id?: number };

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
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<AdminChatExt | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: chats, isLoading } = useAdminListChats();

  // Ordinamento colonne (Partecipanti / Messaggi) — default: ordine originale.
  const [sortKey, setSortKey] = useState<"participants" | "messageCount" | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const handleSort = (col: "participants" | "messageCount") =>
    setSortKey(prev => {
      if (prev === col) { setSortDir(d => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("asc");
      return col;
    });
  const sortedChats = useMemo(() => {
    const list = [...(chats ?? [])];
    if (!sortKey) return list;
    list.sort((a, b) => sortKey === "messageCount"
      ? a.messageCount - b.messageCount
      : (a.user1Nickname ?? "").toLowerCase().localeCompare((b.user1Nickname ?? "").toLowerCase(), "it"));
    return sortDir === "asc" ? list : list.reverse();
  }, [chats, sortKey, sortDir]);

  // Ricerca minimale: per nickname di un partecipante + filtro rapido di stato.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed" | "reported">("all");
  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedChats.filter(c => {
      if (statusFilter === "reported" && !c.hasReport) return false;
      if (statusFilter === "active" && c.status !== "active") return false;
      if (statusFilter === "closed" && c.status !== "closed") return false;
      if (!q) return true;
      return (c.user1Nickname ?? "").toLowerCase().includes(q)
        || (c.user2Nickname ?? "").toLowerCase().includes(q);
    });
  }, [sortedChats, search, statusFilter]);

  const refreshChats = () =>
    queryClient.invalidateQueries({ queryKey: getAdminListChatsQueryKey() });

  const closeChat = useCloseChat({
    mutation: {
      onSuccess: () => {
        refreshChats();
        toast({ title: "Chat chiusa", description: "Gli utenti non potranno più scrivere in questa chat." });
      },
    },
  });

  // Elimina definitivamente la chat (e i suoi messaggi). Azione irreversibile.
  const deleteChat = async (chat: AdminChatExt) => {
    const ok = await confirm({
      title: "Eliminare la chat?",
      description: `Chat tra ${chat.user1Nickname} e ${chat.user2Nickname}. I messaggi saranno cancellati. L'azione è definitiva e non reversibile.`,
      confirmLabel: "Elimina",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/chats/${chat.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSelectedChat(null);
      refreshChats();
      toast({ title: "Chat eliminata", description: "La chat e i suoi messaggi sono stati rimossi." });
    } catch {
      toast({ title: "Errore", description: "Eliminazione non riuscita.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Riapre una chat chiusa (rimette lo stato "attiva"): rende "Chiudi" reversibile.
  const reopenChat = async (chatId: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/chats/${chatId}/reopen`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error();
      refreshChats();
      toast({ title: "Chat riaperta", description: "Gli utenti possono di nuovo scrivere." });
    } catch {
      toast({ title: "Errore", description: "Riapertura non riuscita.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Segna come gestita la segnalazione della chat (status pending → resolved):
  // conserva lo storico ma toglie l'utente dallo stato "sotto revisione".
  const resolveReport = async (chat: AdminChatExt) => {
    const ok = await confirm({
      title: "Segnare come gestita?",
      description: "La segnalazione verrà archiviata e l'avviso \"sotto revisione\" sparirà per gli utenti coinvolti. Lo storico resta consultabile. Se serve, puoi comunque bloccare un utente.",
      confirmLabel: "Segna come gestita",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/chats/${chat.id}/resolve-report`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSelectedChat(null);
      refreshChats();
      toast({ title: "Segnalazione gestita", description: "L'avviso \"sotto revisione\" è stato rimosso." });
    } catch {
      toast({ title: "Errore", description: "Operazione non riuscita.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Blocca un partecipante (riusa l'endpoint utenti). Il bloccato non potrà più accedere.
  const blockUser = async (userId: number | undefined, nickname: string) => {
    if (!userId) { toast({ title: "Utente non disponibile", variant: "destructive" }); return; }
    const ok = await confirm({
      title: `Bloccare ${nickname}?`,
      description: "L'utente non potrà più accedere all'app finché non lo sblocchi dalla sezione Utenti.",
      confirmLabel: "Blocca",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ isBlocked: true }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Utente bloccato", description: `${nickname} è stato bloccato.` });
    } catch {
      toast({ title: "Errore", description: "Blocco non riuscito.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage title="Gestione Messaggi" subtitle="Monitora le chat tra utenti">
      <AdminFilterBar<"all" | "active" | "closed" | "reported">
        search={search}
        onSearch={setSearch}
        placeholder="Cerca un partecipante…"
        filter={statusFilter}
        onFilter={setStatusFilter}
        options={[
          ["all", "Tutte"],
          ["active", "Attive"],
          ["closed", "Chiuse"],
          ["reported", "Segnalate"],
        ]}
      />
      {/* -mt riassorbe il gap del contenitore AdminPage: barra filtri attaccata alla tabella. */}
      <div className="-mt-4 md:-mt-6 flex-1 min-h-0 flex flex-col">
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>
              <SortHeader label="Partecipanti" col="participants" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th className="hidden md:table-cell">
              <SortHeader label="Messaggi" col="messageCount" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th>Stato</th>
            <th>Azioni</th>
          </>
        }
      >
        {filteredChats.map(chat => (
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
                <div className="flex flex-col items-center gap-0.5">
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">Segnalata</Badge>
                  {chat.reportReason && (
                    <span className="text-[10px] text-muted-foreground max-w-[140px] truncate" title={chat.reportReason}>
                      {chat.reportReason}
                    </span>
                  )}
                </div>
              ) : chat.status === "closed" ? (
                <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Chiusa</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">Attiva</Badge>
              )}
            </td>
            <td>
              <div className="flex items-center justify-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setSelectedChat(chat as AdminChatExt)}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vedi</span>
                </Button>
                {chat.status !== "closed" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive/80"
                    disabled={closeChat.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Chiudere la chat?",
                        description: `Chat tra ${chat.user1Nickname} e ${chat.user2Nickname}. I due utenti non potranno più scriversi qui. I messaggi restano visibili e potrai riaprirla in qualsiasi momento.`,
                        confirmLabel: "Chiudi chat",
                      });
                      if (ok) closeChat.mutate({ chatId: chat.id });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chiudi</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-green-600 hover:text-green-700"
                    disabled={busy}
                    onClick={() => reopenChat(chat.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Riapri</span>
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {!isLoading && filteredChats.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center text-muted-foreground">
              <div className="py-8">
                {(chats?.length ?? 0) === 0
                  ? "Nessuna chat trovata"
                  : "Nessun risultato per la ricerca o il filtro"}
              </div>
            </td>
          </tr>
        )}
      </AdminTable>
      </div>

      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Chat: {selectedChat?.user1Nickname} — {selectedChat?.user2Nickname}
            </DialogTitle>
          </DialogHeader>
          {selectedChat?.hasReport && selectedChat.reportReason && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-destructive">Motivo segnalazione</p>
                <p className="text-sm text-foreground wrap-break-word">{selectedChat.reportReason}</p>
              </div>
            </div>
          )}
          {selectedChat && <ChatMessages chatId={selectedChat.id} />}

          {selectedChat && (
            <div className="border-t border-border pt-3 mt-1 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Azioni di moderazione</p>
              {selectedChat.hasReport && (
                <Button
                  size="sm" variant="outline" disabled={busy}
                  className="w-full h-9 gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => resolveReport(selectedChat)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Segna come gestita
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm" variant="outline" disabled={busy}
                  className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => blockUser(selectedChat.user1Id, selectedChat.user1Nickname)}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Blocca {selectedChat.user1Nickname}
                </Button>
                <Button
                  size="sm" variant="outline" disabled={busy}
                  className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => blockUser(selectedChat.user2Id, selectedChat.user2Nickname)}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Blocca {selectedChat.user2Nickname}
                </Button>
              </div>
              <Button
                size="sm" variant="destructive" disabled={busy}
                className="w-full h-9 gap-1.5 text-xs"
                onClick={() => deleteChat(selectedChat)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Elimina chat
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
