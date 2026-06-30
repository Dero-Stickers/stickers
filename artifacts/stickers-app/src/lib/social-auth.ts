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
  | { kind: "error"; message: string };

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
