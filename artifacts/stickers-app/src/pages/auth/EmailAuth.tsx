import { useState } from "react";
import { Mail, ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/AppLogo";
import {
  emailSignUp,
  emailSignIn,
  emailResetPassword,
  type SocialResult,
} from "@/lib/social-auth";

type Mode = "signin" | "signup" | "reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accesso/registrazione con Email + password (via Supabase Auth).
 * Tre modalità: accedi · crea account · recupera password. Al successo invoca
 * onDone con il risultato del ponte identità (login o "completa profilo").
 */
export function EmailAuth({
  onDone,
  onBack,
}: {
  onDone: (r: SocialResult) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailOk = EMAIL_RE.test(email);
  const pwOk = password.length >= 6;
  // In registrazione la conferma deve combaciare; in accesso non serve.
  const confirmOk = mode !== "signup" || (confirm.length > 0 && confirm === password);
  const canSubmit =
    mode === "reset" ? emailOk && !busy : emailOk && pwOk && confirmOk && !busy;

  const submit = async () => {
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === "reset") {
        const r = await emailResetPassword(email.trim());
        if (r.ok) setInfo("Ti abbiamo inviato un'email con il link per reimpostare la password. Controlla la posta — guarda anche nello SPAM / posta indesiderata.");
        else setErr(r.message ?? "Invio non riuscito");
        return;
      }
      const r = mode === "signup"
        ? await emailSignUp(email.trim(), password)
        : await emailSignIn(email.trim(), password);

      if (r.kind === "confirm_email") {
        setInfo(`Ti abbiamo inviato un'email a ${r.email}. Aprila e conferma, poi torna qui e accedi.\n\n⚠️ Controlla anche la cartella SPAM / posta indesiderata: l'email potrebbe finire lì.`);
        setMode("signin");
        setPassword("");
        setConfirm("");
        return;
      }
      if (r.kind === "error") { setErr(r.message); return; }
      onDone(r); // logged_in oppure needs_profile
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signup" ? "Crea account con Email" : mode === "reset" ? "Recupera password" : "Accedi con Email";

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="flex items-center justify-center">
            <AppLogo className="h-20 w-auto" />
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">{title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="latua@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {mode !== "reset" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Almeno 6 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Nascondi password" : "Mostra password"}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Conferma password: solo in registrazione, per evitare errori di battitura. */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Conferma password</label>
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Ripeti la password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {confirm.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 ${confirm === password ? "text-green-600" : "text-destructive"}`}>
                  {confirm === password ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  {confirm === password ? "Le password coincidono" : "Le password non coincidono"}
                </p>
              )}
            </div>
          )}

          {err && (
            <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg p-2">{err}</p>
          )}
          {info && (
            <p className="text-sm text-foreground text-center bg-primary/5 border border-primary/20 rounded-lg p-2.5 whitespace-pre-line">{info}</p>
          )}

          <Button
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold gap-2"
            disabled={!canSubmit}
            onClick={submit}
          >
            <Mail className="h-4 w-4" />
            {busy ? "Attendi…" : mode === "signup" ? "Crea account" : mode === "reset" ? "Invia link di recupero" : "Accedi"}
          </Button>

          {(mode === "signup" || mode === "reset") && !info && (
            <p className="text-[11px] text-muted-foreground text-center leading-snug">
              📬 Riceverai un'email da <span className="font-medium">Stickers</span>. Se non la vedi,
              controlla la cartella <span className="font-medium">spam / posta indesiderata</span>.
            </p>
          )}

          {/* Switch tra le modalità */}
          <div className="text-center text-xs text-muted-foreground space-y-1.5">
            {mode === "signin" && (
              <>
                <p>
                  Non hai un account?{" "}
                  <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setMode("signup"); setErr(null); setInfo(null); }}>
                    Crea account
                  </button>
                </p>
                <p>
                  <button type="button" className="text-primary hover:underline" onClick={() => { setMode("reset"); setErr(null); setInfo(null); }}>
                    Password dimenticata?
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Hai già un account?{" "}
                <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}>
                  Accedi
                </button>
              </p>
            )}
            {mode === "reset" && (
              <p>
                <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}>
                  Torna all'accesso
                </button>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground pt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Altri modi per accedere
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
