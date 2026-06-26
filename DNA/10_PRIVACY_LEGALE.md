# Privacy, Legale e Store Readiness

## Note Legali Importanti

⚠️ **AVVISO**: Sticker è un'app indipendente, NON ufficialmente affiliata con Panini S.p.A.
Gli album e le figurine sono cataloghi manuali creati dall'admin.
Prima della pubblicazione ufficiale, verificare con un consulente legale.

### Nessun artwork di terzi (scelta consolidata)

Per ridurre il rischio copyright/marchio, l'app **non riproduce immagini, copertine o loghi**
di terzi. Si gestiscono **solo dati testuali fattuali** (numero, nome, squadra) e titoli album
come testo. Copertine rimosse da UI, DB (colonna `cover_url` rimossa) e Storage (bucket
`album-covers` eliminato); upload copertina in admin rimosso. Vedi `09_DATABASE.md`.

**Disclaimer non-affiliazione** visibile in-app: footer fisso in `LegalPage` (Note legali) —
"app indipendente, non affiliata né approvata da Panini S.p.A.; marchi dei rispettivi titolari,
uso a soli fini descrittivi". Il logo dell'app è proprietario (non Panini) e resta.

## Pagine Legali (IMPLEMENTATE)

Privacy Policy e Termini d'uso sono **live**, unica fonte = DB `app_settings`
(`privacy_policy`, `terms`), modificabili da admin → `/api/settings`. Viste:
`/legal/privacy`, `/legal/termini`, e `/legal/note` (combinata, usata dal Profilo).
La Cookie Policy è inglobata nella Privacy (solo storage tecnico, nessun cookie di profilazione).

**Conformità GDPR allineata (giu 2026):**
- **Titolare del trattamento: Davide De Rose** — contatto dati/supporto unificato su **stickersmatchbox@hotmail.com** (DB `support_email` + Profilo + MatchDetail).
- Fornitori/responsabili: Supabase (DB, **UK** — AWS Londra) + Render (hosting, **UE** — Francoforte). Il Regno Unito è coperto da **decisione di adeguatezza UE** (tutele equivalenti); nessun trasferimento USA.
- Font **Inter self-hosted** (niente Google Fonts → nessun trasferimento IP a terzi).
- Età **14 anni** + lettura Privacy/Termini: conferma esplicita obbligatoria alla registrazione (checkbox in `Login.tsx`, validata lato schema).
- Diritti: cancellazione self-service (elimina account); accesso/portabilità **su richiesta al supporto** (export JSON self-service rimosso).
- **Conservazione**: alla cancellazione account i dati personali sono eliminati; i **messaggi chat possono essere conservati in forma anonimizzata** per sicurezza/moderazione.
- **Sicurezza incontri**: avviso "incontrarsi in luoghi pubblici, per i più giovani con un adulto" in Privacy (Minori), Termini (Scambi) e **in chat** all'apertura.
- Base giuridica: contratto (6.1.b) + legittimo interesse sicurezza (6.1.f).
- I testi Privacy/Termini vivono in `app_settings` (DB), modificabili da admin → **unica fonte**, nessun hardcode nel frontend.

⚠️ Resta consigliata una **revisione legale professionale** prima della pubblicazione commerciale.

## Dati Raccolti

| Dato | Motivo | Sensibile? |
|------|--------|-----------|
| Nickname | Identificazione | No (non nome reale) |
| PIN (hashed) | Autenticazione | Sì (hash) |
| CAP | Match geografico | Moderato |
| Domanda/risposta sicurezza | Recupero emergenza | Sì (hash) |
| Codice recupero | Accesso profilo | Sì |
| Messaggi chat | Funzione scambio | Sì |
| Identificatore dispositivo anonimo | Anti-abuso demo | Moderato |

## Cookie e Dati Locali

Solo dati tecnici essenziali:
- Sessione/accesso
- Stato demo
- Preferenze minime
- Accesso ricordato sul dispositivo

NO: cookie marketing, cookie pubblicitari, tracking invasivo.

## Store Readiness (per futuro)

### App Store (Apple)
- Privacy Nutrition Label preparato
- Chat moderation policy documentata
- Account deletion flow preparato
- Minor user policy (contenuti appropriati)
- In-app purchase (IAP) compatibility

### Google Play
- Privacy policy URL richiesto
- Data safety form da compilare
- Target audience: 13+ (no COPPA senza verifica età)

### Checklist Pre-Pubblicazione
- [ ] Revisione legale Privacy Policy, Termini, Cookie Policy
- [ ] Aggiunta vera email di supporto
- [ ] Test su iOS Safari (PWA)
- [ ] Test su Android Chrome (PWA)
- [ ] Configurazione dominio
- [ ] Setup Supabase produzione
- [ ] Integrazione pagamenti store-compatibile
- [ ] Account deletion flow funzionante
- [ ] Moderazione chat verificata

## Testi Store (Base)

**Short description**: Scambia le tue figurine Panini con utenti vicini a te. Trova i migliori match, gestisci le tue doppie, e scambia in modo semplice e sicuro.

**Long description**: Sticker è l'app per collezionisti di figurine Panini. Gestisci i tuoi album, segna le figurine mancanti e doppie, trova chi ha esattamente quello che ti serve e scambia 1:1 in modo facile, veloce e sicuro. Filtra per vicinanza con il tuo CAP e scopri subito con chi scambiare nel tuo quartiere.

**Categoria**: Utility / Lifestyle / Sport

**Rating consigliato**: 4+ (Apple) / Everyone (Google Play) — da verificare con le politiche chat
