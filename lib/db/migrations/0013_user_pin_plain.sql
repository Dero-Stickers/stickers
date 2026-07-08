-- 0013 — Colonna pin_plain: PIN in chiaro visibile solo all'admin nel pannello
--
-- CONTESTO: scelta esplicita dell'owner. L'app ha un singolo account admin e si
-- vuole poter RIVEDERE il PIN attuale dal pannello Impostazioni (non solo i
-- pallini di mascheramento). Il PIN resta verificato al login tramite pin_hash
-- (invariato); pin_plain è SOLO per la visualizzazione lato admin.
--
-- COSA FA: aggiunge la colonna nullable pin_plain a users. Additiva, idempotente
-- e non distruttiva: non tocca dati, non tocca pin_hash, nessun default. Gli
-- account social (senza PIN) restano NULL. I valori si popolano al prossimo
-- set/cambio PIN dal pannello admin; per gli account esistenti resta NULL finché
-- il PIN non viene reimpostato.
--
-- NOTA SICUREZZA: pin_plain è un dato sensibile. Non passa mai dal client via
-- PostgREST (la tabella è in RLS deny-all, cfr. 0012): lo legge solo il backend
-- Express, che lo espone esclusivamente all'admin autenticato.

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_plain text;
