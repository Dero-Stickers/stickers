-- 0011 — Inviti a donare (una tantum, dall'admin all'utente)
--
-- L'admin, dalla pagina Utenti, può inviare a un utente attivo un gentile invito
-- a sostenere l'app con una donazione LIBERA via Ko-fi. Non sblocca nulla, l'app
-- resta gratuita: è solo un grazie. L'utente vede l'invito UNA volta al prossimo
-- accesso (modale), poi non ricompare più.
--
-- STORICO ANTI-SPAM: `sent_at` (quando l'admin ha invitato) e `seen_at` (quando
-- l'utente l'ha visto; NULL = non ancora) permettono all'admin di sapere a chi
-- ha già scritto e non ripetere l'invito. Un solo invito per utente (UNIQUE su
-- user_id): un secondo "Invita" aggiorna quello esistente.
--
-- SICUREZZA: additiva e idempotente (IF NOT EXISTS). Non tocca dati esistenti.
-- RLS attiva senza policy → accesso solo dal backend (service role), come le
-- altre tabelle del progetto.
BEGIN;

CREATE TABLE IF NOT EXISTS public.donation_nudges (
  id       serial PRIMARY KEY,
  user_id  integer NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  sent_at  timestamp NOT NULL DEFAULT now(),
  seen_at  timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS donation_nudges_user_unique
  ON public.donation_nudges (user_id);

ALTER TABLE public.donation_nudges ENABLE ROW LEVEL SECURITY;

COMMIT;
