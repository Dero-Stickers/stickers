import { useState } from "react";
import { mockUsers } from "@/mock/users";
import { mockDemoConfig } from "@/mock/settings";
import { Crown, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function AdminPremium() {
  const { toast } = useToast();
  const [demoHours, setDemoHours] = useState(String(mockDemoConfig.demoHours));

  const demoUsers = mockUsers.filter(u => u.demoStatus === "demo_active" && !u.isAdmin);
  const premiumUsers = mockUsers.filter(u => u.demoStatus === "premium" && !u.isAdmin);

  const handleSave = () => {
    toast({ title: "Configurazione salvata", description: `Durata demo impostata a ${demoHours} ore` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Premium / Demo</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gestisci abbonamenti e configurazione demo</p>
      </div>

      {/* Demo config */}
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
            <div className="flex gap-2">
              <Input type="number" min="1" max="168" value={demoHours} onChange={e => setDemoHours(e.target.value)} className="w-32" />
              <Button className="bg-primary text-primary-foreground gap-2" onClick={handleSave}>
                Salva configurazione
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ogni nuovo utente può attivare la demo una sola volta per questa durata.</p>
          </div>
        </CardContent>
      </Card>

      {/* Demo users table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Utenti in demo ({demoUsers.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium">Utente</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Area</th>
                <th className="text-left px-4 py-2 font-medium">Scade</th>
              </tr>
            </thead>
            <tbody>
              {demoUsers.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">Nessun utente in demo</td></tr>
              )}
              {demoUsers.map((u, i) => (
                <tr key={u.id} className={i < demoUsers.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{u.nickname}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-muted-foreground">{u.area}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-primary font-medium">
                      {u.demoExpiresAt ? new Date(u.demoExpiresAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Premium users table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Utenti premium ({premiumUsers.length})
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
              {premiumUsers.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">Nessun utente premium</td></tr>
              )}
              {premiumUsers.map((u, i) => (
                <tr key={u.id} className={i < premiumUsers.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{u.nickname}</p>
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
