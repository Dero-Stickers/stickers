# Utenti, Registrazione e Autenticazione

## Registrazione — Campi Obbligatori

| Campo | Note |
|-------|------|
| Nickname | Unico solo per CAP (stessa area) |
| PIN personale | 4-6 cifre |
| CAP/Codice Postale | Per logica match per vicinanza |
| Domanda di sicurezza | Obbligatoria, per recupero emergenza |
| Risposta alla domanda di sicurezza | |

## Campi NON obbligatori

- Email, password classica, Google/Apple login
- Numero di telefono, indirizzo personale, GPS, geolocalizzazione reale

## Accesso Quotidiano

- Nickname + PIN
- Il CAP non viene richiesto ad ogni login
- Il dispositivo ricorda l'accesso finché l'utente non fa logout manuale

## Codice di Recupero

- Generato dopo la registrazione (es. `STICK-XXXX-XXXX-XXXX`)
- Mostrato immediatamente con testo: _"Salva questo codice: serve per recuperare il profilo e gli eventuali acquisti."_
- Accessibile nella sezione Profilo solo dopo conferma PIN
- Usato per: recupero profilo, recupero accesso, riconciliazione premium

## Recupero PIN

1. Utente inserisce codice di recupero
2. App verifica il codice
3. Se valido → utente crea nuovo PIN
4. Profilo, album, stati, demo, premium rimangono invariati

## Profilo Pubblico (visibile ad altri utenti)

- Nickname
- Area generica (basata su CAP, non indirizzo preciso)
- Statistiche scambi
- Affidabilità (basata su scambi completati)

## Procedura Recupero Emergenza Admin

1. Utente contatta admin via email di supporto
2. Admin cerca utente nell'archivio
3. Admin verifica: nickname, CAP, domanda di sicurezza
4. Se coerente → admin può aiutare al recupero o generare nuovo codice
5. Azione admin tracciata nel log
