# DNA — Scheda di lavoro: nuovo sistema di accesso (auth)

> Documento di **pianificazione** (non ancora implementato). Lo aggiorniamo mano a mano.
> Obiettivo: accesso moderno, semplice e sicuro, a **costo zero** fino a 2.000-3.000 utenti.

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
- **STEP 1:** registrazioni esterne (Google Cloud, Brevo) — guidate.
- **STEP 2:** abilitare Supabase Auth (Google + Email) lato config; collegare SMTP.
- **STEP 3:** nuova schermata di accesso (Google/Email) + schermata "Completa profilo" (nickname+CAP).
- **STEP 4:** ponte identità: collegare l'utente Supabase Auth all'utente nel nostro DB; mantenere
  login legacy nickname+PIN per gli esistenti.
- **STEP 5:** recupero via email (reset password) e ritiro di domanda di sicurezza + codice STICK.
- **STEP 6:** aggiornare privacy (login Google = dato in più) e DNA `02_UTENTI_AUTENTICAZIONE.md`.

## 9. Aperto / da decidere più avanti

- Tenere "Continua con Apple"? (utile su iOS, ma richiede account Apple Developer **a pagamento** →
  per ora **escluso** dal vincolo costi).
- Migrazione utenti legacy: invitarli a collegare email/Google al prossimo accesso (facoltativo).
