import { useState, useEffect } from "react";
import { Crown, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListUsers,
  useGetDemoConfig,
  useUpdateDemoConfig,
  getGetDemoConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function AdminPremium() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: demoConfig, isLoading: loadingConfig } = useGetDemoConfig();
  const { data: users, isLoading: loadingUsers } = useAdminListUsers();

  const [demoHours, setDemoHours] = useState("24");

  useEffect(() => {
    if (demoConfig) setDemoHours(String(demoConfig.demoHours));
  }, [demoConfig]);

  const updateConfig = useUpdateDemoConfig({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDemoConfigQueryKey() });
        toast({ title: "Configurazione salvata", description: `Durata demo impostata a ${demoHours} ore` });
      },
    },
  });

  // Interruttore globale del sistema Premium/Demo.
  const [masterEnabled, setMasterEnabled] = useState(true);
  useEffect(() => {
    if (demoConfig) setMasterEnabled(demoConfig.premiumDemoEnabled !== false);
  }, [demoConfig]);

  const toggleMaster = useUpdateDemoConfig();

  const handleToggleMaster = () => {
    const next = !masterEnabled;
    toggleMaster.mutate(
      {
        data: {
          demoHours: parseInt(demoHours, 10) || 24,
          demoEnabled: demoConfig?.demoEnabled ?? true,
          premiumDemoEnabled: next,
        },
      },
      {
        onSuccess: () => {
          setMasterEnabled(next);
          queryClient.invalidateQueries({ queryKey: getGetDemoConfigQueryKey() });
          toast({
            title: next ? "Premium / Demo ATTIVATO" : "Premium / Demo DISATTIVATO",
            description: next
              ? "Il sistema è di nuovo attivo."
              : "L'app funziona come se Premium e Demo non esistessero.",
          });
        },
      },
    );
  };

  const demoUsers = users?.filter(u => u.demoStatus === "demo_active") ?? [];
  const premiumUsers = users?.filter(u => u.demoStatus === "premium") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Premium / Demo</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gestisci abbonamenti e configurazione demo</p>
      </div>

      <Card className={`shadow-sm border-2 ${masterEnabled ? "border-emerald-200" : "border-muted"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className={`h-4 w-4 ${masterEnabled ? "text-emerald-600" : "text-muted-foreground"}`} />
            Sistema Premium / Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                Stato:{" "}
                <span className={`font-bold ${masterEnabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {loadingConfig ? "…" : masterEnabled ? "ATTIVO" : "DISATTIVATO"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Se disattivato, l'app funziona come se Premium e Demo non esistessero: accesso pieno per tutti,
                nessun blocco chat, nessuna scadenza demo, nessuna etichetta.
              </p>
            </div>
            <Button
              onClick={handleToggleMaster}
              disabled={toggleMaster.isPending || loadingConfig}
              className={masterEnabled
                ? "bg-muted text-foreground hover:bg-muted/80 shrink-0"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"}
            >
              {masterEnabled ? "Disattiva" : "Attiva"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Configurazione Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Durata demo (ore)</label>
            {loadingConfig
              ? <Skeleton className="h-9 w-40" />
              : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={demoHours}
                    onChange={e => setDemoHours(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    className="bg-primary text-primary-foreground"
                    disabled={updateConfig.isPending}
                    onClick={() => updateConfig.mutate({ data: { demoHours: parseInt(demoHours, 10) || 24, demoEnabled: true } })}
                  >
                    Salva
                  </Button>
                </div>
              )
            }
            <p className="text-xs text-muted-foreground mt-1">Ogni nuovo utente può attivare la demo una sola volta per questa durata.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Utenti in demo ({loadingUsers ? "..." : demoUsers.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium">Utente</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Area</th>
                <th className="text-left px-4 py-2 font-medium">Scambi</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers && <tr><td colSpan={3} className="px-4 py-4"><Skeleton className="h-10 rounded" /></td></tr>}
              {!loadingUsers && demoUsers.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">Nessun utente in demo</td></tr>
              )}
              {demoUsers.map((u, i) => (
                <tr key={u.id} className={i < demoUsers.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground lowercase">{u.nickname.toLowerCase()}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-muted-foreground">{u.area}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{u.exchangesCompleted}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Utenti premium ({loadingUsers ? "..." : premiumUsers.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium">Utente</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Area</th>
                <th className="text-left px-4 py-2 font-medium">Scambi</th>
              </tr>
            </thead>
            <tbody>
              {!loadingUsers && premiumUsers.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">Nessun utente premium</td></tr>
              )}
              {premiumUsers.map((u, i) => (
                <tr key={u.id} className={i < premiumUsers.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground lowercase">{u.nickname.toLowerCase()}</p>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Premium</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-muted-foreground">{u.area}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{u.exchangesCompleted}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
