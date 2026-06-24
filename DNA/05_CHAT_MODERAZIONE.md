# Chat e Moderazione

## Struttura Chat

- Una sola chat per coppia di utenti (multi-album)
- La chat è integrata nella sezione Match (NON footer separato)
- Si apre solo da un match valido
- Disponibile solo per utenti premium o con demo attiva

## Avviso Moderazione

Testo mostrato in chat:
> "Per sicurezza e moderazione, i messaggi possono essere verificati dall'admin in caso di necessità o segnalazione."

## Funzionalità Admin sulla Chat

- Vedere le chat se necessario
- Revisionare chat in caso di segnalazione
- Bloccare un utente
- Chiudere una chat problematica

## Segnalazione

- Bottone "Segnala" dentro la chat o il profilo utente
- Segnalazioni visibili in admin

## Sicurezza Chat

- Messaggi salvati su DB
- Chat collegata ai due utenti (non all'album)
- Stato chat: attiva / chiusa
- Blocco utente
- Tracciamento azioni admin

## Notifica Bell

- Campanella nella UI con badge
- Badge = numero di chat con nuovi messaggi NON LETTI (non il totale messaggi)
- Es. 3 chat con nuovi messaggi → badge mostra 3

## Aggiornamento in tempo reale (Supabase Realtime — Broadcast)

- I messaggi si aggiornano via **Supabase Realtime Broadcast**, non più con polling a 5s.
- Architettura sicura: l'app usa auth custom (HMAC), non Supabase Auth → niente
  `postgres_changes`. Il backend (`lib/realtime.ts`) invia un **segnale leggero**
  (`event: refresh`, **nessun contenuto del messaggio**) su due topic, all'invio di
  ogni messaggio in `routes/chats.ts`:
  - `chat:{chatId}` → la stanza aperta ricarica i messaggi
  - `user:{recipientId}` → il destinatario aggiorna il badge non-letti
- Il client (`lib/supabase.ts` + hook `useRealtimeSignal.ts`) si iscrive al topic e al
  segnale ricarica i dati **dall'API Express autenticata** (unico gatekeeper del contenuto).
- **Fallback**: se le env Supabase mancano o il realtime non è disponibile, la chat resta
  funzionante via polling lento (30s) + refetch al focus. Degradazione senza crash.
- Broadcast lato server con `SUPABASE_SERVICE_ROLE_KEY` (mai esposta al client); il client
  usa solo `VITE_SUPABASE_ANON_KEY`.
