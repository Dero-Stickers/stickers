-- 0001 — Nickname unico GLOBALE (slegato dal CAP)
--
-- Il CAP smette di far parte dell'identità: diventa solo dato geografico,
-- liberamente modificabile dall'utente (es. modalità "in vacanza").
-- Identità, login e recupero si basano ora sul SOLO nickname, confrontato
-- in modo case-insensitive. Migrazione additiva e non distruttiva sui dati
-- (sostituisce un indice con un altro; nessuna riga toccata).
BEGIN;

-- 1) Guardia: niente nickname duplicati (case-insensitive) prima dell'indice unico.
DO $$
DECLARE dup int;
BEGIN
  SELECT count(*) INTO dup FROM (
    SELECT lower(nickname) FROM public.users GROUP BY lower(nickname) HAVING count(*) > 1
  ) t;
  IF dup > 0 THEN
    RAISE EXCEPTION 'Trovati % nickname duplicati (case-insensitive): risolvere prima di migrare.', dup;
  END IF;
END $$;

-- 2) Rimuove il vecchio vincolo "nickname unico per CAP".
DROP INDEX IF EXISTS public.users_nickname_cap_unique;

-- 3) Nuovo vincolo: nickname unico in tutta l'app (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_lower_unique
  ON public.users (lower(nickname));

COMMIT;
