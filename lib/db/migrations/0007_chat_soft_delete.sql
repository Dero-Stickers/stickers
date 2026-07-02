-- 0007 — Eliminazione chat per-utente (soft-delete stile WhatsApp)
--
-- Ogni utente può eliminare una chat DAL PROPRIO lato: sparisce dalla sua lista
-- ma l'altro la conserva (nessuno cancella la copia altrui → policy + moderazione
-- salve). Quando ENTRAMBI hanno eliminato la chat, il backend cancella davvero
-- righe e messaggi (DB leggero, cascade su messages/reports/trade_confirmations).
--
-- Due flag booleani sulla tabella `chats`, uno per lato. Additivo e NON
-- distruttivo: colonne nuove con DEFAULT false, nessun dato esistente toccato.
BEGIN;

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS deleted_by_user1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_user2 boolean NOT NULL DEFAULT false;

COMMIT;
