# DNA — Dominio deroarts.com (integrazione futura)

> **Stato:** riferimento per il FUTURO. Nulla di questo è ancora collegato a Stickers.
> Il dominio `deroarts.com` è dell'owner (Davide De Rose) e ospiterà più progetti;
> Stickers verrà integrato **quando ci sarà un'interfaccia user-friendly** (non ora).
> **Questo file è solo documentazione:** non modificare DNS, email o codice finché
> l'owner non lo chiede esplicitamente.

## 0. In una riga (cosa serve sapere per Stickers)

Quando integreremo Stickers nel dominio, useremo:
- **Un solo sottodominio:** `stickers.deroarts.com` → app + admin + API insieme (deploy unico su
  Render, vedi §2). Niente sottodomini separati per admin/api. Da configurare su Cloudflare DNS come
  CNAME col valore dato da Render.
- **Email dedicata definitiva:** `stickers@deroarts.com` — **CREATA e ATTIVA** (alias Zoho su
  `info@deroarts.com`, nome visualizzato "Stickers"). L'app la usa ovunque (DB `support_email` +
  fallback codice allineati, 5 lug). Il dominio proprio con DKIM/DMARC risolve anche il nodo anti-spam
  delle email auth (oggi Brevo da dominio gratuito finisce in SPAM — vedi `18_PIANO_AUTH.md`).

## 1. Identità dominio

- Dominio ufficiale: **deroarts.com** (MAI `dero-arts.com`).
- Registrar: **Cloudflare Registrar**. DNS provider: **Cloudflare DNS**. Piano: **Free**.
- Nameserver: `michael.ns.cloudflare.com` · `ziggy.ns.cloudflare.com`.
- DNSSEC: **attivo**. DNS multi-provider: disattivato.

## 2. Stato attuale (lug 2026)

- Dominio acquistato e attivo su Cloudflare; DNS gestito da Cloudflare; DNSSEC attivo; SSL/HTTPS ok.
- Email professionale attiva via **Zoho Mail Free** (area EU). Casella: **info@deroarts.com** — invio,
  ricezione, webmail OK. SPF/DKIM/DMARC = **PASS**.
- **App Stickers COLLEGATA al dominio (5 lug 2026):** `stickers.deroarts.com` → servizio Render
  `stickers-matchbox` (CNAME, Solo DNS). Render: **Verified**, certificato HTTPS in emissione. Record DNS
  totali: 8. **Restano da fare** per il go-live sul dominio: Supabase Auth (Site/Redirect URL), CSP/CORS,
  webhook Ko-fi, testi legali — vedi §8.
- **Sito vetrina deroarts** (separato da Stickers): `https://deroarts.onrender.com` (Render).

### Dove gira OGGI Stickers (URL Render reali, in attesa del dominio)
- App pubblica/utente: **`https://stickers-matchbox.onrender.com`** (`.env` → `LINK_DEPLOY`).
- Area admin: **`https://stickers-matchbox.onrender.com/admin`** (`.env` → `LINK_DEPLOY_ADMIN`).
- Servizio Render: `stickers-matchbox` (id `srv-d7qjvpa8qa3s73ct11ug`), repo `Dero-Stickers/stickers`.
- App + admin + API sono un **deploy unico** (Express serve anche il frontend buildato) → un solo
  sottodominio basterà (`stickers.deroarts.com`); admin/api NON sono servizi separati.

## 2bis. Donazioni Ko-fi (collegate, indipendenti dal dominio)

