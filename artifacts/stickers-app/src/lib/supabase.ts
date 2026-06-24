import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase usato ESCLUSIVAMENTE per Realtime (broadcast) della chat.
 * Singleton lazy: creato al primo uso e riusato.
 *
 * Se le variabili VITE_SUPABASE_* non sono configurate, ritorna `null`: la chat
 * continua a funzionare via polling di fallback, senza alcun crash.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!url || !anonKey) {
    client = null;
    return client;
  }
  client = createClient(url, anonKey, {
    // Nessuna sessione/auth Supabase: l'app usa auth custom lato Express.
    auth: { persistSession: false, autoRefreshToken: false },
    // Tetto di eventi/s per restare comodi nei limiti del free tier.
    realtime: { params: { eventsPerSecond: 2 } },
  });
  return client;
}

/**
 * True se il Realtime è configurato (env presenti). Usato per dimensionare il
 * polling di fallback: raro quando il realtime è attivo, più frequente quando no.
 */
export function isRealtimeAvailable(): boolean {
  return getSupabaseClient() !== null;
}
