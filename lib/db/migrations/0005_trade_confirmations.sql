-- 0005 — Conferma scambio concluso (trade confirmations)
--
-- Quando due collezionisti hanno completato di persona uno scambio, ciascuno
-- conferma DAL PROPRIO lato. La conferma aggiorna SOLO l'album di chi conferma
-- (doppie cedute → posseduta, mancanti ricevute → posseduta): nessuna scrittura
-- sull'album dell'altro, stesso modello di sicurezza dell'aggiornamento manuale.
-- I match si ricalcolano da soli dallo stato delle figurine.
--
-- Questa migrazione è ADDITIVA e NON DISTRUTTIVA: crea una sola tabella vuota.
-- Non tocca dati esistenti.
BEGIN;

-- Una riga per (chat, utente): registra che quell'utente ha confermato lo
-- scambio in quella chat e quante figurine ha applicato per lato. L'upsert
-- aggiorna la riga su una nuova conferma (scambio parziale successivo).
CREATE TABLE IF NOT EXISTS public.trade_confirmations (
  id             serial PRIMARY KEY,
  chat_id        integer NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id        integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  given_count    integer NOT NULL DEFAULT 0,   -- figurine cedute applicate (doppia→posseduta)
  received_count integer NOT NULL DEFAULT 0,   -- figurine ricevute applicate (mancante→posseduta)
  created_at     timestamp NOT NULL DEFAULT now(),
  updated_at     timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS trade_confirmations_chat_user_unique
  ON public.trade_confirmations (chat_id, user_id);

-- RLS deny-by-default come tutte le altre tabelle (il backend `postgres`
-- bypassa; l'anon via PostgREST è bloccato). Nessuna policy = nessun accesso.
ALTER TABLE public.trade_confirmations ENABLE ROW LEVEL SECURITY;

COMMIT;
