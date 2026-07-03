# Utenti, Registrazione e Autenticazione

## Registrazione — Campi Obbligatori

| Campo | Note |
|-------|------|
| Nickname | **5-12 caratteri**; ammessi lettere, numeri, `-`, `_`, **ALFANUMERICO MISTO obbligatorio** (almeno una lettera E almeno un numero — no solo lettere, no solo numeri). Normalizzato a forma **canonica** (iniziale maiuscola, resto minuscolo, es. `marco95` → `Marco95`). **Unico in tutta l'app** (case-insensitive) — indice DB `users_nickname_lower_unique` su `lower(nickname)`. Regola in `auth.ts` (`NICKNAME_REGEX` + refine lettera/numero + `canonicalNickname`), identica lato frontend. **NON modificabile** dopo la creazione (scelto una volta in registrazione con conferma "non modificabile"): identità pubblica permanente → endpoint `PATCH /me/nickname` e voce Profilo "Cambia nickname" **rimossi** (giu 2026). **Login/recupero case-insensitive** (confronto `lower()`). |
| PIN personale | 4-6 cifre — **solo account storici**. I nuovi utenti entrano con Google/email (no PIN). |
| CAP/Codice Postale | **Solo geografia**, non fa parte dell'identità: serve per i match per vicinanza ed è **liberamente modificabile** dal Profilo (vedi sotto). |

> **Identità slegata dal CAP** (giu 2026). Il nickname è l'unica chiave d'identità (unico globale); il CAP è puro dato geografico. Questo rende l'accesso più semplice (solo nickname + PIN), il recupero indipendente dal CAP e il cambio zona privo di rischi. Migrazione: `lib/db/migrations/0001_nickname_global_unique.sql`.

## Campi NON obbligatori

- Email, password classica, Google/Apple login
- Numero di telefono, indirizzo personale, GPS, geolocalizzazione reale

## Accesso (moderno, giu 2026)

Schermata di accesso (`Login.tsx`) con **"Continua con Google"** in evidenza + accesso storico
**Nickname + PIN** come opzione secondaria. Architettura in `DNA/18_PIANO_AUTH.md`.
- **Google** (Supabase Auth): 1 tap → al primo accesso si sceglie nickname (permanente) + CAP
  (`/api/auth/social` + `/api/auth/social/complete`; ponte identità in `lib/supabase-auth.ts`).
  Utente social: nessun PIN (recupero via Google/email).
- **Nickname + PIN** (storico): invariato, sempre disponibile (il CAP non serve all'accesso). Usato anche dal pulsante dev **U/A** (`DevQuickSwitch`).
- **Email + password** e reset via email: previsti, attivabili quando c'è l'SMTP (Brevo) — vedi piano.
- Il dispositivo ricorda l'accesso finché l'utente non fa logout manuale.

## Blocco utente (moderazione, lug 2026) — a prova di aggiramento

Il blocco admin (`users.is_blocked`) è applicato su **4 livelli** (tutti rispondono
`403 ACCOUNT_BLOCKED`; il frontend mostra il modale "Account bloccato" condiviso
`components/auth/BlockedAccountDialog.tsx` con mailto al supporto — email in un'unica costante `SUPPORT_EMAIL`, provvisoria):
1. **Login** (PIN + Google/Email): respinto. Flusso social: `social-auth.ts` → `finishSocial` → stesso modale.
2. **Azioni a sessione aperta**: gate `requireAuth + requireNotBlocked` (`middlewares/auth.ts`) su
   `/user`, `/matches`, `/chats`, `/billing`; check inline su `location`/`export`/`delete` (sotto `/auth`).
   `GET /auth/me` resta accessibile (serve alla shell). Il frontend intercetta il 403 globalmente
   (`setAccountBlockedObserver` in `custom-fetch.ts` → `BlockedGate` in `App.tsx`: logout + modale).
3. **Lista nera email** (`blocked_emails`, mig. 0008): il blocco admin banna anche l'email
   (case-insensitive); login/registrazione la rifiutano **anche se l'account non esiste più**
   → eliminare l'account e re-iscriversi con la stessa email NON aggira il blocco.
4. **No auto-eliminazione**: un bloccato non può cancellare l'account (chiuderebbe la scappatoia).
Lo sblocco admin rimuove l'email dalla lista nera e ripristina tutto.

## Cambio Zona (CAP) — "modalità in vacanza"

- Dal **Profilo → Cambia zona**: l'utente imposta un nuovo CAP per cercare match in un'altra città.
- Endpoint `PATCH /api/auth/me/location` (autenticato, **niente PIN**: il CAP è solo geografia). Valida 5 cifre e **ricalcola l'area** (`deriveArea` in `auth.ts`: match esatto → prefisso provincia → generico).
- Non tocca login né recupero: l'identità (nickname) resta invariata.

## Recupero accesso (lug 2026 — semplificato)

Il vecchio recupero PIN (codice `STICK-XXXX-XXXX-XXXX` + domanda di sicurezza) è stato
**rimosso**: pagina `/recover`, endpoint `POST /recover`, `/recover/lookup`,
`/recover/answer`, `/recovery-code` e la voce Profilo "Il mio codice di recupero"
non esistono più. Le colonne DB `recovery_code`, `security_question`,
`security_answer_hash` restano (nullable) per gli account storici, ma non sono più
usate da alcun flusso.

- **Utenti nuovi (Google/email)**: il recupero è delegato al provider (Google) o al
  reset password via email (previsto quando c'è l'SMTP Brevo — vedi `18_PIANO_AUTH`).
- **Account storici (PIN)**: il login nickname+PIN resta attivo (lo usa anche il pulsante
  dev U/A). Non c'è più auto-recupero del PIN dall'app.

## Profilo Pubblico (visibile ad altri utenti)

- Nickname
- Area generica (basata su CAP, non indirizzo preciso)
- Statistiche scambi
- Affidabilità (basata su scambi completati)

## Eliminazione account (self-service, GDPR art. 17)

- Dal **Profilo → Elimina account**. Flusso in **due conferme** (azione irreversibile):
  1. scrivi `ELIMINA` → *Continua*; 2. "Sei davvero sicuro?" → *Elimina definitivamente*.
  Al termine un breve commiato ("Grazie per aver usato Stickers") poi logout.
- **Nessun PIN richiesto**: l'identità è già garantita dal token di sessione. Endpoint
  `DELETE /api/auth/me` con solo `{confirm:"ELIMINA"}`.
- **Utente bloccato**: non può auto-eliminarsi (403 `ACCOUNT_BLOCKED`) finché l'admin non
  lo sblocca — impedisce il trucco "mi cancello e mi re-iscrivo pulito". **Admin** non può
  auto-eliminarsi (403 `ADMIN_CANNOT_SELF_DELETE`).
