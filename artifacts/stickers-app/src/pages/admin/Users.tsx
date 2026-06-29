import { useState, useMemo } from "react";
import { Shield, ShieldOff, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListUsers,
  useToggleBlockUser,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { ChatAccessBadge, classifyAccess } from "@/components/admin/ChatAccessBadge";

type SortDir = "asc" | "desc";

export function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: users, isLoading } = useAdminListUsers();

  const regularUsers = useMemo(() => {
    const list = users ?? [];
    const sorted = [...list].sort((a, b) =>
      a.nickname.toLowerCase().localeCompare(b.nickname.toLowerCase(), "it"),
    );
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [users, sortDir]);

  const toggleBlock = useToggleBlockUser({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: vars.data.isBlocked ? "Utente bloccato" : "Utente sbloccato" });
      },
    },
  });

  const toggleSort = () => setSortDir(d => (d === "asc" ? "desc" : "asc"));
  const SortIcon = sortDir === "asc" ? ArrowDownAZ : ArrowUpAZ;

  return (
    <AdminPage
      title="Gestione Utenti"
      subtitle="Visualizza e gestisci gli utenti registrati"
      actions={
        <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-lg">
          {isLoading ? "..." : `${regularUsers.length} utenti`}
        </div>
      }
    >
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>
              <button
                type="button"
                onClick={toggleSort}
                className="inline-flex items-center gap-1.5 mx-auto hover:text-foreground transition-colors uppercase tracking-wide"
                aria-label={`Ordina utenti ${sortDir === "asc" ? "Z-A" : "A-Z"}`}
                title={sortDir === "asc" ? "Ordinato A → Z (clicca per Z → A)" : "Ordinato Z → A (clicca per A → Z)"}
                data-testid="sort-users-nickname"
              >
                Utente
                <SortIcon className="h-3.5 w-3.5" />
                <span className="font-semibold text-[10px] text-primary">
                  {sortDir === "asc" ? "A→Z" : "Z→A"}
                </span>
              </button>
            </th>
            <th className="hidden sm:table-cell">CAP</th>
            <th className="hidden sm:table-cell">Area</th>
            <th>Stato</th>
            <th className="hidden md:table-cell">Scambi</th>
            <th>Azioni</th>
          </>
        }
      >
        {regularUsers.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center text-muted-foreground">
              <div className="py-8">Nessun utente da mostrare.</div>
            </td>
          </tr>
        )}
        {regularUsers.map(user => {
          const nick = user.nickname;
          return (
            <tr key={user.id} className={user.isBlocked ? "opacity-60" : ""}>
              <td>
                <p className="font-medium text-foreground">{nick}</p>
                {user.isBlocked && <p className="text-xs text-destructive">Bloccato</p>}
              </td>
              <td className="hidden sm:table-cell text-center text-foreground">{user.cap}</td>
              <td className="hidden sm:table-cell text-center text-muted-foreground">{user.area}</td>
              <td className="text-center">
                <ChatAccessBadge access={classifyAccess(user)} count={user.unlockedChats} />
              </td>
              <td className="hidden md:table-cell text-center text-foreground">{user.exchangesCompleted}</td>
              <td>
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-2 gap-1 text-xs ${user.isBlocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive/80"}`}
                    disabled={toggleBlock.isPending}
                    onClick={() => toggleBlock.mutate({ userId: user.id, data: { isBlocked: !user.isBlocked } })}
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
    </AdminPage>
  );
}