Stickers è 100% gratuita; unico introito = donazioni spontanee via **Ko-fi** (liberalità, non sbloccano
nulla). NON passano dal dominio deroarts né da Zoho: sono un servizio esterno.
- **Pagina Ko-fi owner:** `https://ko-fi.com/deroarts` (codice pagina `A6A522N3IW`).
- **Pagamenti gestiti da:** Ko-fi + PayPal (l'app non tratta dati di pagamento).
- **Webhook attivo** (dati donazioni → pannello admin, sola lettura):
  `https://stickers-matchbox.onrender.com/api/kofi/webhook`. Segreto `KOFI_VERIFICATION_TOKEN`
  (in `.env` + Render + App Control). Al passaggio al dominio: aggiornare l'URL webhook su Ko-fi in
  `https://stickers.deroarts.com/api/kofi/webhook` (unica riga da cambiare). Vedi `06_PREMIUM_DEMO.md`.

## 3. Email (Zoho Mail Free)

- Provider: **Zoho Mail** (EU), piano Free (5 licenze; 1 utente configurato). Webmail: `https://mail.zoho.eu/zm`.
- Casella principale ufficiale: **info@deroarts.com** (nome visualizzato: "Davide"). Verificata e autenticata.
- **Cloudflare Email Routing: NON usarlo** come soluzione principale (crea solo alias/inoltri, non caselle
  complete). La soluzione email ufficiale del dominio è **Zoho Mail**.

### Alias futuri (da creare solo quando servono, uno per progetto)
Devono **puntare/inoltrare a `info@deroarts.com`** salvo diversa decisione; niente caselle separate inutili;
verificare prima se il piano Zoho Free lo consente (eventuale upgrade a Zoho Mail Lite).
- Altri previsti: `info-demo@`, `info-barnode@`, `info-aquilanera@`, `info-ccv@`.

### Email di Stickers — `stickers@deroarts.com` (DEFINITIVA, attiva e allineata)
- **Email di riferimento/supporto di Stickers: `stickers@deroarts.com`** — CREATA e ATTIVA (5 lug 2026).
  Alias Zoho dell'utente `info@deroarts.com` (Mail Admin → Utenti → Davide → Impostazioni cassetta
  postale → Alias di posta → Aggiungi), nome visualizzato **"Stickers"**, NON impostato come indirizzo
  principale (`info@` resta la cassetta; `stickers@` riceve e invia sulla stessa casella). Coperta da
  SPF/DKIM/DMARC già attivi — nessun record DNS nuovo richiesto.
- **Allineamento nell'app COMPLETATO (5 lug):** l'email è `stickers@deroarts.com` in tutti i punti:
  1. DB: `app_settings.support_email` = `stickers@deroarts.com` (fonte di verità runtime; modificabile
     da Admin → Impostazioni → aggiorna ovunque, testi legali `{EMAIL_SUPPORTO}` inclusi).
  2. Fallback [`useSupportEmail.ts`](../artifacts/stickers-app/src/hooks/useSupportEmail.ts) (`SUPPORT_EMAIL_FALLBACK`).
  3. Fallback [`settings.ts`](../artifacts/api-server/src/routes/settings.ts) (default `supportEmail`).
  4. Fallback [`LegalPage.tsx`](../artifacts/stickers-app/src/pages/LegalPage.tsx).
  I 3 fallback codice sono solo di sicurezza (usati se il DB non risponde): allineati per coerenza.
- **Riconoscere le mail a stickers@ (filtro Zoho, 5 lug):** le mail arrivano nella stessa Posta in arrivo
  di `info@`. Creato un **tag verde "Stickers"** + una **regola in entrata** (Impostazioni → Filtri →
  Filtro e-mail in entrata → "Stickers": *A contiene stickers@deroarts.com → Tagga come Stickers*) che le
  etichetta in automatico. Per vedere solo quelle: cliccare il tag "Stickers" nel menu a sinistra della
  webmail. Testato (mail di prova arrivata taggata). Tutto su Zoho, nessun costo/servizio esterno.

## 4. Record DNS attuali — NON modificare senza verifica

| Tipo | Nome | Contenuto | Prio | Proxy | TTL |
|---|---|---|---|---|---|
| **CNAME** | **`stickers`** | **`stickers-matchbox.onrender.com`** | — | **Solo DNS** | Auto |
| TXT | @ | `zoho-verification=zb87474940.zmverify.zoho.eu` | — | Solo DNS | Auto |
| MX | @ | `mx.zoho.eu` | 10 | Solo DNS | Auto |
| MX | @ | `mx2.zoho.eu` | 20 | Solo DNS | Auto |
| MX | @ | `mx3.zoho.eu` | 50 | Solo DNS | Auto |
| TXT (SPF) | @ | `v=spf1 include:zohomail.eu ~all` | — | Solo DNS | Auto |
| TXT (DKIM) | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCRNNXxxp8waQbMNj5Ujh/NZZ3yMCCsVCpmsyDe5r2yBOiXLcqcBln42U33yNavmxCxM0tCJOuzFJQ9FsSgKh7HZlvuRPRHAMZ9BB+Yd9Z3d04k516cog209IYf3DiBv/m38mjSkm23Ijw9hhDXdxTkZr7nsOaz9MNFkMxLGHLnsQIDAQAB` | — | Solo DNS | Auto |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@deroarts.com` | — | Solo DNS | Auto |

