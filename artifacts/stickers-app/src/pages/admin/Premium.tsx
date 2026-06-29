import { useState, useEffect, useMemo } from "react";
import { Crown, Lock, Unlock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListUsers,
  useGetPaywallConfig,
  useUpdatePaywallConfig,
  useAdminSetUserPremium,
  getGetPaywallConfigQueryKey,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { ChatAccessBadge, classifyAccess, type ChatAccess } from "@/components/admin/ChatAccessBadge";

// Centesimi interi → stringa euro (es. 199 → "1.99") per gli input.
const centsToEuro = (cents: number) => (cents / 100).toFixed(2);
// Stringa euro → centesimi interi (es. "1,99" → 199). Floor difensivo.
const euroToCents = (euro: string) => Math.max(0, Math.round(parseFloat(euro.replace(",", ".")) * 100) || 0);

type Filter = "all" | ChatAccess;

export function AdminPremium() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading: loadingConfig } = useGetPaywallConfig();
  const { data: users, isLoading: loadingUsers } = useAdminListUsers();

  const [paywallOn, setPaywallOn] = useState(false);
  const [priceSingle, setPriceSingle] = useState("1.99");
  const [priceAll, setPriceAll] = useState("9.99");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (config) {
      setPaywallOn(config.chatPaywallEnabled);
      setPriceSingle(centsToEuro(config.priceSingleCents));
      setPriceAll(centsToEuro(config.priceAllCents));
    }
  }, [config]);

  const updateConfig = useUpdatePaywallConfig({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPaywallConfigQueryKey() }) },
  });

  const saveConfig = (over: Partial<{ chatPaywallEnabled: boolean }>, onOk: () => void) =>
    updateConfig.mutate(
      {
        data: {
          chatPaywallEnabled: over.chatPaywallEnabled ?? paywallOn,
          priceSingleCents: euroToCents(priceSingle),
          priceAllCents: euroToCents(priceAll),
          currency: config?.currency ?? "EUR",
        },
      },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetPaywallConfigQueryKey() }); onOk(); } },
    );

  const handleToggleMaster = () => {
    const next = !paywallOn;
    saveConfig({ chatPaywallEnabled: next }, () => {
      setPaywallOn(next);
      toast({
        title: next ? "Chat a pagamento ATTIVE" : "Chat a pagamento DISATTIVATE",
        description: next ? "Per aprire una nuova chat serve uno sblocco." : "Tutte le chat sono di nuovo gratis.",
      });
    });
  };

  const handleSavePrices = () =>
    saveConfig({}, () => toast({ title: "Prezzi salvati", description: `Singola €${priceSingle} · Tutte €${priceAll}` }));

  const setPremium = useAdminSetUserPremium({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: vars.data.grant ? "Tutte le chat sbloccate" : "Sblocco revocato" });
      },
    },
  });

  // Tutti gli utenti ordinati per nickname; conteggi per filtro.
  const all = useMemo(
    () => [...(users ?? [])].sort((a, b) => a.nickname.toLowerCase().localeCompare(b.nickname.toLowerCase(), "it")),
    [users],
  );
  const counts = useMemo(() => {
    const c = { all: all.length, none: 0, some: 0, full: 0 };
    for (const u of all) c[classifyAccess(u)]++;
    return c;
  }, [all]);
  const rows = useMemo(() => (filter === "all" ? all : all.filter(u => classifyAccess(u) === filter)), [all, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Tutti" },
    { key: "none", label: "Senza sblocco" },
    { key: "some", label: "Alcune chat" },
    { key: "full", label: "Tutte le chat" },
  ];

  return (
    <AdminPage title="Monetizzazione" subtitle="Chat a pagamento: interruttore, prezzi e sblocchi">
      {/* Config compatta (non scorre) */}
      <div className="shrink-0 grid gap-4 md:grid-cols-2">
        <Card className={`shadow-sm border-2 ${paywallOn ? "border-emerald-200" : "border-muted"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className={`h-4 w-4 ${paywallOn ? "text-emerald-600" : "text-muted-foreground"}`} />
              Chat a pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                Stato:{" "}
                <span className={`font-bold ${paywallOn ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {loadingConfig ? "…" : paywallOn ? "ATTIVE" : "DISATTIVATE"}
                </span>
              </p>
              <Button
                onClick={handleToggleMaster}
                disabled={updateConfig.isPending || loadingConfig}
                className={paywallOn ? "bg-muted text-foreground hover:bg-muted/80 shrink-0" : "bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"}
              >
                {paywallOn ? "Disattiva" : "Attiva"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se disattivate, tutte le chat sono gratis. L'app resta sempre gratis e visibile.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Prezzi sblocco (€)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConfig ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Una chat</label>
                  <Input type="number" min="0" step="0.01" value={priceSingle} onChange={e => setPriceSingle(e.target.value)} className="w-24" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Tutte le chat</label>
                  <Input type="number" min="0" step="0.01" value={priceAll} onChange={e => setPriceAll(e.target.value)} className="w-24" />
                </div>
                <Button className="bg-primary text-primary-foreground" disabled={updateConfig.isPending} onClick={handleSavePrices}>
                  Salva
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtri (non scorrono) */}
      <div className="shrink-0 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {/* Tabella unica consolidata (solo questa scorre) */}
      <AdminTable
        isLoading={loadingUsers}
        head={
          <>
            <th>Utente</th>
            <th className="hidden sm:table-cell">CAP</th>
            <th className="hidden sm:table-cell">Area</th>
            <th>Stato</th>
            <th>Azione</th>
          </>
        }
      >
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="text-center text-muted-foreground">
              <div className="py-8">Nessun utente in questo filtro.</div>
            </td>
          </tr>
        )}
        {rows.map(u => {
          const access = classifyAccess(u);
          return (
            <tr key={u.id} className={u.isBlocked ? "opacity-60" : ""}>
              <td>
                <p className="font-medium text-foreground">{u.nickname}</p>
              </td>
              <td className="hidden sm:table-cell text-center text-foreground">{u.cap}</td>
              <td className="hidden sm:table-cell text-center text-muted-foreground">{u.area}</td>
              <td className="text-center">
                <ChatAccessBadge access={access} count={u.unlockedChats ?? 0} />
              </td>
              <td>
                <div className="flex justify-center">
                  {access === "full" ? (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive/80"
                      disabled={setPremium.isPending}
                      onClick={() => setPremium.mutate({ userId: u.id, data: { grant: false } })}
                    >
                      <Lock className="h-3.5 w-3.5" /> Revoca
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 px-2 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                      disabled={setPremium.isPending}
                      onClick={() => setPremium.mutate({ userId: u.id, data: { grant: true } })}
                    >
                      <Unlock className="h-3.5 w-3.5" /> Sblocca tutte
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </AdminPage>
  );
}
