-- 0003 — Fondamenta monetizzazione: sblocco chat a pagamento
--
-- Modello: app 100% gratis e visibile; SI PAGA SOLO per sbloccare la chat di
-- un match. Due acquisti: 'single' (una chat) oppure 'all' (tutte, a vita).
-- La demo a tempo viene ELIMINATA (in una migrazione successiva di cleanup).
--
-- Questa migrazione è ADDITIVA e NON DISTRUTTIVA: crea due tabelle vuote e
-- alcune impostazioni. NON tocca dati esistenti, NON addebita nulla, NON
-- attiva alcun pagamento. L'interruttore master `chat_paywall_enabled` nasce
-- SPENTO (false): per gli utenti non cambia niente finché non lo accendiamo.
BEGIN;

-- 1) Pagamenti (audit/incassi). Importi in CENTESIMI interi (mai float).
CREATE TABLE IF NOT EXISTS public.payments (
  id            serial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider      text    NOT NULL,                 -- 'stripe' | 'paypal'
  kind          text    NOT NULL,                 -- 'single' | 'all'
  other_user_id integer REFERENCES public.users(id) ON DELETE SET NULL, -- solo 'single'
  amount_cents  integer NOT NULL,
  currency      text    NOT NULL DEFAULT 'EUR',
  status        text    NOT NULL DEFAULT 'pending', -- 'pending'|'paid'|'failed'|'refunded'
  provider_ref  text,                             -- id transazione provider (idempotenza)
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now()
);
-- provider_ref unico quando valorizzato (NULL multipli ammessi per i pending).
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_unique ON public.payments (provider_ref);
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id);

-- 2) Sblocchi di singola chat (coppia utente -> match). Le righe le crea SOLO
--    il webhook del pagamento confermato.
CREATE TABLE IF NOT EXISTS public.chat_unlocks (
  id            serial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  other_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id    integer REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at    timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_unlocks_pair_unique ON public.chat_unlocks (user_id, other_user_id);
CREATE INDEX IF NOT EXISTS chat_unlocks_user_idx ON public.chat_unlocks (user_id);

-- 3) RLS deny-by-default come tutte le altre tabelle (il backend `postgres`
--    bypassa; l'anon via PostgREST è bloccato). Nessuna policy = nessun accesso.
ALTER TABLE public.payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_unlocks ENABLE ROW LEVEL SECURITY;

-- 4) Impostazioni (idempotenti). Master SPENTO, prezzi placeholder modificabili
--    dall'admin. I prezzi sono in centesimi interi.
INSERT INTO public.app_settings (key, value, description) VALUES
  ('chat_paywall_enabled', 'false', 'Interruttore master: chat a pagamento. false = tutte le chat gratis.'),
  ('price_single_cents',   '199',   'Prezzo sblocco di UNA singola chat, in centesimi EUR.'),
  ('price_all_cents',      '999',   'Prezzo sblocco di TUTTE le chat (a vita), in centesimi EUR.'),
  ('paywall_currency',     'EUR',   'Valuta usata per gli sblocchi chat.')
ON CONFLICT (key) DO NOTHING;

COMMIT;
