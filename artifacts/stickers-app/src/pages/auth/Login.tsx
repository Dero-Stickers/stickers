import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { formatNickname } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/brand/AppLogo";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import { isSocialAuthAvailable } from "@/lib/supabase";
import {
  startGoogleLogin,
  completeSocialLogin,
  completeSocialProfile,
  clearSocialSession,
  type SocialResult,
} from "@/lib/social-auth";
import { EmailAuth } from "@/pages/auth/EmailAuth";
import { BlockedAccountDialog } from "@/components/auth/BlockedAccountDialog";
import { Mail, Lock } from "lucide-react";
import type { AuthResponse } from "@workspace/api-client-react";

// Allineato alla regola del backend: 5-12 caratteri (lettere, numeri, - o _),
// ALFANUMERICO MISTO obbligatorio (almeno una lettera E almeno un numero).
// Usato dalla schermata "Completa profilo" social.
const NICKNAME_REGEX = /^[A-Za-z0-9_-]{5,12}$/;

// La registrazione avviene SOLO con Google o Email (Supabase Auth). Il form
// nickname+PIN resta come solo ACCESSO per gli account storici/admin: niente
// più creazione account PIN, niente domanda di sicurezza, niente codice STICK.
const loginSchema = z.object({
  nickname: z.string().min(1, "Inserisci il nickname"),
  pin: z.string().min(4, "Il PIN deve avere almeno 4 cifre").max(6),
});

type LoginValues = z.infer<typeof loginSchema>;

