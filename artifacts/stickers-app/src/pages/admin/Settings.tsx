import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  const [form, setForm] = useState({
    supportEmail: "",
    privacyPolicy: "",
    terms: "",
    cookies: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        supportEmail: settings.supportEmail ?? "",
        privacyPolicy: settings.privacyPolicyText ?? "",
        terms: settings.termsText ?? "",
        cookies: settings.cookiePolicyText ?? "",
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
    updateSettings.mutate({
      data: {
        appName: settings?.appName ?? "Stickers Matchbox",
        supportEmail: form.supportEmail,
        privacyPolicyText: form.privacyPolicy,
        termsText: form.terms,
        cookiePolicyText: form.cookies,
      },
    });
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Testi legali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Privacy Policy</label>
            <Textarea
              value={form.privacyPolicy}
              onChange={e => setForm(p => ({ ...p, privacyPolicy: e.target.value }))}
              rows={5}
              placeholder="Testo della privacy policy..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Termini di Utilizzo</label>
            <Textarea
              value={form.terms}
              onChange={e => setForm(p => ({ ...p, terms: e.target.value }))}
              rows={5}
              placeholder="Termini di utilizzo..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Cookie Policy</label>
            <Textarea
              value={form.cookies}
              onChange={e => setForm(p => ({ ...p, cookies: e.target.value }))}
              rows={5}
              placeholder="Cookie policy..."
            />
          </div>
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