- **CNAME `stickers` (app):** creato 5 lug 2026 → punta al servizio Render `stickers-matchbox`. **Proxy OFF
  ("Solo DNS") obbligatorio** (Render gestisce lui SSL/certificato; col proxy Cloudflare la verifica fallisce).
  Su Render: Custom Domain `stickers.deroarts.com` **Verified**, certificato in emissione automatica.
- DKIM: Cloudflare mostra `zmail._domainkey` come `zmail._domainkey.deroarts.com` → è corretto.
- DMARC: `p=none` (solo monitoraggio, non blocca). Da irrigidire in futuro solo dopo consolidamento.

## 5. SSL / HTTPS / Rete (Cloudflare)

- SSL/TLS mode: **Completo**. Universal SSL + Wildcard `*.deroarts.com` attivi. Always Use HTTPS: on.
- TLS min 1.2, TLS 1.3 on, HTTP/2 + HTTP/3 on, HTTP/2 to origin on. 0-RTT off. HSTS non attivo. ACM non necessario.
- Cache: livello Standard, Browser Cache TTL 4h, Dev Mode off, Always Online off, nessuna regola cache.
- Performance (tutto OFF): Speed Brain, Web Analytics RUM, Cloudflare Fonts, Early Hints, Rocket Loader, APO.
- Sicurezza: Managed Ruleset on, DDoS (HTTP/SSL/network) sempre on, Browser Integrity Check on, Email
  obfuscation on. Bot Fight Mode / Under Attack / Hotlink protection: off. AI bot: Ricerca=Consenti,
  Agente=Consenti, Addestramento=**Blocca**.

## 6. Struttura sottodomini consigliata (convenzione dominio)

- Sito principale: `deroarts.com` · Demo: `demo.deroarts.com` · Docs: `docs.deroarts.com` · Status: `status.deroarts.com`
- App/progetto: `nomeapp.deroarts.com` · Admin: `admin.nomeapp.deroarts.com` · API: `api.nomeapp.deroarts.com`
- Esempi futuri: `barnode.` · `aquilanera.` · `ccv.` · `wine.` · **`stickers.deroarts.com`**

## 7. Regole per agent/dev (VINCOLANTI su questo dominio)

- Usare **solo** `deroarts.com` (mai `dero-arts.com`). Non modificare registrar/nameserver. Non disattivare DNSSEC.
- Non eliminare i record email Zoho. Non sostituire Zoho Mail con Cloudflare Email Routing. Non inventare record DNS.
- Creare record web **solo** con valori precisi forniti dalla piattaforma (CNAME→hosting, A→IP, TXT→verifica, ecc.).
- Prima di modificare email/DNS **documentare**: tipo record, nome/host, valore, TTL, priorità (se MX), motivo,
  piattaforma richiedente.

## 8. Integrazione Stickers sul dominio — checklist

1. **Render: FATTO** ✅ (5 lug) — custom domain `stickers.deroarts.com` aggiunto e **Verified**;
   certificato HTTPS in emissione automatica.
2. **Cloudflare DNS: FATTO** ✅ (5 lug) — CNAME `stickers` → `stickers-matchbox.onrender.com`,
   **Solo DNS** (proxy OFF, richiesto da Render). Documentato in §4.
3. Aggiornare in **Supabase Auth**: Site URL + Redirect URLs al nuovo dominio `stickers.deroarts.com` (oggi puntano
   a `stickers-matchbox.onrender.com` — vedi `18_PIANO_AUTH.md`).
4. Aggiornare **CSP/CORS** e eventuali URL hardcoded nell'app al nuovo dominio.
5. **Email Stickers: FATTO** ✅ — alias `stickers@deroarts.com` creato su Zoho e allineato ovunque
   nell'app (DB + fallback codice). Vedi §3.
6. **Email auth anti-spam:** valutare l'invio da `stickers@deroarts.com` (dominio proprio con DKIM/DMARC) al
   posto del mittente gmail su Brevo → risolve il problema SPAM documentato in `18_PIANO_AUTH.md`.
7. **Donazioni Ko-fi:** aggiornare l'URL webhook su Ko-fi al nuovo dominio (`https://stickers.deroarts.com/api/kofi/webhook`).
8. Aggiornare i **testi legali** (privacy/termini in `app_settings`) con il nuovo dominio e la nuova email di contatto.
