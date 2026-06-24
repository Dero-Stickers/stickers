/**
 * Realtime broadcast — segnale leggero "qualcosa è cambiato".
 *
 * Invia un evento broadcast su un topic Supabase Realtime via HTTP, così i
 * client iscritti possono ricaricare i dati dall'API autenticata. Il payload
 * NON contiene mai il contenuto del messaggio: è solo un segnale di refresh.
 * Express resta l'unico gatekeeper del contenuto.
 *
 * Fire-and-forget: non blocca mai la risposta e non solleva eccezioni verso il
 * chiamante. Se Supabase non è configurato/raggiungibile, è un no-op silenzioso
 * (il polling di fallback lato client garantisce comunque la consegna).
 */
export function broadcast(topic: string, payload: Record<string, unknown>): void {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return;

  const body = JSON.stringify({
    messages: [{ topic, event: "refresh", payload }],
  });

  void fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body,
  }).catch(() => {
    /* best-effort: ignora gli errori, ci pensa il fallback di polling */
  });
}
