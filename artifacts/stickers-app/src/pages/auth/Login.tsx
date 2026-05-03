import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/brand/AppLogo";
import type { AuthResponse } from "@workspace/api-client-react";

const loginSchema = z.object({
  nickname: z.string().min(3, "Il nickname deve avere almeno 3 caratteri"),
  pin: z.string().min(4, "Il PIN deve avere almeno 4 cifre").max(6),
});

const registerSchema = z.object({
  nickname: z.string().min(3, "Il nickname deve avere almeno 3 caratteri"),
  pin: z.string().min(4, "Il PIN deve avere almeno 4 cifre").max(6),
  cap: z.string().length(5, "Il CAP deve essere di 5 cifre"),
  securityQuestion: z.string().min(5, "Domanda di sicurezza obbligatoria"),
  securityAnswer: z.string().min(2, "Risposta obbligatoria"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare Privacy e Termini per registrarti" }),
  }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      nickname: "",
      pin: "",
      cap: "",
      securityQuestion: "",
      securityAnswer: "",
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegisterValues) => {
    setLoginError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: data.nickname,
            pin: data.pin,
            cap: data.cap,
            securityQuestion: data.securityQuestion,
            securityAnswer: data.securityAnswer,
            acceptTerms: data.acceptTerms === true,
          }),
        });
        const json: AuthResponse & { recoveryCode?: string } = await res.json();
        if (!res.ok) {
          setLoginError((json as any)?.message ?? "Errore durante la registrazione");
          return;
        }
        login(json.user, json.token);
        setShowRecoveryCode(json.recoveryCode ?? null);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: data.nickname, pin: data.pin }),
        });
        const json: AuthResponse = await res.json();
        if (!res.ok) {
          setLoginError((json as any)?.message ?? "Nickname o PIN non validi");
          return;
        }
        login(json.user, json.token);
        setLocation(json.user.isAdmin ? "/admin" : "/");
      }
    } catch {
      setLoginError("Errore di connessione. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const dismissRecovery = () => {
    setShowRecoveryCode(null);
    setLocation("/");
  };

  if (showRecoveryCode) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-primary">Registrazione completata</CardTitle>
            <CardDescription>Salva il tuo codice di recupero</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="font-mono text-xl font-bold tracking-widest text-foreground">{showRecoveryCode}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Salva questo codice: serve per recuperare il profilo e gli eventuali acquisti.
              Se lo perdi, il recupero potrebbe non essere possibile o potrebbe richiedere verifica manuale.
            </p>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold h-12" onClick={dismissRecovery}>
              Ho salvato il codice — Entra
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
            <AppLogo className="h-24 w-auto" />
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">
            {isRegister ? "Crea un nuovo account" : "Accedi al tuo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input placeholder="es. nickname" autoComplete="username" {...field} />
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

              {isRegister && (
                <>
                  <FormField
                    control={form.control}
                    name="cap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAP (Codice Postale)</FormLabel>
                        <FormControl>
                          <Input placeholder="es. 20100" maxLength={5} autoComplete="postal-code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="securityQuestion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domanda di sicurezza</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Il nome del tuo primo animale?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="securityAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risposta di sicurezza</FormLabel>
                        <FormControl>
                          <Input placeholder="Risposta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-primary"
                            checked={!!field.value}
                            onChange={e => field.onChange(e.target.checked)}
                          />
                          <span>
                            Dichiaro di avere almeno 14 anni e di aver letto la{" "}
                            <a href="/legal/privacy" target="_blank" rel="noopener" className="underline text-primary">Privacy Policy</a>
                            {" "}e i{" "}
                            <a href="/legal/termini" target="_blank" rel="noopener" className="underline text-primary">Termini d'uso</a>.
                          </span>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {loginError && (
                <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg p-2">{loginError}</p>
              )}

              <div className="pt-2 flex flex-col space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-12"
                >
                  {isLoading ? "Attendi..." : isRegister ? "Inizia gratis" : "Accedi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => { setIsRegister(!isRegister); setLoginError(null); form.reset(); }}
                >
                  {isRegister ? "Ho già un account" : "Crea un nuovo account"}
                </Button>
              </div>
            </form>
          </Form>
          {!isRegister && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setLocation("/recover")}
                className="text-xs text-primary hover:underline"
              >
                Hai dimenticato il PIN o il nickname?
              </button>
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-border/60 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <a href="/legal/privacy" className="hover:text-primary hover:underline">Privacy</a>
            <span aria-hidden>·</span>
            <a href="/legal/termini" className="hover:text-primary hover:underline">Termini</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