export function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { login } = useAuth();
  // Destinazione dopo il login (es. /admin), solo se path interno sicuro.
  const rawNext = new URLSearchParams(search).get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  // Accesso proveniente dall'area riservata (link /admin → /login?next=/admin):
  // differenzia SOLO l'aspetto della testata (badge "Area ADMIN"), così è chiaro
  // che stai entrando nello staff. Nessun effetto su auth/permessi: il controllo
  // isAdmin resta invariato lato server e nel redirect post-login.
  const isAdminLogin = nextPath === "/admin" || nextPath?.startsWith("/admin/");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Accesso con nickname+PIN: opzione secondaria (solo login storico/admin),
  // nascosta di default. La creazione account avviene solo con Google/Email.
  const [showLegacy, setShowLegacy] = useState(false);
  // Stato accesso social (Google / email via Supabase).
  const socialAvailable = isSocialAuthAvailable();
  const [socialBusy, setSocialBusy] = useState(false);
  // Mostra il form email/password (registrazione, accesso, recupero).
  const [showEmail, setShowEmail] = useState(false);
  // Quando un nuovo utente social deve scegliere nickname + CAP.
  const [pendingProfile, setPendingProfile] = useState<{ accessToken: string; email: string | null } | null>(null);

  const finishSocial = (r: SocialResult) => {
    if (r.kind === "logged_in") {
      void clearSocialSession();
      login(r.user, r.token);
      setLocation(r.user.isAdmin ? (nextPath ?? "/admin") : "/");
    } else if (r.kind === "needs_profile") {
      setPendingProfile({ accessToken: r.accessToken, email: r.email });
    } else if (r.kind === "blocked") {
      // Account sospeso via Google/Email: stesso modale del login PIN, così
      // l'utente non resta a vedere una schermata muta e ha la via d'uscita.
      // Chiudo la schermata Email per tornare al Login principale, dove vive
      // il modale (EmailAuth sostituisce il render di Login mentre è aperta).
      void clearSocialSession();
      setShowEmail(false);
      setPendingProfile(null);
      setBlockedOpen(true);
    } else {
      setLoginError(r.message);
    }
  };

  // Al caricamento: se torniamo da Google (sessione nell'URL), scambia col backend.
  useEffect(() => {
    if (!socialAvailable) return;
    let active = true;
    setSocialBusy(true);
    completeSocialLogin()
      .then((r) => {
        if (!active) return;
        if (r) finishSocial(r);
      })
      .finally(() => active && setSocialBusy(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGoogle = async () => {
    setLoginError(null);
    setSocialBusy(true);
    const ok = await startGoogleLogin();
    if (!ok) { setLoginError("Accesso con Google non disponibile al momento."); setSocialBusy(false); }
    // Se ok: redirect a Google in corso; al ritorno parte l'useEffect.
  };

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      nickname: "",
      pin: "",
    },
  });

  // Solo ACCESSO nickname+PIN (account storici/admin). La creazione di nuovi
  // account passa esclusivamente da Google/Email.
  const onSubmit = async (data: LoginValues) => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const normalizedNick = data.nickname.trim().toLowerCase();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: normalizedNick, pin: data.pin }),
      });
      const json: AuthResponse = await res.json();
      if (!res.ok) {
        const code = (json as any)?.error;
        // Account bloccato: modale dedicato con via d'uscita (email supporto),
        // invece di una scritta rossa che si perde nel form.
        if (code === "ACCOUNT_BLOCKED" || code === "BLOCKED") {
          setBlockedOpen(true);
          return;
        }
        setLoginError((json as any)?.message ?? "Nickname o PIN non validi");
        return;
      }
      login(json.user, json.token);
      setLocation(json.user.isAdmin ? (nextPath ?? "/admin") : "/");
    } catch {
      setLoginError("Errore di connessione. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Schermata "Completa profilo" per nuovi utenti social (Google/email) ---
  if (pendingProfile) {
    return <CompleteProfile pending={pendingProfile} onDone={finishSocial} onCancel={() => { void clearSocialSession(); setPendingProfile(null); }} />;
  }

  // --- Accesso/registrazione con Email + password ---
  if (showEmail) {
    return <EmailAuth onDone={finishSocial} onBack={() => { setShowEmail(false); setLoginError(null); }} />;
  }

  return (
    <>
    <div className="h-full overflow-y-auto flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="flex items-center justify-center">
            <AppLogo className="h-24 w-auto" />
          </CardTitle>
          {isAdminLogin && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2C4C] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                <Lock className="h-3.5 w-3.5" />
                Area ADMIN
              </span>
            </div>
          )}
          <CardDescription className="text-base font-medium text-foreground">
            {isAdminLogin ? "Accesso riservato allo staff" : "Accedi o crea il tuo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Accesso moderno: Google + Email in evidenza. */}
          {socialAvailable && (
            <div className="space-y-2.5 mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2.5 font-semibold border-input bg-white text-foreground hover:bg-muted/60"
                onClick={onGoogle}
                disabled={socialBusy || isLoading}
              >
                <GoogleIcon className="h-5 w-5" />
                {socialBusy ? "Attendi…" : "Continua con Google"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2.5 font-semibold border-input bg-white text-foreground hover:bg-muted/60"
                onClick={() => { setLoginError(null); setShowEmail(true); }}
                disabled={socialBusy || isLoading}
              >
                <Mail className="h-5 w-5" />
                Continua con Email
              </Button>

              {!showLegacy && (
                <button
                  type="button"
                  onClick={() => { setShowLegacy(true); setLoginError(null); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary pt-1"
                >
                  Oppure entra con nickname e PIN
                </button>
              )}

              {showLegacy && (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">oppure</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
            </div>
          )}

          {/* Form nickname + PIN: SOLO accesso (account storici/admin). I nuovi
              account si creano con Google o Email. Principale se il social non è
              disponibile, altrimenti opzione secondaria mostrata su richiesta. */}
          {(!socialAvailable || showLegacy) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="es. Marco95"
                        autoComplete="username"
                        spellCheck={false}
                        inputMode="text"
                        maxLength={12}
                        {...field}
                        onChange={e => {
                          // Formato canonico mentre si digita: iniziale maiuscola,
                          // resto minuscolo, solo lettere/numeri/-/_, max 12.
                          field.onChange(formatNickname(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="4-6 cifre" maxLength={6} autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginError && (
                <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg p-2">{loginError}</p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-12"
                >
                  {isLoading ? "Attendi..." : "Accedi"}
                </Button>
              </div>
            </form>
          </Form>
          )}
          <div className="mt-5 pt-4 border-t border-border/60 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <a href="/legal/privacy" className="hover:text-primary hover:underline">Privacy</a>
            <span aria-hidden>·</span>
            <a href="/legal/termini" className="hover:text-primary hover:underline">Termini</a>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Modale "Account bloccato": componente condiviso (stessa schermata del
        gate globale a sessione aperta). Non rivela il motivo del blocco. */}
    <BlockedAccountDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Completa profilo — primo accesso social: l'utente sceglie nickname (permanente)
// e CAP. Email e identità arrivano da Google/Supabase, qui niente PIN.
// ---------------------------------------------------------------------------
function CompleteProfile({
  pending,
  onDone,
  onCancel,
}: {
  pending: { accessToken: string; email: string | null };
  onDone: (r: SocialResult) => void;
  onCancel: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [cap, setCap] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nickOk = NICKNAME_REGEX.test(nickname) && /[A-Za-z]/.test(nickname) && /[0-9]/.test(nickname);
  const capOk = /^\d{5}$/.test(cap);
  const canSubmit = nickOk && capOk && accept && !busy;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    const r = await completeSocialProfile({ accessToken: pending.accessToken, nickname, cap });
    if (r.kind === "error") { setErr(r.message); setBusy(false); return; }
    onDone(r);
  };

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="flex items-center justify-center">
            <AppLogo className="h-20 w-auto" />
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">
            Completa il tuo profilo
          </CardDescription>
          {pending.email && (
            <p className="text-xs text-muted-foreground">Accesso come {pending.email}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Scegli un nickname</label>
            <Input
              placeholder="es. Marco95 (lettere + numeri)"
              value={nickname}
              onChange={(e) => setNickname(formatNickname(e.target.value))}
              maxLength={12}
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              È il nome con cui ti vedranno gli altri. Scegli bene:{" "}
              <span className="font-medium text-foreground">non potrà essere modificato</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Il tuo CAP</label>
            <Input
              placeholder="es. 20100"
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              maxLength={5}
            />
            <p className="text-[11px] text-muted-foreground">Serve a trovare scambi vicino a te. Puoi cambiarlo quando vuoi.</p>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              Dichiaro di avere almeno 16 anni e di aver letto la{" "}
              <a href="/legal/privacy" target="_blank" rel="noopener" className="underline text-primary">Privacy Policy</a>
              {" "}e i{" "}
              <a href="/legal/termini" target="_blank" rel="noopener" className="underline text-primary">Termini d'uso</a>.
            </span>
          </label>

          {err && (
            <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg p-2">{err}</p>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold" disabled={!canSubmit} onClick={submit}>
              {busy ? "Attendi…" : "Entra in Stickers"}
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={onCancel} disabled={busy}>
              Annulla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
