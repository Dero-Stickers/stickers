-- 0012 — Difesa in profondità: togli i permessi inutili ad anon/authenticated
--
-- CONTESTO: tutte le tabelle di public hanno già la RLS attiva SENZA policy
-- (deny-all ai client via PostgREST). I dati non passano MAI dal browser: li
-- serve sempre il backend Express, che si connette come ruolo `postgres` e
-- bypassa la RLS. L'app non usa quindi i ruoli anon/authenticated per leggere o
-- scrivere tabelle (li usa solo per Realtime chat e login Google, che non
-- toccano queste tabelle).
--
-- PROBLEMA (difesa a strato singolo): a questi ruoli restano però i GRANT pieni
-- (SELECT/INSERT/UPDATE/DELETE...) sulle tabelle. Oggi la RLS li neutralizza,
-- ma è un solo lucchetto: se la RLS venisse disattivata anche solo su una
-- tabella, quei grant lascerebbero passare tutto. Il default hardening è
-- REVOCARE i privilegi non necessari, così restano DUE strati indipendenti.
--
-- COSA FA: revoca ogni privilegio di anon/authenticated su tutte le tabelle,
-- sequenze e funzioni ESISTENTI di public, e imposta gli stessi REVOKE come
-- default per gli oggetti FUTURI creati dal ruolo di migrazione. Non tocca la
-- RLS, non tocca il ruolo `postgres` (il backend continua a funzionare identico),
-- non tocca dati. Additiva, idempotente e sicura: REVOKE è un'operazione che al
-- massimo non trova nulla da togliere (nessun errore, nessun dato perso).
--
-- NOTA Realtime: la chat usa il canale broadcast di Supabase, non la lettura di
-- tabelle via anon. Questi REVOKE non toccano il broadcast e non degradano la
-- chat. Se in futuro si volesse Realtime "Postgres Changes" su una tabella,
-- servirà un GRANT SELECT mirato + policy dedicata (scelta esplicita, non un
-- permesso residuo lasciato aperto per caso).
BEGIN;

-- 1) Tabelle esistenti: via ogni privilegio dai due ruoli client.
REVOKE ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;

-- 2) Sequenze e funzioni esistenti: stesso principio (nulla di necessario ai client).
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3) Oggetti FUTURI: qualunque tabella/sequenza/funzione creata d'ora in poi dal
--    ruolo corrente NON concede automaticamente privilegi ad anon/authenticated.
--    Evita che una tabella nuova nasca di nuovo "aperta" ai client per default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated;

COMMIT;
