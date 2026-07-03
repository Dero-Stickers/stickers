import { Mail, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGetAppSettings } from "@workspace/api-client-react";

// Email di supporto di FALLBACK (dominio deroarts.com), usata se il campo
// "Email supporto" in admin non è configurato o le impostazioni non sono
// ancora caricate. Fonte reale: app_settings.support_email (pannello admin).
export const SUPPORT_EMAIL = "info-stickers@deroarts.com";

interface BlockedAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Testo del pulsante chiudi (default "Chiudi"). Il gate globale usa "Ho capito". */
  closeLabel?: string;
}

/**
 * Modale "Account bloccato": la stessa schermata sia quando il blocco scatta al
 * login sia quando scatta a sessione aperta (gate globale). Non rivela il motivo
 * del blocco; offre una via d'uscita chiara — scrivere al supporto per lo sblocco.
 */
export function BlockedAccountDialog({ open, onOpenChange, closeLabel = "Chiudi" }: BlockedAccountDialogProps) {
  // Email di supporto dal pannello admin (app_settings), con fallback alla costante.
  const { data: settings } = useGetAppSettings();
  const supportEmail = settings?.supportEmail?.trim() || SUPPORT_EMAIL;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            Account bloccato
          </DialogTitle>
          <DialogDescription className="pt-1 text-left">
            Il tuo account è stato bloccato e non puoi più accedere all'app.
            Se pensi si tratti di un errore o vuoi chiedere lo sblocco, scrivici:
            valuteremo la tua richiesta (indica il tuo nickname).
          </DialogDescription>
        </DialogHeader>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent("Richiesta sblocco account")}`}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Mail className="h-4 w-4" />
          Scrivici una mail
        </a>
        <DialogFooter>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
