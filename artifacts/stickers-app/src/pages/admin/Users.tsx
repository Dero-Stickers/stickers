import { useState, useMemo } from "react";
import { Shield, ShieldOff, Heart, Eye, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListUsers,
  useToggleBlockUser,
  useNudgeUser,
  getAdminListUsersQueryKey,
  type AdminUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { SortHeader, type SortDir } from "@/components/admin/SortHeader";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type SortKey = "nickname" | "cap" | "area";

// Formattatori riusati nel modale donazioni.
function money(amount: string | number, currency = "EUR"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}
// Data breve (senza ora) per la cella "Invito".
function nudgeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function AdminUsers() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>("nickname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // Modale dettaglio donazioni dell'utente (può averne più di una).
  const [donationsOf, setDonationsOf] = useState<AdminUser | null>(null);

  const { data: users, isLoading, isFetching, refetch } = useAdminListUsers();

  const regularUsers = useMemo(() => {
    const list = [...(users ?? [])];
    list.sort((a, b) => {
      // CAP: confronto numerico (i CAP sono codici a 5 cifre); testo per il resto.
      if (sortKey === "cap") return Number(a.cap) - Number(b.cap);
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      return va.localeCompare(vb, "it");
    });
    return sortDir === "asc" ? list : list.reverse();
  }, [users, sortKey, sortDir]);

  // Ricerca (nickname/CAP/area) + filtro rapido di stato. Si combinano tra loro.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "blocked">("all");
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regularUsers.filter(u => {
      if (statusFilter === "blocked" && !u.isBlocked) return false;
      if (!q) return true;
      return u.nickname.toLowerCase().includes(q)
        || String(u.cap).includes(q)
        || (u.area ?? "").toLowerCase().includes(q);
    });
  }, [regularUsers, search, statusFilter]);

  const toggleBlock = useToggleBlockUser({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: vars.data.isBlocked ? "Utente bloccato" : "Utente sbloccato" });
      },
    },
  });

  // Invito a donare (una tantum): l'utente lo vedrà una volta al prossimo
  // accesso. Ricarica l'elenco così lo stato ("Inviato") si aggiorna subito.
  const nudge = useNudgeUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: "Invito inviato", description: "L'utente lo vedrà al prossimo accesso." });
      },
      onError: () => toast({ title: "Invito non riuscito", variant: "destructive" }),
    },
  });

  // Aggiorna + azzera: riporta la tabella allo stato originale (ricarica dal
  // server e pulisce ricerca, filtro di stato e ordinamento).
  const resetAndRefresh = () => {
    setSearch("");
    setStatusFilter("all");
    setSortKey("nickname");
    setSortDir("asc");
    refetch();
  };

  // Clic su una colonna: se già attiva inverte la direzione, altrimenti passa a
  // quella colonna in ordine crescente.
  const handleSort = (col: SortKey) =>
    setSortKey(prev => {
      if (prev === col) { setSortDir(d => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("asc");
      return col;
    });

  // Invia (o reinvia) l'invito a donare — SEMPRE con conferma (salvaguardia
  // anti-spam; lo storico è comunque visibile nella cella stessa).
  const sendNudge = async (user: AdminUser, isResend: boolean) => {
    const ok = await confirm({
      title: isResend
        ? `Reinviare l'invito a ${user.nickname}?`
        : `Inviare l'invito a donare a ${user.nickname}?`,
      description: isResend
        ? "Lo rivedrà una volta al prossimo accesso. Usa il reinvio con parsimonia."
        : "Riceverà un gentile invito a sostenere l'app: lo vedrà una volta al prossimo accesso.",
      confirmLabel: isResend ? "Reinvia" : "Invia invito",
    });
    if (!ok) return;
    nudge.mutate({ userId: user.id });
  };

  // Cella "Invito": mostra lo STORICO (anti-spam) e l'azione giusta.
  // - utente bloccato → nessun invito (—): a un bloccato non si manda nulla;
  // - mai invitato    → pulsante "Invita";
  // - inviato, non visto → "Inviato" (data) + "Reinvia";
  // - visto           → "Visto" (data) + "Reinvia".
  const renderNudgeCell = (user: AdminUser) => {
    if (user.isBlocked) {
      return <span className="text-muted-foreground/50" title="Utente bloccato: nessun invito">—</span>;
    }
    const sentAt = user.nudgeSentAt ?? null;
    const seenAt = user.nudgeSeenAt ?? null;
    if (!sentAt) {
      return (
        <button
          type="button"
          onClick={() => sendNudge(user, false)}
          disabled={nudge.isPending}
          className="inline-flex items-center gap-1.5 text-primary text-xs font-medium hover:underline disabled:opacity-40"
          title="Invita gentilmente a donare (lo vedrà una volta al prossimo accesso)"
        >
          <Send className="h-3.5 w-3.5" />
          Invita
        </button>
      );
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        {seenAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600" title={`Visto il ${nudgeDate(seenAt)}`}>
            <Check className="h-3.5 w-3.5" />
            Visto
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={`Inviato il ${nudgeDate(sentAt)}`}>
            <Send className="h-3.5 w-3.5" />
            Inviato
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/70">{nudgeDate(seenAt ?? sentAt)}</span>
        <button
          type="button"
          onClick={() => sendNudge(user, true)}
          disabled={nudge.isPending}
          className="text-[10px] text-primary/80 hover:underline disabled:opacity-40"
        >
          Reinvia
        </button>
      </div>
    );
  };

  return (
    <AdminPage
      title="Gestione Utenti"
      subtitle="Visualizza e gestisci gli utenti registrati"
      actions={
        <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-lg">
          {isLoading ? "..." : `${filteredUsers.length} utenti`}
        </div>
      }
    >
      <AdminFilterBar<"all" | "blocked">
        search={search}
        onSearch={setSearch}
        filter={statusFilter}
        onFilter={setStatusFilter}
        onRefresh={resetAndRefresh}
        refreshing={isFetching}
        options={[
          ["all", "Tutti"],
          ["blocked", "Bloccati"],
        ]}
      />
      {/* Spaziatura coerente con Album/Messaggi: gap naturale di AdminPage tra
          barra filtri e tabella (niente margine negativo). */}
      <div className="flex-1 min-h-0 flex flex-col">
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>
              <SortHeader label="Utente" col="nickname" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th className="hidden sm:table-cell">
              <SortHeader label="CAP" col="cap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th className="hidden sm:table-cell">
              <SortHeader label="Area" col="area" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th className="hidden md:table-cell">Scambi</th>
            <th className="hidden md:table-cell">Album</th>
            <th>Donazioni</th>
            <th>Invito</th>
            <th>Azioni</th>
          </>
        }
      >
        {!isLoading && filteredUsers.length === 0 && (
          <tr>
            <td colSpan={8} className="text-center text-muted-foreground">
              <div className="py-8">
                {regularUsers.length === 0
                  ? "Nessun utente da mostrare."
                  : "Nessun risultato per la ricerca o il filtro"}
              </div>
            </td>
          </tr>
        )}
        {filteredUsers.map(user => {
          const nick = user.nickname;
          return (
            <tr key={user.id} className={user.isBlocked ? "opacity-60" : ""}>
              <td>
                <p className="font-medium text-foreground">{nick}</p>
                {user.isBlocked && <p className="text-xs text-destructive">Bloccato</p>}
              </td>
              <td className="hidden sm:table-cell text-center text-foreground">{user.cap}</td>
              <td className="hidden sm:table-cell text-center text-muted-foreground">{user.area}</td>
              <td className="hidden md:table-cell text-center text-foreground">{user.exchangesCompleted}</td>
              <td className="hidden md:table-cell text-center text-foreground">
                {user.albumCount === 0 ? (
                  <span className="text-muted-foreground/50">—</span>
                ) : user.ownedCount === 0 && user.duplicatesCount === 0 ? (
                  // Ha aggiunto album ma non ha segnato nulla (tutte mancanti).
                  <div className="flex flex-col items-center leading-tight">
                    <span className="font-medium">{user.albumCount}</span>
                    <span className="text-[11px] text-amber-600">non gestito</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="font-medium">{user.albumCount}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {user.ownedCount} mie · {user.duplicatesCount} doppie
                    </span>
                  </div>
                )}
              </td>
              <td className="text-center">
                {user.donationCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setDonationsOf(user)}
                    className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                    title="Vedi le donazioni rilevate col suo nickname"
                  >
                    {money(user.donationTotal, user.donationCurrency)}
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>
              <td className="text-center">
                {renderNudgeCell(user)}
              </td>
              <td>
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 sm:h-7 px-2 gap-1 text-xs ${user.isBlocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive/80"}`}
                    disabled={toggleBlock.isPending}
                    onClick={async () => {
                      // Solo il blocco (azione rossa) chiede conferma; lo sblocco è innocuo.
                      if (!user.isBlocked) {
                        const ok = await confirm({
                          title: `Bloccare ${user.nickname}?`,
                          description: "L'utente non potrà più accedere all'app finché non lo sblocchi.",
                          confirmLabel: "Blocca",
                          destructive: true,
                        });
                        if (!ok) return;
                      }
                      toggleBlock.mutate({ userId: user.id, data: { isBlocked: !user.isBlocked } });
                    }}
                  >
                    {user.isBlocked ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{user.isBlocked ? "Sblocca" : "Blocca"}</span>
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
      </div>

      {/* Modale donazioni dell'utente — un utente può averne PIÙ di una: qui
          l'elenco completo con data, importo e messaggio di ognuna. Il match col
          nickname è best-effort (indizio, non certo). */}
      <Dialog open={donationsOf !== null} onOpenChange={(o) => { if (!o) setDonationsOf(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 fill-accent text-accent" />
              Donazioni di {donationsOf?.nickname}
            </DialogTitle>
            <DialogDescription>
              {donationsOf && (
                <>
                  {donationsOf.donationCount} donazion{donationsOf.donationCount === 1 ? "e" : "i"} · totale{" "}
                  {money(donationsOf.donationTotal, donationsOf.donationCurrency)}. Abbinamento dal nickname:
                  è un indizio, non una certezza.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {donationsOf?.donations.map((d, i) => (
              <div key={i} className="rounded-xl border bg-muted/40 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{money(d.amount, d.currency)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</span>
                </div>
                {d.message && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">{d.message}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
