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
import { mockUsers } from "@/mock/users";
import type { UserProfile } from "@workspace/api-client-react";

const loginSchema = z.object({
  nickname: z.string().min(3, "Il nickname deve avere almeno 3 caratteri"),
  pin: z.string().min(4, "Il PIN deve avere almeno 4 cifre"),
  cap: z.string().length(5, "Il CAP deve essere di 5 cifre"),
});

const registerSchema = loginSchema.extend({
  securityQuestion: z.string().min(5, "Domanda di sicurezza obbligatoria"),
  securityAnswer: z.string().min(2, "Risposta obbligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showRecoveryCode, setShowRecoveryCode] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      nickname: "",
      pin: "",
      cap: "",
      securityQuestion: "",
      securityAnswer: "",
    },
  });

  const onSubmit = (data: RegisterValues) => {
    setLoginError(null);

    if (isRegister) {
      // Mock registration — create new user and log in
      const existing = mockUsers.find(u => u.nickname === data.nickname && u.cap === data.cap);
      if (existing) {
        setLoginError("Nickname già in uso per questo CAP");
        return;
      }

      // Create mock user object
      const newUser: UserProfile = {
        id: Date.now(),
        nickname: data.nickname,
        cap: data.cap,
        area: `Area ${data.cap.slice(0, 2)}XXX`,
        isPremium: false,
        demoStatus: "free",
        demoExpiresAt: null,
        exchangesCompleted: 0,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };

      const recoveryCode = `STICK-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setShowRecoveryCode(recoveryCode);
      login(newUser);
      return;
    }

    // Login — find user in mock data by nickname and pin (ignore CAP for demo simplicity)
    const user = mockUsers.find(u => u.nickname === data.nickname && (u as any).pin === data.pin);
    if (!user) {
      setLoginError("Nickname o PIN non validi. Prova con: mario75 / 1234 / 20100");
      return;
    }

    login(user);
    setLocation(user.isAdmin ? "/admin" : "/");
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
          <CardTitle className="text-3xl font-black tracking-tight">
            <span className="text-accent">S</span>
            <span className="text-primary">TICKERS</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">matchbox</p>
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
                      <Input placeholder="es. mario75" autoComplete="username" {...field} />
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
              <FormField
                control={form.control}
                name="cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP</FormLabel>
                    <FormControl>
                      <Input placeholder="es. 20100" maxLength={5} autoComplete="postal-code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isRegister && (
                <>
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
                </>
              )}

              {loginError && (
                <p className="text-sm text-destructive text-center bg-destructive/5 border border-destructive/20 rounded-lg p-2">{loginError}</p>
              )}

              {!isRegister && (
                <p className="text-xs text-muted-foreground text-center">
                  Demo: <span className="font-mono font-medium">mario75</span> / <span className="font-mono font-medium">1234</span> / <span className="font-mono font-medium">20100</span>
                  {" "}— Admin: <span className="font-mono font-medium">admin</span> / <span className="font-mono font-medium">0000</span> / <span className="font-mono font-medium">00000</span>
                </p>
              )}

              <div className="pt-2 flex flex-col space-y-3">
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-12">
                  {isRegister ? "Inizia gratis" : "Accedi"}
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
        </CardContent>
      </Card>
    </div>
  );
}
