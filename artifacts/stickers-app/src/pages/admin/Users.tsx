import { Shield, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListUsers,
  useToggleBlockUser,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function DemoStatusBadge({ status }: { status: string | null | undefined }) {
  if (status === "premium") return <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Premium</Badge>;
  if (status === "demo_active") return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Demo</Badge>;
  if (status === "demo_expired") return <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Demo scad.</Badge>;
  return <Badge variant="outline" className="text-xs">Free</Badge>;
}

export function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useAdminListUsers();
  const regularUsers = users?.filter(u => !u.isBlocked || true) ?? [];

  const toggleBlock = useToggleBlockUser({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: vars.data.isBlocked ? "Utente bloccato" : "Utente sbloccato" });
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Utenti</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visualizza e gestisci gli utenti registrati</p>
        </div>
        <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-lg">
          {isLoading ? "..." : `${regularUsers.length} utenti`}
        </div>
      </div>

      <Card className="shadow-sm">
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        )}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Utente</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">CAP / Area</th>
                  <th className="text-left px-4 py-3 font-medium">Stato</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Scambi</th>
                  <th className="text-right px-4 py-3 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map((user, i) => (
                  <tr key={user.id} className={`${i < regularUsers.length - 1 ? "border-b border-border/50" : ""} ${user.isBlocked ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase flex-shrink-0">
                          {user.nickname.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{user.nickname}</p>
                          {user.isBlocked && <p className="text-xs text-destructive">Bloccato</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-foreground">{user.cap}</p>
                      <p className="text-xs text-muted-foreground">{user.area}</p>
                    </td>
                    <td className="px-4 py-3">
                      <DemoStatusBadge status={user.demoStatus} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-foreground">{user.exchangesCompleted}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
