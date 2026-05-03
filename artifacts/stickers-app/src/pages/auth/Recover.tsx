import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/brand/AppLogo";
import type { AuthResponse } from "@workspace/api-client-react";
import { ArrowLeft, KeyRound, HelpCircle } from "lucide-react";

type Method = null | "code" | "question";

export function Recover() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [method, setMethod] = useState<Method>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Codice di recupero
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPinCode, setNewPinCode] = useState("");
  const [recoveredNick, setRecoveredNick] = useState<string | null>(null);

  // Domanda segreta
  const [nickname, setNickname] = useState("");
  const [cap, setCap] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPinAnswer, setNewPinAnswer] = useState("");

  const reset = () => {
    setMethod(null);
    setError(null);
    setRecoveryCode(""); setNewPinCode(""); setRecoveredNick(null);
    setNickname(""); setCap(""); setSecurityQuestion(null); setSecurityAnswer(""); setNewPinAnswer("");
  };

  const submitCode = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCode: recoveryCode.trim().toUpperCase(), newPin: newPinCode }),
      });
      const json: AuthResponse & { message?: string } = await res.json();
      if (!res.ok) { setError(json.message ?? "Codice non valido"); return; }
      setRecoveredNick(json.user.nickname);
      login(json.user, json.token);
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  const lookupQuestion = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/recover/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), cap: cap.trim() }),
      });
      const json: { securityQuestion?: string; message?: string } = await res.json();
      if (!res.ok) { setError(json.message ?? "Account non trovato"); return; }
      setSecurityQuestion(json.securityQuestion ?? "");
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  const submitAnswer = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/recover/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          cap: cap.trim(),
          securityAnswer: securityAnswer.trim(),
          newPin: newPinAnswer,
        }),
      });
      const json: AuthResponse & { message?: string } = await res.json();
      if (!res.ok) { setError(json.message ?? "Risposta non corretta"); return; }
      login(json.user, json.token);
      setLocation(json.user.isAdmin ? "/admin" : "/");
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  if (recoveredNick) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-primary">PIN aggiornato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center">
              Il tuo nickname è <span className="font-bold text-foreground">{recoveredNick}</span>.<br />
              Conservalo per i prossimi accessi.
            </p>
            <Button className="w-full bg-accent text-accent-foreground" onClick={() => setLocation("/")}>
              Entra nell'app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="flex items-center justify-center">
            <AppLogo className="h-20 w-auto" />
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">
            Recupera l'accesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {method === null && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Hai dimenticato il PIN o il nickname? Scegli come recuperare l'accesso.
              </p>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition text-left"
                onClick={() => { setMethod("code"); setError(null); }}
              >
                <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Ho il codice di recupero</p>
                  <p className="text-xs text-muted-foreground">STICK-XXXX-XXXX-XXXX (mostra anche il tuo nickname)</p>
                </div>
              </button>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition text-left"
                onClick={() => { setMethod("question"); setError(null); }}
              >
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Rispondi alla domanda di sicurezza</p>
                  <p className="text-xs text-muted-foreground">Devi ricordare nickname e CAP</p>
                </div>
              </button>
              <Button variant="ghost" className="w-full" onClick={() => setLocation("/login")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Torna al login
              </Button>
            </>
          )}

          {method === "code" && (
            <>
              <Input
                placeholder="STICK-XXXX-XXXX-XXXX"
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value)}
                autoComplete="off"
                className="font-mono uppercase"
              />
              <Input
                type="password"
                placeholder="Nuovo PIN (4-6 cifre)"
                maxLength={6}
                value={newPinCode}
                onChange={e => setNewPinCode(e.target.value)}
                autoComplete="new-password"
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button
                className="w-full bg-accent text-accent-foreground h-11"
                onClick={submitCode}
                disabled={loading || recoveryCode.length < 10 || newPinCode.length < 4}
              >
                {loading ? "Verifica..." : "Imposta nuovo PIN"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Cambia metodo
              </Button>
            </>
          )}

          {method === "question" && securityQuestion === null && (
            <>
              <Input placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
              <Input placeholder="CAP (5 cifre)" maxLength={5} value={cap} onChange={e => setCap(e.target.value)} />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button
                className="w-full bg-primary text-primary-foreground h-11"
                onClick={lookupQuestion}
                disabled={loading || nickname.length < 3 || cap.length !== 5}
              >
                {loading ? "Cerco..." : "Mostra la mia domanda"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Cambia metodo
              </Button>
            </>
          )}

          {method === "question" && securityQuestion !== null && (
            <>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">La tua domanda di sicurezza</p>
                <p className="text-sm font-medium text-foreground mt-1">{securityQuestion}</p>
              </div>
              <Input
                placeholder="Risposta"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Nuovo PIN (4-6 cifre)"
                maxLength={6}
                value={newPinAnswer}
                onChange={e => setNewPinAnswer(e.target.value)}
                autoComplete="new-password"
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button
                className="w-full bg-accent text-accent-foreground h-11"
                onClick={submitAnswer}
                disabled={loading || securityAnswer.length < 1 || newPinAnswer.length < 4}
              >
                {loading ? "Verifica..." : "Imposta nuovo PIN"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Cambia metodo
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
