import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowLeft } from "lucide-react";

export function DemoExpiredScreen() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 space-y-5 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Demo scaduta</h1>
            <p className="text-sm text-muted-foreground">
              Il tuo periodo di prova gratuita è terminato. Passa a Premium per continuare a vedere
              i match, scoprire utenti vicini e scambiare figurine senza limiti.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Crown className="h-4 w-4" />
              Con Premium ottieni:
            </div>
            <ul className="text-xs text-amber-800 space-y-1 pl-6 list-disc">
              <li>Match illimitati con utenti compatibili</li>
              <li>Chat senza restrizioni</li>
              <li>Filtri avanzati per zona e album</li>
              <li>Supporto prioritario</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-upgrade-premium">
              <Link href="/profilo">Passa a Premium</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
