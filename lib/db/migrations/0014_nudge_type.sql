-- 0014 — Tipo di invito sul nudge (dona | condividi)
--
-- CONTESTO: `donation_nudges` gestiva un solo tipo di invito una-tantum (donare).
-- Aggiungiamo un secondo tipo, "condividi l'app", che l'admin invia a sua
-- discrezione e che è RIPETIBILE (riarmabile): rinviandolo, l'utente lo rivede.
--
-- MODIFICA (additiva, non distruttiva):
--  1) colonna `type` TEXT NOT NULL DEFAULT 'dona' → tutti i nudge esistenti
--     restano "dona", nessun dato cambia di significato.
--  2) il vincolo di unicità passa da (user_id) a (user_id, type): così lo stesso
--     utente può avere UN invito-dona E UN invito-condividi, non due dello stesso
--     tipo. L'invio ripetuto aggiorna la riga esistente (upsert su questo indice).
--
-- Reversibile: DROP della colonna e ripristino del vincolo su (user_id).

BEGIN;

ALTER TABLE public.donation_nudges
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'dona';

-- Sostituisci il vincolo "uno per utente" con "uno per (utente, tipo)".
DROP INDEX IF EXISTS donation_nudges_user_unique;
CREATE UNIQUE INDEX IF NOT EXISTS donation_nudges_user_type_unique
  ON public.donation_nudges (user_id, type);

COMMIT;
