-- 0010 — Tabella donazioni (Ko-fi)
--
-- L'app è 100% gratuita: l'unico introito sono le donazioni spontanee via Ko-fi
-- (liberalità, non sbloccano nulla). Ko-fi consegna ogni contributo via webhook
-- POST /api/kofi/webhook (verificato col token); qui lo salviamo per mostrarlo
-- nel pannello admin → Donazioni (sola lettura). Nessun pagamento passa dall'app.
--
-- SICUREZZA: additiva e idempotente (IF NOT EXISTS). Non tocca nessuna tabella
-- o dato esistente. `kofi_message_id` UNIQUE = idempotenza (Ko-fi può ritentare
-- la consegna dello stesso messaggio → niente doppioni).
BEGIN;

CREATE TABLE IF NOT EXISTS public.donations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kofi_message_id     text NOT NULL,
  from_name           text,
  message             text,
  amount              numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'EUR',
  type                text,
  kofi_transaction_id text,
  is_public           text,
  raw                 jsonb,
  created_at          timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS donations_kofi_message_unique
  ON public.donations (kofi_message_id);

CREATE INDEX IF NOT EXISTS donations_created_idx
  ON public.donations (created_at);

COMMIT;
