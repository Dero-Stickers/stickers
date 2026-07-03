-- 0008 — Lista nera email (blocco a prova di aggiramento)
--
-- PROBLEMA: il blocco viveva SOLO sulla colonna users.is_blocked. Un utente
-- bloccato poteva eliminare il proprio account (hard delete della riga) e
-- re-iscriversi con la STESSA email → nuovo account pulito (is_blocked=false),
-- aggirando completamente il blocco. Nessuna traccia sopravviveva.
--
-- SOLUZIONE: una tabella persistente di email bandite, indipendente dalla riga
-- utente. Quando l'admin blocca un utente con email, l'email entra qui; quando
-- lo sblocca, esce. Login e registrazione rifiutano le email presenti in lista.
-- Sopravvive alla cancellazione dell'account → con quella email non ci si
-- re-iscrive più finché l'admin non sblocca.
--
-- Additivo e NON distruttivo: tabella nuova, nessun dato esistente toccato.
-- L'email è normalizzata in lower() a monte (coerente con users_email_lower_unique).
BEGIN;

CREATE TABLE IF NOT EXISTS public.blocked_emails (
  id          serial PRIMARY KEY,
  email       text NOT NULL,
  reason      text,
  blocked_at  timestamp NOT NULL DEFAULT now()
);

-- Unicità case-insensitive: una sola voce per email, qualunque sia il case.
CREATE UNIQUE INDEX IF NOT EXISTS blocked_emails_lower_unique
  ON public.blocked_emails (lower(email));

-- RLS: nessun accesso diretto dai client (solo il backend, via service role,
-- legge/scrive questa tabella). Attivare RLS senza policy = deny-all ai client
-- anon/authenticated, coerente con le tabelle di sola-moderazione.
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

COMMIT;
