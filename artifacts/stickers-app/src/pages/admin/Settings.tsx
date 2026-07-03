import { useState, useEffect } from "react";
import { Save, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// I testi legali vivono in 3 campi DB separati (privacy/termini/cookie) perché
// le pagine dell'app li leggono singolarmente. In admin però si gestiscono come
// UN UNICO testo: si uniscono con marcatori stabili e si ri-dividono al salvataggio.
const LEGAL_MARKERS = {
  privacy: "===== PRIVACY POLICY =====",
  terms: "===== TERMINI DI UTILIZZO =====",
  cookies: "===== COOKIE POLICY =====",
} as const;

function joinLegal(privacy: string, terms: string, cookies: string): string {
  return [
    LEGAL_MARKERS.privacy,
    privacy.trim(),
    "",
    LEGAL_MARKERS.terms,
    terms.trim(),
    "",
    LEGAL_MARKERS.cookies,
    cookies.trim(),
  ].join("\n");
}

// Ridivide il testo unico nei 3 campi ai marcatori. Robusto: se un marcatore
// manca, quella sezione resta vuota senza rompere le altre.
function splitLegal(text: string): { privacy: string; terms: string; cookies: string } {
  const iP = text.indexOf(LEGAL_MARKERS.privacy);
  const iT = text.indexOf(LEGAL_MARKERS.terms);
  const iC = text.indexOf(LEGAL_MARKERS.cookies);
  const slice = (from: number, marker: string, ...ends: number[]) => {
    if (from < 0) return "";
    const start = from + marker.length;
    const end = ends.filter((e) => e > from).sort((a, b) => a - b)[0] ?? text.length;
    return text.slice(start, end).trim();
  };
  return {
    privacy: slice(iP, LEGAL_MARKERS.privacy, iT, iC),
    terms: slice(iT, LEGAL_MARKERS.terms, iP, iC),
    cookies: slice(iC, LEGAL_MARKERS.cookies, iP, iT),
  };
}
import {
  useGetAppSettings,
  useUpdateAppSettings,
  getGetAppSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPage, AdminScrollArea } from "@/components/admin/AdminPage";

export function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetAppSettings();
  // `legal` = i 3 testi uniti in un unico campo modificabile insieme.
  const [form, setForm] = useState({
    supportEmail: "",
    legal: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        supportEmail: settings.supportEmail ?? "",
        legal: joinLegal(
          settings.privacyPolicyText ?? "",
          settings.termsText ?? "",
          settings.cookiePolicyText ?? "",
        ),
      });
    }
  }, [settings]);

  const updateSettings = useUpdateAppSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() });
        toast({ title: "Impostazioni salvate", description: "Le modifiche sono state applicate." });
      },
    },
  });

  const handleSave = () => {
    // Ridivido il testo unico nei 3 campi DB ai marcatori (pagine legali intatte).
    const { privacy, terms, cookies } = splitLegal(form.legal);
    updateSettings.mutate({
      data: {
        appName: settings?.appName ?? "Stickers Matchbox",
        supportEmail: form.supportEmail,
        privacyPolicyText: privacy,
        termsText: terms,
        cookiePolicyText: cookies,
      },
    });
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(form.legal);
      toast({ title: "Copiato", description: "Tutto il testo legale è negli appunti." });
    } catch {
      toast({ title: "Copia non riuscita", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminPage title="Impostazioni" subtitle="Configurazione generale dell'applicazione">
        <AdminScrollArea className="space-y-6">
          <Skeleton className="h-48 rounded-xl" />
        </AdminScrollArea>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Impostazioni" subtitle="Configurazione generale dell'applicazione">
      <AdminScrollArea className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurazione generale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Email supporto</label>
            <Input
              type="email"
              value={form.supportEmail}
              onChange={e => setForm(p => ({ ...p, supportEmail: e.target.value }))}
              placeholder="email@esempio.it"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Testi legali</CardTitle>
          {/* Copia tutto: coerente con l'app (icona Copy + testo), in alto a destra. */}
          <button
            onClick={handleCopyAll}
            aria-label="Copia tutto il testo legale"
            title="Copia tutto il testo legale"
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copia tutto
          </button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Privacy, Termini e Cookie in un unico testo. Mantieni le righe di
            separazione <span className="font-mono">===== … =====</span>: dividono le
            tre sezioni salvate nelle rispettive pagine dell'app.
          </p>
          <Textarea
            value={form.legal}
            onChange={e => setForm(p => ({ ...p, legal: e.target.value }))}
            rows={22}
            className="font-mono text-xs leading-relaxed"
            placeholder="Testo legale completo…"
          />
        </CardContent>
      </Card>

      <Button
        className="w-full gap-2 bg-primary text-primary-foreground h-11"
        onClick={handleSave}
        disabled={updateSettings.isPending}
      >
        <Save className="h-4 w-4" />
        {updateSettings.isPending ? "Salvataggio..." : "Salva tutte le impostazioni"}
      </Button>
      </AdminScrollArea>
    </AdminPage>
  );
}
