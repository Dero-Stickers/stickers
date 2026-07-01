/**
 * Helper per l'accesso social (Google / email) lato client.
 *
 * Flusso Google:
 *  1. startGoogleLogin() → Supabase reindirizza a Google e ritorna all'app.
 *  2. Al ritorno, Supabase mette la sessione nell'URL (detectSessionInUrl).
 *     completeSocialLogin() legge l'access token e lo invia al NOSTRO backend
 *     (/api/auth/social), che verifica e: fa login OPPURE chiede di completare
 *     il profilo (nickname + CAP) → /api/auth/social/complete.
 *
 * Niente di tutto questo tocca la chat realtime: usa il client auth dedicato.
 */
import { getSupabaseAuthClient } from "@/lib/supabase";
import type { UserProfile } from "@workspace/api-client-react";

export type SocialResult =
  | { kind: "logged_in"; user: UserProfile; token: string }
  | { kind: "needs_profile"; accessToken: string; email: string | null }
  | { kind: "blocked" } // account bloccato: la UI mostra il modale con l'email supporto
  | { kind: "error"; message: string };

// Il backend risponde con questi codici quando l'account è sospeso. Serve a
// distinguere il blocco da un errore generico e mostrare il modale coerente.
function isBlockedError(j: any): boolean {
  return j?.error === "BLOCKED" || j?.error === "ACCOUNT_BLOCKED";
}

/** Avvia il login con Google (redirect). Ritorna false se non configurato. */
export async function startGoogleLogin(): Promise<boolean> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return false;
  const redirectTo = `${window.location.origin}/login`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return !error;
}

/** Restituisce l'access token Supabase della sessione corrente, se presente. */
export async function getSocialAccessToken(): Promise<string | null> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Scambia un access token Supabase col nostro backend. */
export async function exchangeWithBackend(accessToken: string): Promise<SocialResult> {
  try {
    const res = await fetch("/api/auth/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j?.needsProfile) {
      return { kind: "needs_profile", accessToken, email: j.email ?? null };
    }
    if (res.ok && j?.token) {
      return { kind: "logged_in", user: j.user, token: j.token };
    }
    if (isBlockedError(j)) return { kind: "blocked" };
    return { kind: "error", message: j?.message ?? "Accesso non riuscito" };
  } catch {
    return { kind: "error", message: "Errore di connessione" };
  }
}

/**
 * Da chiamare al caricamento della pagina di login: se c'è una sessione social
 * appena creata (ritorno da Google), la scambia col backend. Ritorna null se
 * non c'è nessuna sessione social in sospeso.
 */
export async function completeSocialLogin(): Promise<SocialResult | null> {
  const token = await getSocialAccessToken();
  if (!token) return null;
  return exchangeWithBackend(token);
}

/** Completa la registrazione social con nickname + CAP scelti dall'utente. */
export async function completeSocialProfile(input: {
  accessToken: string;
  nickname: string;
  cap: string;
}): Promise<SocialResult> {
  try {
    const res = await fetch("/api/auth/social/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, acceptTerms: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j?.token) return { kind: "logged_in", user: j.user, token: j.token };
    if (isBlockedError(j)) return { kind: "blocked" };
    return { kind: "error", message: j?.message ?? "Registrazione non riuscita" };
  } catch {
    return { kind: "error", message: "Errore di connessione" };
  }
}

/** Pulisce la sessione Supabase locale (dopo lo scambio col nostro token). */
export async function clearSocialSession(): Promise<void> {
  const supabase = getSupabaseAuthClient();
  if (supabase) await supabase.auth.signOut().catch(() => {});
}

// ---------------------------------------------------------------------------
// Email + password (via Supabase Auth)
// ---------------------------------------------------------------------------

export type EmailResult =
  | SocialResult
  | { kind: "confirm_email"; email: string }; // registrazione: serve conferma via email

/**
 * Registra un nuovo utente con email + password. Con "Confirm email" attivo,
 * Supabase NON crea subito una sessione: manda una mail di conferma. L'utente
 * conferma, poi torna ad accedere (e lì parte il ponte identità).
 */
export async function emailSignUp(email: string, password: string): Promise<EmailResult> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return { kind: "error", message: "Accesso via email non disponibile" };
  const emailRedirectTo = `${window.location.origin}/login`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) return { kind: "error", message: traduciAuthError(error.message) };
  // Se la conferma è richiesta, non c'è sessione: chiediamo di controllare la mail.
  if (!data.session) return { kind: "confirm_email", email };
  // Conferma disattivata: sessione subito → scambio col backend.
  return exchangeWithBackend(data.session.access_token);
}

/** Accesso con email + password già registrata e confermata. */
export async function emailSignIn(email: string, password: string): Promise<EmailResult> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return { kind: "error", message: "Accesso via email non disponibile" };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { kind: "error", message: traduciAuthError(error.message) };
  if (!data.session) return { kind: "error", message: "Accesso non riuscito" };
  return exchangeWithBackend(data.session.access_token);
}

/** Invia il link di reset password all'email indicata. */
export async function emailResetPassword(email: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return { ok: false, message: "Servizio non disponibile" };
  const redirectTo = `${window.location.origin}/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, message: traduciAuthError(error.message) };
  return { ok: true };
}

/** Traduce in italiano i messaggi d'errore più comuni di Supabase Auth. */
function traduciAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email o password non corretti.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Questa email è già registrata. Prova ad accedere.";
  if (m.includes("email not confirmed")) return "Conferma prima la tua email (controlla la posta).";
  if (m.includes("password") && m.includes("least")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("rate") || m.includes("too many")) return "Troppi tentativi. Riprova tra poco.";
  if (m.includes("for security purposes")) return "Attendi qualche secondo prima di riprovare.";
  return "Si è verificato un problema. Riprova.";
}
