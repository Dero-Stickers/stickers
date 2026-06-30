# Utenti, Registrazione e Autenticazione

## Registrazione — Campi Obbligatori

| Campo | Note |
|-------|------|
| Nickname | **5-12 caratteri**; ammessi lettere, numeri, `-`, `_`, **ALFANUMERICO MISTO obbligatorio** (almeno una lettera E almeno un numero — no solo lettere, no solo numeri). Normalizzato a forma **canonica** (iniziale maiuscola, resto minuscolo, es. `marco95` → `Marco95`). **Unico in tutta l'app** (case-insensitive) — indice DB `users_nickname_lower_unique` su `lower(nickname)`. Regola in `auth.ts` (`NICKNAME_REGEX` + refine lettera/numero + `canonicalNickname`), identica lato frontend. **NON modificabile** dopo la creazione (scelto una volta in registrazione con conferma "non modificabile"): identità pubblica permanente → endpoint `PATCH /me/nickname` e voce Profilo "Cambia nickname" **rimossi** (giu 2026). **Login/recupero case-insensitive** (confronto `lower()`). |
| PIN personale | 4-6 cifre |
| CAP/Codice Postale | **Solo geografia**, non fa parte dell'identità: serve per i match per vicinanza ed è **liberamente modificabile** dal Profilo (vedi sotto). |
| Domanda di sicurezza | Obbligatoria, per recupero emergenza |
| Risposta alla domanda di sicurezza | |

> **Identità slegata dal CAP** (giu 2026). Il nickname è l'unica chiave d'identità (unico globale); il CAP è puro dato geografico. Questo rende l'accesso più semplice (solo nickname + PIN), il recupero indipendente dal CAP e il cambio zona privo di rischi. Migrazione: `lib/db/migrations/0001_nickname_global_unique.sql`.

## Campi NON obbligatori

- Email, password classica, Google/Apple login
- Numero di telefono, indirizzo personale, GPS, geolocalizzazione reale

## Accesso (moderno, giu 2026)

Schermata di accesso (`Login.tsx`) con **"Continua con Google"** in evidenza + accesso storico
**Nickname + PIN** come opzione secondaria. Architettura in `DNA/18_PIANO_AUTH.md`.
- **Google** (Supabase Auth): 1 tap → al primo accesso si sceglie nickname (permanente) + CAP
  (`/api/auth/social` + `/api/auth/social/complete`; ponte identità in `lib/supabase-auth.ts`).
  Utente social: nessun PIN, nessuna domanda, nessun codice STICK (recupero via Google).
- **Nickname + PIN** (storico): invariato, sempre disponibile (il CAP non serve all'accesso).
- **Email + password** e reset via email: previsti, attivabili quando c'è l'SMTP (Brevo) — vedi piano.
- Il dispositivo ricorda l'accesso finché l'utente non fa logout manuale.

## Cambio Zona (CAP) — "modalità in vacanza"

- Dal **Profilo → Cambia zona**: l'utente imposta un nuovo CAP per cercare match in un'altra città.
- Endpoint `PATCH /api/auth/me/location` (autenticato, **niente PIN**: il CAP è solo geografia). Valida 5 cifre e **ricalcola l'area** (`deriveArea` in `auth.ts`: match esatto → prefisso provincia → generico).
- Non tocca login né recupero: l'identità (nickname) resta invariata.

## Email di recupero (futuro)

- Prossimo passo consigliato: email **facoltativa** come àncora di recupero (link/codice), che potrà sostituire la domanda di sicurezza.
- Richiede l'attivazione di un **servizio di invio email** (config/chiavi) → non ancora implementata.

## Codice di Recupero

- Generato dopo la registrazione (es. `STICK-XXXX-XXXX-XXXX`)
- Mostrato immediatamente con testo: _"Salva questo codice: serve per recuperare il profilo e gli eventuali acquisti."_
- Accessibile nella sezione Profilo solo dopo conferma PIN
- Usato per: recupero profilo, recupero accesso, riconciliazione premium

## Recupero PIN

Due strade (nessuna richiede il CAP):
- **Codice di recupero**: utente inserisce `STICK-XXXX-XXXX-XXXX` → crea nuovo PIN. Mostra anche il nickname.
- **Domanda di sicurezza**: utente inserisce **solo il nickname** (unico) → l'app mostra la sua domanda → risponde → crea nuovo PIN.

Profilo, album, stati, demo, premium rimangono invariati.

## Profilo Pubblico (visibile ad altri utenti)

- Nickname
- Area generica (basata su CAP, non indirizzo preciso)
- Statistiche scambi
- Affidabilità (basata su scambi completati)

## Procedura Recupero Emergenza Admin

1. Utente contatta admin via email di supporto
2. Admin cerca utente nell'archivio
3. Admin verifica: nickname (unico) e domanda di sicurezza
4. Se coerente → admin può aiutare al recupero o generare nuovo codice
5. Azione admin tracciata nel log
