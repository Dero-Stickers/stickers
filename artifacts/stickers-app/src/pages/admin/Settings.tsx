import { useState } from "react";
import { mockSettings } from "@/mock/settings";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function AdminSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    supportEmail: mockSettings.supportEmail,
    demoHours: String(mockSettings.demoHours),
    privacyPolicy: mockSettings.privacyPolicyText,
    terms: mockSettings.termsText,
    cookies: mockSettings.cookiePolicyText,
  });

  const handleSave = () => {
    toast({ title: "Impostazioni salvate", description: "Le modifiche sono state applicate." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configurazione generale dell'applicazione</p>
      </div>

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
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Durata demo predefinita (ore)</label>
            <Input
              type="number"
              min="1"
              max="168"
              value={form.demoHours}
              onChange={e => setForm(p => ({ ...p, demoHours: e.target.value }))}
              className="w-32"
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

      <Button className="w-full gap-2 bg-primary text-primary-foreground h-11" onClick={handleSave}>
        <Save className="h-4 w-4" />
        Salva tutte le impostazioni
      </Button>
    </div>
  );
}
