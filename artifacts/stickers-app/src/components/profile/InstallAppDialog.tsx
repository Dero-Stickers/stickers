import { Share, Plus, MoreVertical, Check, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Istruzioni "Aggiungi a Home" per l'utente. L'app si divulga via link (PWA, non
// store): questa guida spiega come installarla sul telefono. Rileva la piattaforma
// e mostra SOLO i passi pertinenti (iPhone / Android / desktop). Illustrazioni con
// icone vettoriali (lucide), coerenti col resto dell'app.

type Platform = "ios" | "android" | "desktop";

// Rilevamento leggero da user agent. Non serve precisione assoluta: solo scegliere
// quale set di passi mostrare. iPadOS moderno si maschera da Mac → controllo touch.
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

interface Step {
  icon: React.ReactNode;
  text: React.ReactNode;
}

const iconWrap = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary";

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          <span className={iconWrap}>{s.icon}</span>
          <span className="text-sm text-foreground">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

const IOS_STEPS: Step[] = [
  { icon: <Share className="h-5 w-5" />, text: <>Tocca <b>Condividi</b> nella barra in basso</> },
  { icon: <Plus className="h-5 w-5" />, text: <>Scorri e tocca <b>“Aggiungi a Home”</b></> },
  { icon: <Check className="h-5 w-5" />, text: <>Conferma con <b>Aggiungi</b></> },
];

const ANDROID_STEPS: Step[] = [
  { icon: <MoreVertical className="h-5 w-5" />, text: <>Tocca il <b>menu</b> in alto a destra</> },
  { icon: <Download className="h-5 w-5" />, text: <>Tocca <b>“Installa app”</b> (o “Aggiungi a Home”)</> },
  { icon: <Check className="h-5 w-5" />, text: <>Conferma con <b>Installa</b></> },
];

const DESKTOP_STEPS: Step[] = [
  { icon: <Download className="h-5 w-5" />, text: <>Clicca l’icona <b>Installa</b> nella barra degli indirizzi</> },
  { icon: <Check className="h-5 w-5" />, text: <>Conferma con <b>Installa</b></> },
];

export function InstallAppDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const platform = detectPlatform();
  const steps = platform === "ios" ? IOS_STEPS : platform === "android" ? ANDROID_STEPS : DESKTOP_STEPS;
  const heading =
    platform === "ios" ? "Su iPhone / iPad" : platform === "android" ? "Su Android" : "Sul computer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Installa l’app sul telefono</DialogTitle>
          <DialogDescription>
            Aggiungila alla schermata Home: si apre come una vera app, a schermo intero.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
          <StepList steps={steps} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
