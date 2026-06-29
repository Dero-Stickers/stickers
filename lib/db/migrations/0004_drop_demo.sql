-- 0004 — Cleanup demo a tempo (rimozione del vecchio modello "demo premium")
--
-- Il modello è cambiato: app 100% gratis e visibile, si paga SOLO per sbloccare
-- la chat (vedi 0003). La vecchia "demo premium a tempo" non esiste più. Questa
-- migrazione rimuove le colonne e le impostazioni residue.
--
-- SICUREZZA: usa IF EXISTS / DELETE mirati → idempotente e non rompe se gli
-- oggetti sono già assenti. NON tocca isPremium (= sblocco "tutte le chat"),
-- né le tabelle payments / chat_unlocks, né le impostazioni del paywall.
--
-- ⚠️ DA APPLICARE A MANO sul DB: questo file NON viene eseguito in automatico.
BEGIN;

-- 1) Colonne demo sulla tabella users (timestamp di inizio/scadenza demo).
ALTER TABLE public.users DROP COLUMN IF EXISTS demo_started_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS demo_expires_at;

-- 2) Impostazioni demo nella tabella chiave-valore app_settings.
--    - demo_hours          → durata della vecchia demo a tempo
--    - premium_demo_enabled → vecchio interruttore master (sostituito da
--                             chat_paywall_enabled, introdotto in 0003)
DELETE FROM public.app_settings WHERE key IN ('demo_hours', 'premium_demo_enabled');

COMMIT;
