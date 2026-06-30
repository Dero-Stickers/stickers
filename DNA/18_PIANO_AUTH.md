# DNA — Sistema di accesso (auth)

> Obiettivo: accesso moderno, semplice e sicuro, a **costo zero** fino a 2.000-3.000 utenti.
> Stato: **Google + Email/password fatti e verificati** (giu 2026). Le email partono via Brevo
> (consegnate, ma su dominio gratuito → finiscono in SPAM: serve un dominio proprio per la prod).

## 0. Configurazione e credenziali (riferimento operativo)

> Valori non sensibili qui; i segreti stanno in `.env` / App Control / Render (mai nel repo).

**Account & servizi**
- **Email Google Auth (owner/admin del progetto OAuth):** `dero975@gmail.com`. È l'account Google
  con cui è stato creato il progetto Cloud e la schermata di consenso; è anche l'email di contatto
  assistenza/sviluppatore. (L'email di supporto pubblica dell'app resta l'hotmail `stickersmatchbox@hotmail.com`.)
- **Google Cloud project:** nome **"stikers"** (ID progetto `stikers-500923`), console.cloud.google.com.
  - OAuth: tipo app **Esterno**; schermata di consenso "Stickers".
  - **Client OAuth "Web"**: tipo Applicazione web. Client ID e Secret salvati in Supabase (provider
    Google) e tracciati come segreti — NON in chiaro nel DNA.
  - **Origini JS autorizzate:** `https://kuigzaqaewgcosfhahkv.supabase.co`
  - **Redirect URI autorizzato:** `https://kuigzaqaewgcosfhahkv.supabase.co/auth/v1/callback`
- **Supabase (progetto `kuigzaqaewgcosfhahkv`)** → Authentication:
  - Provider **Google = ON** (Client ID + Secret di Google Cloud incollati lì).
  - **URL Configuration:** Site URL = `https://stickers-matchbox.onrender.com`; Redirect URLs =
    `https://stickers-matchbox.onrender.com/**` e `http://localhost:5001/**`.
  - "Confirm email" resta ON (vale per email/password; Google è già verificato → nessuna mail).
- **Render (`stickers-matchbox`):** env necessarie all'auth **già presenti** — backend
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`; build frontend `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Brevo (SMTP per email/password):** ✅ attivo. Account "Stickers" (login Brevo `dero975@gmail.com`),
  piano gratuito 300 email/giorno. SMTP `smtp-relay.brevo.com:587`, login `b06283001@smtp-brevo.com`,
  chiave in `.env`/App Control (`BREVO_SMTP_*`). Configurato in Supabase → Auth → Emails → custom SMTP.
  **Mittente verificato: `dero975@gmail.com`** (l'hotmail NON è verificato su Brevo → non usarlo come sender).
  ⚠️ Dominio gratuito → le mail risultano "Consegnate" ma cadono in SPAM. Fix prod = dominio proprio + DKIM/DMARC.
  Template email personalizzati (conferma + reset) in `artifacts/api-server/email-templates/`, incollati in Supabase.

**Mappa file (dove vive cosa)**
- Frontend: `pages/auth/Login.tsx` (schermata + `CompleteProfile`), `lib/social-auth.ts` (flusso),
  `lib/supabase.ts` (`getSupabaseAuthClient` client auth dedicato), `components/brand/GoogleIcon.tsx`.
- Backend: `lib/supabase-auth.ts` (verifica token Supabase), `routes/auth.ts`
  (`POST /api/auth/social`, `POST /api/auth/social/complete`).
- DB: migrazione `lib/db/migrations/0006_auth_providers.sql`; schema `lib/db/src/schema/users.ts`.

**Colonne DB aggiunte (0006, additiva, applicata)**
- `email` (text, nullable), `auth_provider` (text NOT NULL default `'pin'` → `'pin'|'google'|'email'`),
  `supabase_user_id` (uuid, nullable). Resi nullable: `pin_hash`, `security_question`,
  `security_answer_hash`, `recovery_code`. Indici unici **parziali** (solo valori non NULL) su email,
  supabase_user_id, recovery_code. Gli utenti storici restano `auth_provider='pin'`.

**Come funziona il "ponte identità" (in breve)**
1. L'utente fa "Continua con Google" → Supabase autentica e torna all'app con un access token.
2. Il frontend invia il token a `POST /api/auth/social`; il backend lo **verifica presso Supabase**
   (`/auth/v1/user`) ricavando `supabase_user_id` + email.
3. Se l'utente esiste (per uuid o email) → login e rilascio del **nostro** token HMAC. Se è nuovo →
   risposta `needsProfile` → schermata "Completa profilo" → `POST /api/auth/social/complete` crea
   l'utente (nickname permanente + CAP, senza PIN) e rilascia il nostro token.
4. Da qui in poi l'app usa il token HMAC di sempre: nessun'altra parte cambia.

## 1. Perché cambiamo (problema attuale)

Oggi: registrazione con 5 campi (nickname, PIN, CAP, domanda+risposta di sicurezza) e un
**codice STICK da salvare a mano**. Se l'utente non lo salva e dimentica il PIN → **perde
l'account e gli acquisti**. Fuori standard, fragile, causa di possibili recensioni negative.

## 2. Decisioni prese (con l'owner)

1. **Adottare Supabase Auth** (già nel progetto, oggi usato solo per la chat) come motore di accesso.
2. Schermata di accesso con: **Continua con Google** · **Continua con Email** (email+password).
3. **Nickname**: resta identità pubblica obbligatoria, scelto **una volta** al primo accesso, con
   **conferma** ("non sarà modificabile").
4. **Nickname NON modificabile** dopo la creazione → rimuovere la voce "Cambia nickname" dal Profilo
   e bloccare l'endpoint. (Tecnicamente sicuro: chat/segnalazioni usano l'ID, non il testo.)
5. **Nickname alfanumerico OBBLIGATORIO**: deve contenere **almeno una lettera E almeno un numero**
   (no solo lettere, no solo numeri). Oggi NON è così → da correggere.
6. **Eliminare**: domanda di sicurezza, codice STICK come recupero, i 5 campi insieme.
7. **CAP**: chiesto **dopo** il primo accesso (è solo geografia, non identità).
8. **Compatibilità**: chi ha già nickname+PIN continua a entrare (non lasciare nessuno fuori).
9. **SSO aziendale**: NON serve (è un'app consumer) → escluso.

## 3. Flusso utente finale (target)

**Registrazione**
- Google: 1 tap → schermata "Completa profilo" (scegli nickname + CAP, conferma) → dentro.
- Email: email + password → "Completa profilo" (nickname + CAP) → dentro.

**Login**
- Di norma l'app ricorda la sessione (resta dentro). Al bisogno: stesso metodo di registrazione
  (Google, oppure email+password). Il nickname ricompare da solo.

**Recupero**
- Google: nessun recupero da fare (ci pensa Google).
- Email: "Password dimenticata?" → link via email → nuova password. Automatico.
- Account/album/acquisti si ritrovano legati all'identità.

## 4. Vincolo "niente a pagamento" — numeri verificati (giu 2026)

| Voce | Free | A 3.000 utenti | Esito |
|------|------|----------------|-------|
| Utenti auth (MAU) Supabase | 50.000 inclusi | 3.000 | ✅ 6% del limite |
| Login Google (non manda email) | illimitato | — | ✅ gratis |
| Email interne Supabase | **solo 2/ora** | insufficiente | ⚠️ serve SMTP esterno |
| SMTP gratuito (Brevo) | **300 email/giorno** | sufficiente | ✅ gratis |

Conclusione: **costo zero** fino ai numeri previsti e oltre.

## 5. Registrazioni che servono all'owner (gratuite)

1. **Google Cloud Console** (gratis) → creare progetto + credenziali OAuth per "Continua con Google".
2. **Brevo** (o simile, gratis) → SMTP per le email di recupero/conferma.
3. **Supabase** → già attivo, nessuna nuova registrazione.

> Guiderò io ogni registrazione passo-passo, una azione alla volta, quando si implementa.

## 6. Sezione "Segnala un problema" — stato attuale (VERIFICATO)

- I messaggi di **Profilo → Segnala un problema** **arrivano GIÀ in admin → Segnalazioni**
  (salvati in `error_reports` come tipo `user_report`). **Nessuna registrazione esterna serve**:
  è tutto interno (app + Supabase). Già consolidato in un'unica piattaforma. ✅
- Nota: l'admin **"Messaggi"** è un'altra cosa (moderazione delle chat tra utenti), da non confondere.

## 7. Cosa NON cambia / da preservare

- Identità tecnica = **ID utente** (chat/messaggi/segnalazioni lo usano già) → cambi di auth non
  rompono i collegamenti.
- Nickname unico in tutta l'app (indice DB `users_nickname_lower_unique`).
- Sicurezza esistente (RLS, sanitizer, rate-limit) resta.

## 8. Piano di implementazione (a step, con conferme — DA FARE)

> Ogni step che tocca DB/auth si ferma per conferma. Niente push senza ok.

- **STEP 0 — ✅ FATTO (giu 2026):** nickname alfanumerico misto obbligatorio (frontend+backend),
  rimozione "Cambia nickname" (UI Profilo + endpoint `PATCH /me/nickname` + schema/costanti),
  avviso "non modificabile" in registrazione. Verificato via API (solo lettere/solo numeri → 400).
- **STEP 1 — ✅ FATTO:** Google Cloud OAuth creato (progetto "stikers"), client web con redirect
  Supabase. Brevo (email) = ancora da fare (serve per email/password e reset).
- **STEP 2 — ✅ FATTO (Google):** Supabase Auth → provider Google abilitato (client id+secret),
  URL Configuration impostata (Site URL Render + redirect Render/localhost). Email provider = quando c'è Brevo.
- **STEP 3 — ✅ FATTO:** schermata accesso moderna (`Login.tsx`): "Continua con Google" in evidenza,
  nickname+PIN come opzione secondaria; schermata "Completa profilo" (nickname permanente + CAP).
- **STEP 4 — ✅ FATTO:** ponte identità. Backend `lib/supabase-auth.ts` (verifica access token presso
  Supabase) + `POST /api/auth/social` (login o needsProfile) + `POST /api/auth/social/complete`
  (crea utente social). Frontend `lib/social-auth.ts`. Migrazione 0006 (email/auth_provider/
  supabase_user_id; PIN/domanda/recovery_code nullable). Login legacy nickname+PIN intatto.
  **Verificato end-to-end in locale** (login Google reale → profilo → app).
- **STEP 5 — ✅ FATTO (giu 2026):** "Continua con Email" (registrazione + accesso + reset password) via
  Supabase Auth/Brevo. Frontend: `pages/auth/EmailAuth.tsx` (form con conferma password + occhio mostra/
  nascondi, avviso "controlla lo SPAM"), funzioni in `lib/social-auth.ts` (`emailSignUp`/`emailSignIn`/
  `emailResetPassword`). Verificato end-to-end (registrazione → mail consegnata → in spam per dominio gratuito).
- **STEP 6 — DA FARE:** (1) **dominio email proprio** + DKIM/DMARC su Brevo per uscire dallo spam (prod);
  (2) ritiro domanda di sicurezza + codice STICK per i nuovi utenti; (3) privacy/policy (login Google = dato
  in più). Env Render: **già presenti tutte e 4** (`SUPABASE_URL`/`SUPABASE_ANON_KEY` backend + `VITE_SUPABASE_URL`/
  presenti tutte e 4** (`SUPABASE_URL`/`SUPABASE_ANON_KEY` backend + `VITE_SUPABASE_URL`/
  `VITE_SUPABASE_ANON_KEY` build) → il social parte in produzione senza altri interventi. Sono in
  Render ma NON in `render.yaml`: se un giorno si ricrea il servizio da blueprint, vanno re-inserite.

## 9. Aperto / da decidere più avanti

- Tenere "Continua con Apple"? (utile su iOS, ma richiede account Apple Developer **a pagamento** →
  per ora **escluso** dal vincolo costi).
- Migrazione utenti legacy: invitarli a collegare email/Google al prossimo accesso (facoltativo).
