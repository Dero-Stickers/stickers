import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { Button } from "@/components/ui/button";

const DEFAULT_PRIVACY = `Informativa sulla Privacy

Titolare del trattamento
I dati raccolti tramite l'app Stickers Matchbox sono trattati dal team di Stickers Matchbox. Per qualsiasi richiesta puoi scrivere all'indirizzo di supporto indicato nell'app.

Dati raccolti
Per usare l'app raccogliamo unicamente:
- nickname scelto da te,
- codice postale (CAP) per individuare possibili scambi nella tua zona,
- PIN cifrato con algoritmo a senso unico,
- domanda di sicurezza e risposta cifrata,
- contenuti delle conversazioni con altri utenti dell'app,
- elenco album e figurine selezionate per gli scambi.

Non raccogliamo email, numero di telefono, indirizzo, posizione GPS, dati di pagamento o identificatori pubblicitari. Non utilizziamo cookie di profilazione né strumenti di analisi di terze parti.

Finalità e base giuridica
I dati sono trattati per consentire la creazione del profilo, l'autenticazione e lo scambio di figurine tra utenti (esecuzione del contratto, art. 6.1.b GDPR) e per la sicurezza dell'app (legittimo interesse, art. 6.1.f).

Conservazione
I dati restano archiviati finché l'account è attivo. Quando elimini il tuo account dalla sezione Profilo, tutti i dati personali a te associati vengono cancellati definitivamente. Le segnalazioni inviate o ricevute vengono cancellate insieme all'account.

I tuoi diritti (artt. 15-22 GDPR)
- Accesso e portabilità: nella sezione Profilo puoi scaricare in qualsiasi momento un file JSON con i tuoi dati.
- Cancellazione (diritto all'oblio): nella sezione Profilo puoi eliminare definitivamente il tuo account.
- Rettifica e opposizione: puoi scriverci all'indirizzo di supporto.
- Reclamo: puoi rivolgerti al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).

Sicurezza
Il PIN, la risposta di sicurezza e il codice di recupero sono memorizzati esclusivamente in forma cifrata e non sono visibili a nessuno, neppure all'amministratore.

Minori
L'app è rivolta a utenti che abbiano compiuto 14 anni, in linea con quanto previsto dalla normativa italiana per il consenso al trattamento dei dati nei servizi della società dell'informazione.

Cookie e tecnologie simili
L'app utilizza solo memorizzazione locale tecnica strettamente necessaria al funzionamento (token di sessione e stato della schermata di avvio). Non sono presenti cookie di profilazione o di terze parti, pertanto non è richiesto alcun consenso aggiuntivo.

Modifiche
Eventuali aggiornamenti a questa informativa saranno comunicati tramite l'app.`;

const DEFAULT_TERMS = `Termini e Condizioni d'uso

Oggetto
Stickers Matchbox è un servizio gratuito che mette in contatto utenti interessati allo scambio di figurine fisiche tra collezionisti.

Account
Per usare l'app devi creare un account scegliendo nickname, CAP, PIN e una domanda di sicurezza. Sei responsabile della custodia delle tue credenziali e del codice di recupero.

Età minima
Per registrarti devi avere almeno 14 anni.

Comportamento dell'utente
Accedendo all'app ti impegni a:
- non pubblicare contenuti illeciti, offensivi, discriminatori o lesivi della dignità altrui;
- non utilizzare l'app per attività commerciali, spam, truffe o vendite;
- rispettare gli altri utenti durante le conversazioni e gli scambi.

In caso di violazione, l'amministratore può sospendere o bloccare l'account e cancellare i contenuti, fatta salva la segnalazione alle autorità competenti nei casi previsti dalla legge.

Scambi tra utenti
Gli scambi di figurine avvengono direttamente tra gli utenti, in autonomia e sotto la loro esclusiva responsabilità. Stickers Matchbox non è parte dello scambio, non garantisce l'identità degli utenti e non risponde di eventuali contestazioni, mancate consegne o danni.

Segnalazioni
Se subisci o assisti a un comportamento scorretto puoi segnalarlo dalla chat tramite la funzione apposita. Le segnalazioni sono valutate dall'amministratore.

Limitazione di responsabilità
Il servizio è fornito "così com'è". Nei limiti consentiti dalla legge, non rispondiamo di interruzioni del servizio, perdita di dati o danni indiretti derivanti dall'uso dell'app.

Modifiche
Possiamo aggiornare questi termini per motivi tecnici, legali o organizzativi. Le modifiche saranno comunicate tramite l'app.

Legge applicabile
Si applica la legge italiana. Per qualsiasi controversia è competente il foro del consumatore, ove applicabile.`;

type LegalDoc = "privacy" | "termini";

export function LegalPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ doc: string }>("/legal/:doc");
  const doc = (params?.doc === "termini" ? "termini" : "privacy") as LegalDoc;

  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const fromAdmin = doc === "privacy" ? data?.privacyPolicyText : data?.termsText;
        const fallback = doc === "privacy" ? DEFAULT_PRIVACY : DEFAULT_TERMS;
        setText((fromAdmin && fromAdmin.trim().length > 50) ? fromAdmin : fallback);
      })
      .catch(() => {
        if (!cancelled) setText(doc === "privacy" ? DEFAULT_PRIVACY : DEFAULT_TERMS);
      });
    return () => { cancelled = true; };
  }, [doc]);

  const title = doc === "privacy" ? "Privacy Policy" : "Termini e Condizioni";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-10 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-foreground/10"
            onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/login")}
            aria-label="Indietro"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <AppLogo className="h-8 w-auto" />
        </div>
        <h1 className="text-xl font-bold mt-3">{title}</h1>
      </div>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {text === null ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{text}</pre>
        )}
      </div>
    </div>
  );
}

export default LegalPage;
