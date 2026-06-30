-- 0006 — Accesso moderno: Google / Email (Supabase Auth) accanto a nickname+PIN
--
-- Obiettivo: permettere l'accesso con "Continua con Google" e con email,
-- mantenendo gli utenti storici nickname+PIN. Un utente che entra con Google
-- NON ha PIN né domanda di sicurezza, quindi quei campi diventano OPZIONALI.
-- Migrazione ADDITIVA e non distruttiva: nessuna riga esistente viene toccata.
BEGIN;

-- 1) Nuove colonne identità esterna (tutte opzionali).
--    - email: email dell'utente (da Google o registrazione email)
--    - auth_provider: 'pin' (storico), 'google', 'email'
--    - supabase_user_id: UUID dell'utente in Supabase Auth (ponte identità)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'pin',
  ADD COLUMN IF NOT EXISTS supabase_user_id uuid;

-- 2) PIN e domanda di sicurezza diventano OPZIONALI: gli utenti Google/email
--    non li hanno. Gli storici restano invariati (valore già presente).
ALTER TABLE public.users ALTER COLUMN pin_hash DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN security_question DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN security_answer_hash DROP NOT NULL;

-- 3) recovery_code: storicamente NOT NULL UNIQUE. Per gli utenti Google/email
--    non serve (il recupero passa da Google/email). Lo rendiamo opzionale ma
--    manteniamo l'unicità SOLO sui valori presenti (indice unico parziale).
ALTER TABLE public.users ALTER COLUMN recovery_code DROP NOT NULL;
-- Sostituisce il vincolo UNIQUE pieno con uno parziale (ignora i NULL).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_recovery_code_unique;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_recovery_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_recovery_code_unique_idx
  ON public.users (recovery_code) WHERE recovery_code IS NOT NULL;

-- 4) Unicità di email e supabase_user_id, ma SOLO sui valori presenti
--    (indici parziali: più utenti storici hanno email/uuid NULL e non collidono).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON public.users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_user_id_unique
  ON public.users (supabase_user_id) WHERE supabase_user_id IS NOT NULL;

COMMIT;
