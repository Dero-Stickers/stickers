import { useState, useMemo } from "react";
import { MessageCircle, Eye, X, Flag, AlertTriangle, Ban, RotateCcw, CheckCircle2, Copy } from "lucide-react";
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
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { SortHeader, type SortDir } from "@/components/admin/SortHeader";
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
  const [copying, setCopying] = useState(false);

  const { data: chats, isLoading, isFetching } = useAdminListChats();

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

  // Aggiorna + azzera: ricarica le chat e pulisce ricerca e filtro di stato.
  const resetAndRefresh = () => {
    setSearch("");
    setStatusFilter("all");
    refreshChats();
  };

  const closeChat = useCloseChat({
    mutation: {
      onSuccess: () => {
        refreshChats();
        toast({ title: "Chat chiusa", description: "Gli utenti non potranno più scrivere in questa chat." });
      },
    },
  });

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

  // Copia TUTTE le chat visibili in un formato ottimizzato per l'analisi con un
  // AI (ChatGPT/Claude): riepilogo in testa + conversazione completa di ogni
  // chat (scaricata al volo). Le segnalate vengono in cima col motivo, così la
  // moderazione ha subito ciò che conta. Date leggibili, niente rumore tecnico.
  const copyAll = async () => {
    if (!filteredChats.length) {
      toast({ title: "Nessuna chat da copiare" });
      return;
    }
    setCopying(true);
    try {
      const hhmm = (iso?: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
      };

      // Segnalate prima, poi per numero messaggi decrescente.
      const ordered = [...filteredChats].sort((a, b) => {
        if (a.hasReport !== b.hasReport) return a.hasReport ? -1 : 1;
        return b.messageCount - a.messageCount;
      });

      // Scarica i messaggi di ogni chat (endpoint admin).
      const withMessages = await Promise.all(
        ordered.map(async (c) => {
          try {
            const res = await fetch(`/api/admin/chats/${c.id}/messages`, { headers: authHeaders() });
            const msgs = res.ok ? await res.json() : [];
            return { chat: c, msgs: msgs as { senderNickname: string; text: string; createdAt: string }[] };
          } catch {
            return { chat: c, msgs: [] as { senderNickname: string; text: string; createdAt: string }[] };
          }
        }),
      );

      const reported = filteredChats.filter((c) => c.hasReport).length;
      const closed = filteredChats.filter((c) => c.status === "closed").length;
      const header = [
        `# CHAT UTENTI — STICKER (moderazione)`,
        `Export: ${new Date().toLocaleString("it-IT")}`,
        `${filteredChats.length} chat` +
          `${statusFilter !== "all" ? ` (filtro: ${statusFilter})` : ""}` +
          `${search.trim() ? ` (ricerca: "${search.trim()}")` : ""}` +
          `  ·  ${reported} segnalate  ·  ${closed} chiuse`,
        ``,
        `Chat segnalate in cima. Ogni voce: partecipanti, stato, motivo (se segnalata) e conversazione completa.`,
        `====================================================`,
      ].join("\n");

      const blocks = withMessages.map(({ chat, msgs }, i) => {
        const tag = chat.hasReport ? "⚠️ SEGNALATA" : chat.status === "closed" ? "CHIUSA" : "ATTIVA";
        const head = [
          `## ${i + 1}. [${tag}] ${chat.user1Nickname} ↔ ${chat.user2Nickname}`,
          `Messaggi: ${chat.messageCount}${chat.hasReport && chat.reportReason ? `  ·  Motivo segnalazione: ${chat.reportReason}` : ""}`,
        ];
        const convo = msgs.length
          ? msgs.map((m) => `  [${hhmm(m.createdAt)}] ${m.senderNickname}: ${m.text}`).join("\n")
          : "  (nessun messaggio)";
        return `${head.join("\n")}\nConversazione:\n${convo}`;
      });

      const text = `${header}\n\n${blocks.join("\n\n──────────\n\n")}\n`;

      // La clipboard può fallire se il "gesto utente" è scaduto dopo le fetch
      // (Safari/iOS): provo la Clipboard API, poi execCommand, infine apro il
      // testo in una nuova finestra da cui copiare a mano. Mai fallire in silenzio.
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch { copied = false; }
      }

      if (copied) {
        toast({
          title: "Chat copiate",
          description: `${filteredChats.length} conversazioni negli appunti, pronte per l'analisi AI.`,
        });
      } else {
        const w = window.open("", "_blank");
        if (w) {
          const safe = text.replace(/[<&>]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);
          w.document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:1rem">${safe}</pre>`);
          toast({ title: "Testo pronto", description: "Copialo dalla nuova scheda aperta." });
        } else {
          toast({ title: "Copia non riuscita", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Copia non riuscita", variant: "destructive" });
    } finally {
      setCopying(false);
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
        filter={statusFilter}
        onFilter={setStatusFilter}
        onRefresh={resetAndRefresh}
        refreshing={isFetching}
        options={[
          ["all", "Tutte"],
          ["active", "Attive"],
          ["closed", "Chiuse"],
          ["reported", "Segnalate"],
        ]}
        extra={
          <button
            onClick={copyAll}
            disabled={copying || !filteredChats.length}
            aria-label="Copia tutte le chat"
            className="ml-auto shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" />
            {copying ? "Copio…" : "Copia tutte le chat"}
          </button>
        }
      />
      <div className="flex-1 min-h-0 flex flex-col">
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
                <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
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
              <p className="text-xs font-semibold text-muted-foreground text-center">Azioni di moderazione</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
