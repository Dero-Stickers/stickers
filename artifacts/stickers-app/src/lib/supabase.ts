import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase usato ESCLUSIVAMENTE per Realtime (broadcast) della chat.
 * Singleton lazy: creato al primo uso e riusato.
 *
 * Se le variabili VITE_SUPABASE_* non sono configurate, ritorna `null`: la chat
 * continua a funzionare via polling di fallback, senza alcun crash.
 */
/**
 * Normalizza l'URL Supabase: deve essere un http(s) valido. Se il valore è
 * assente o malformato (es. con un prefisso "NOME=" incollato per errore nelle
 * variabili d'ambiente), ritorna `null` invece di propagare un valore che
 * farebbe lanciare `createClient` e crasherebbe l'intera app.
 */
function sanitizeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

const url = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "").trim() || null;

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!url || !anonKey) {
    client = null;
    return client;
  }
  try {
    client = createClient(url, anonKey, {
      // Nessuna sessione/auth Supabase: l'app usa auth custom lato Express.
      auth: { persistSession: false, autoRefreshToken: false },
      // Tetto di eventi/s per restare comodi nei limiti del free tier.
      realtime: { params: { eventsPerSecond: 2 } },
    });
  } catch (err) {
    // Una config realtime errata NON deve mai abbattere l'app: si degrada al
    // polling di fallback della chat.
    console.warn("[supabase] init realtime non riuscita, uso il polling:", err);
    client = null;
  }
  return client;
}

/**
 * True se il Realtime è configurato (env presenti). Usato per dimensionare il
 * polling di fallback: raro quando il realtime è attivo, più frequente quando no.
 */
export function isRealtimeAvailable(): boolean {
  return getSupabaseClient() !== null;
}
