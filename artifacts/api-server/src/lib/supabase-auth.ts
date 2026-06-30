/**
 * Verifica un access token di Supabase Auth chiamando il suo endpoint /user.
 * Usato per il "ponte identità": il frontend ottiene il token Supabase (login
 * Google / email) e lo invia qui; il backend lo verifica con Supabase e ricava
 * l'identità reale (id + email), poi crea/collega l'utente nel nostro DB e
 * rilascia il NOSTRO token HMAC. Così il resto dell'app non cambia.
 *
 * Niente dipendenze nuove: usa fetch nativo. Best-effort, non lancia mai verso
 * l'esterno valori sensibili.
 */

const SUPABASE_URL = (process.env["SUPABASE_URL"] ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? "";

export interface SupabaseIdentity {
  supabaseUserId: string; // UUID
  email: string | null;
  provider: string; // 'google' | 'email' | ...
  emailVerified: boolean;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Valida l'access token presso Supabase e ritorna l'identità, oppure null se
 * il token è assente/non valido/scaduto o se Supabase non è configurato.
 */
export async function verifySupabaseToken(
  accessToken: string,
): Promise<SupabaseIdentity | null> {
  if (!isSupabaseAuthConfigured()) return null;
  if (!accessToken || accessToken.length > 4096) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    const u = (await res.json()) as {
      id?: string;
      email?: string | null;
      app_metadata?: { provider?: string };
      user_metadata?: { email_verified?: boolean };
      email_confirmed_at?: string | null;
    };

    if (!u?.id) return null;

    return {
      supabaseUserId: u.id,
      email: u.email ?? null,
      provider: u.app_metadata?.provider ?? "email",
      emailVerified:
        Boolean(u.user_metadata?.email_verified) || Boolean(u.email_confirmed_at),
    };
  } catch {
    return null;
  }
}
