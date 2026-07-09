// Inviti che l'admin invia a un utente dalla pagina Utenti; l'utente li vede UNA
// volta al prossimo accesso. Due tipi (campo `type` da /me/nudge):
//  - "dona"      → invito (una tantum) a sostenere l'app con una donazione Ko-fi;
//  - "condividi" → invito (ripetibile) a condividere l'app con gli amici, con
//                  link + tasto copia. Più persone = più match.
// Nessuno dei due sblocca nulla: l'app resta gratuita. Il gate interroga
// /me/nudge e, se c'è un invito non ancora visto, apre il modale giusto; alla
// chiusura segna quell'invito (per tipo) come visto → non riappare.
//
// Tono concordato con l'owner: mai colpevolizzante. Chiudibile, nessun obbligo.

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMyNudge, useMarkMyNudgeSeen, getGetMyNudgeQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KofiButton } from "@/components/brand/KofiButton";
import { AppLogo } from "@/components/brand/AppLogo";

// Componente senza layout, montato a livello App (come BlockedGate): reagisce
// allo stato auth e mostra il modale una sola volta.
export function NudgeGate() {
  const { isAuthenticated, currentUser } = useAuth();
  // L'invito riguarda solo gli utenti normali (non l'admin). Interroga il server
  // solo quando serve, senza cache stantia (un invito appena inviato dev'essere
  // visto al primo accesso utile).
  const enabled = isAuthenticated && !!currentUser && !currentUser.isAdmin;
  const { data, refetch } = useGetMyNudge({
    // Ricontrolla l'invito all'avvio E ogni volta che l'app torna in primo piano
    // (refetchOnWindowFocus): così un invito inviato dall'admin appare al prossimo
    // ritorno sull'app, non solo dopo un riavvio completo. staleTime:0 = mai cache.
    query: {
      queryKey: getGetMyNudgeQueryKey(),
      enabled,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  });
  const markSeen = useMarkMyNudgeSeen();

  const [open, setOpen] = useState(false);
  // Snapshot del tipo di invito al momento dell'apertura. Una volta aperto, il
  // modale NON deve dipendere più da `data.nudge`: se dipendesse, tornando
  // nell'app dopo aver aperto un social (che consuma l'invito → il server
  // risponde "nessun invito") il modale sparirebbe da solo. Con lo snapshot resta
  // visibile finché l'utente non lo chiude a mano.
  const [openType, setOpenType] = useState<"dona" | "condividi" | null>(null);
  const [copied, setCopied] = useState(false);
  // Evita di segnare "visto" più di una volta (es. chiusura + smontaggio).
  const seenRef = useRef(false);
  // Chiave (tipo+data) dell'ultimo invito consumato in questa sessione: evita che
  // il refetch al ritorno in foreground riapra un modale appena chiuso prima che
  // il server registri il "visto".
  const consumedKey = useRef<string | null>(null);

  const type = data?.nudge?.type === "condividi" ? "condividi" : "dona";
  const nudgeKey = data?.nudge ? `${data.nudge.type}:${data.nudge.sentAt}` : null;

  // Ritorno in primo piano su PWA installata (iOS/Android): visibilitychange è
  // più affidabile del focus-window. Riesegue il controllo dell'invito.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refetch]);

  // Apri quando arriva un invito non ancora consumato IN QUESTA sessione.
  // Confronto per chiave (tipo+data): un invito già chiuso non si riapre; un
  // invito NUOVO (arrivato al ritorno in foreground) sì.
  useEffect(() => {
    if (enabled && nudgeKey && nudgeKey !== consumedKey.current) {
      seenRef.current = false;
      setOpenType(type);
      setOpen(true);
    }
    // `type` è derivato da data.nudge: incluso di proposito, cambia con nudgeKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nudgeKey]);

  // Segna l'invito come visto (una volta), per il tipo corrente: l'invito è
  // consumato e non riappare finché l'admin non lo rinvia. NON chiude il modale
  // (per il flusso Ko-fi che prosegue sopra); la chiusura la gestisce dismiss.
  const consume = () => {
    if (!seenRef.current) {
      seenRef.current = true;
      consumedKey.current = nudgeKey;
      // Usa il tipo mostrato nel modale (snapshot), non `type` derivato dai dati
      // (che potrebbe già essere cambiato dopo un refetch).
      markSeen.mutate({ data: { type: openType ?? type } });
    }
  };

  // "No grazie"/"Chiudi" o tap fuori: consuma e chiudi (solo su azione utente).
  const dismiss = () => {
    consume();
    setOpen(false);
    setOpenType(null);
  };

  // Link pubblico dell'app: l'origine corrente funziona sia in locale che in
  // produzione, senza dipendere da variabili d'ambiente.
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareText = "Con quest'app possiamo condividere le figurine mancanti più facilmente!";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard non disponibile: l'utente può comunque selezionare il testo */
    }
  };

  // Link di condivisione ufficiali (nessuna API, nessuna chiave): aprono l'app/il
  // sito del social con testo + link già pronti. Cliccare consuma l'invito.
  // Solo WhatsApp e Telegram: Facebook per policy NON permette il testo
  // precompilato (Platform Policy 2.3), aprirebbe solo il link senza messaggio →
  // rimosso, tenuti i due canali che pre-compilano davvero testo+link.
  const enc = encodeURIComponent;
  const socials = [
    {
      name: "WhatsApp",
      color: "#25D366",
      href: `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.945a11.821 11.821 0 00-3.481-8.408Z"/></svg>
      ),
    },
    {
      name: "Telegram",
      color: "#0088CC",
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(shareText)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      ),
    },
  ];

  // Visibilità legata SOLO allo stato locale `open`, non a `data.nudge`: il
  // modale resta finché l'utente non lo chiude, anche se nel frattempo l'invito
  // è stato consumato (es. dopo aver aperto un social e essere tornato nell'app).
  if (!open || !openType) return null;

  // ---- Modale "condividi l'app" -------------------------------------------
  if (openType === "condividi") {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <DialogHeader className="items-center">
            <AppLogo className="h-12 w-auto mx-auto mb-2" />
            <DialogTitle className="text-center">Condividi Stickers con i tuoi amici!</DialogTitle>
            <DialogDescription className="text-center">
              Più collezionisti ci sono, più scambi e match trovi tu.
              <br />
              Invita un amico: bastano pochi secondi!
            </DialogDescription>
          </DialogHeader>

          {/* Link app + tasto copia */}
          <div className="mt-1 flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
            <span className="flex-1 truncate text-left text-sm text-muted-foreground">{shareUrl}</span>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiato" : "Copia link"}
            </button>
          </div>

          {/* Pulsanti social con icone e colori ufficiali. Aprono la condivisione
              del rispettivo social (nuova scheda) con testo + link già pronti.
              Cliccare consuma l'invito ma NON chiude il modale: così l'utente può
              condividere su più social di seguito. Si chiude solo da "Chiudi"/tap
              fuori (dismiss). */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={consume}
                style={{ backgroundColor: s.color }}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 text-white text-base font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                aria-label={`Condividi su ${s.name}`}
              >
                {s.icon}
                {s.name}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Chiudi
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  // ---- Modale "invito a donare" (invariato) -------------------------------
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">Sei tra i più attivi su Stickers! 💚</DialogTitle>
          <DialogDescription className="text-center">
            Vediamo che scambi e colleziona spesso!
            <br />
            L'app è e resta gratuita, se ti va di darci una mano,
            <br />
            puoi offrirci un piccolo contributo libero.
            <br />
            Nessun obbligo, è solo un grazie!
          </DialogDescription>
        </DialogHeader>

        {/* CTA verde riusata (apre il suo modale copia-nickname → Ko-fi). Al
            clic l'invito è consumato (visto), ma NON chiudiamo: lasciamo che il
            flusso Ko-fi prosegua sopra questo modale. */}
        <div onClickCapture={consume}>
          <KofiButton className="w-full" />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          No grazie
        </button>
      </DialogContent>
    </Dialog>
  );
}
