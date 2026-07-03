-- 0009 — Categoria master degli album (Mondiali / Europei / Campionato)
--
-- PROBLEMA: la categoria di un album era DEDOTTA dal titolo (regex `/world cup/i`
-- lato UI): fragile (si rompe su titoli imprevisti) e non scalabile (ogni nuova
-- categoria = codice nuovo). Con 3+ categorie master serve un dato esplicito.
--
-- SOLUZIONE: colonna `category` sull'album. La assegna l'admin alla creazione;
-- i filtri utente (chip Mondiali/Europei/Campionato) e le icone derivano da qui.
-- Aggiungere una categoria futura = un valore in più, zero migrazioni.
--
-- Additivo e NON distruttivo: colonna nuova con DEFAULT 'campionato' (la
-- maggioranza degli album esistenti sono Calciatori). Backfill mirato sotto:
-- i Mondiali passano a 'mondiali'. Nessun dato preesistente perso.
BEGIN;

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'campionato';

-- Backfill: gli album Mondiali già presenti → 'mondiali' (finora distinti solo
-- dal titolo). Idempotente: rieseguire non cambia nulla.
UPDATE public.albums
  SET category = 'mondiali'
  WHERE category <> 'mondiali' AND title ILIKE '%world cup%';

COMMIT;
