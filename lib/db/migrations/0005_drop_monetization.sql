-- 0005 — Rimozione monetizzazione (l'app diventa 100% gratuita)
--
-- Il modello "si paga per sbloccare la chat" è stato ELIMINATO da tutto lo
-- stack (backend, frontend, spec API). L'app è ora completamente gratuita;
-- l'unico introito futuro sarà la donazione spontanea via Ko-fi (integrazione
-- separata, di sola lettura). Questa migrazione rimuove dal DB gli oggetti che
-- reggevano il paywall, creati in 0003.
--
-- SICUREZZA: usa IF EXISTS / DELETE mirati → idempotente, non rompe se gli
-- oggetti sono già assenti. Le tabelle rimosse sono VUOTE (paywall mai attivato,
-- checkout sempre stub) → nessuna perdita di dati reali.
--
-- SCELTA OWNER: la colonna users.is_premium NON viene rimossa: resta INERTE
-- (il codice non la legge/scrive più, il default resta false). Nessuna
-- operazione distruttiva su users.
--
-- ⚠️ DA APPLICARE A MANO sul DB: questo file NON viene eseguito in automatico.
BEGIN;

-- 1) Tabella degli sblocchi di singola chat. Va droppata PRIMA di payments:
--    ha una FK payment_id → payments(id).
DROP TABLE IF EXISTS public.chat_unlocks;

-- 2) Tabella pagamenti (audit/incassi). Mai usata realmente (checkout = stub).
DROP TABLE IF EXISTS public.payments;

-- 3) Impostazioni paywall nella tabella chiave-valore app_settings:
--    - chat_paywall_enabled → master switch (era sempre false)
--    - price_single_cents / price_all_cents / paywall_currency → prezzi sblocco
DELETE FROM public.app_settings
WHERE key IN ('chat_paywall_enabled', 'price_single_cents', 'price_all_cents', 'paywall_currency');

COMMIT;
