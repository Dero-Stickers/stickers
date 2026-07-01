# DNA — Dominio deroarts.com (integrazione futura)

> **Stato:** riferimento per il FUTURO. Nulla di questo è ancora collegato a Stickers.
> Il dominio `deroarts.com` è dell'owner (Davide De Rose) e ospiterà più progetti;
> Stickers verrà integrato **quando ci sarà un'interfaccia user-friendly** (non ora).
> **Questo file è solo documentazione:** non modificare DNS, email o codice finché
> l'owner non lo chiede esplicitamente.

## 0. In una riga (cosa serve sapere per Stickers)

Quando integreremo Stickers nel dominio, useremo:
- **Sottodomini** (da configurare su Cloudflare DNS con i valori dati da Render):
  - `stickers.deroarts.com` → app pubblica/utente
  - `admin.stickers.deroarts.com` → area admin (se separata)
  - `api.stickers.deroarts.com` → backend/API (se separata)
- **Email dedicata:** alias `info-stickers@deroarts.com` (punta a `info@deroarts.com`, su Zoho).
  Utile anche per risolvere il nodo anti-spam delle email auth (oggi Brevo da dominio gratuito
  finisce in SPAM — vedi `18_PIANO_AUTH.md`): con dominio proprio + DKIM/DMARC si esce dallo spam.

## 1. Identità dominio

- Dominio ufficiale: **deroarts.com** (MAI `dero-arts.com`).
- Registrar: **Cloudflare Registrar**. DNS provider: **Cloudflare DNS**. Piano: **Free**.
- Nameserver: `michael.ns.cloudflare.com` · `ziggy.ns.cloudflare.com`.
- DNSSEC: **attivo**. DNS multi-provider: disattivato.

## 2. Stato attuale (lug 2026)

- Dominio acquistato e attivo su Cloudflare; DNS gestito da Cloudflare; DNSSEC attivo; SSL/HTTPS ok.
- Email professionale attiva via **Zoho Mail Free** (area EU). Casella: **info@deroarts.com** — invio,
  ricezione, webmail OK. SPF/DKIM/DMARC = **PASS**.
- Sito/app: **non ancora collegati**. Record web A/CNAME: **non ancora configurati**. Record DNS totali: 7.

## 3. Email (Zoho Mail Free)

- Provider: **Zoho Mail** (EU), piano Free (5 licenze; 1 utente configurato). Webmail: `https://mail.zoho.eu/zm`.
- Casella principale ufficiale: **info@deroarts.com** (nome visualizzato: "Davide"). Verificata e autenticata.
- **Cloudflare Email Routing: NON usarlo** come soluzione principale (crea solo alias/inoltri, non caselle
  complete). La soluzione email ufficiale del dominio è **Zoho Mail**.

### Alias futuri (da creare solo quando servono, uno per progetto)
Devono **puntare/inoltrare a `info@deroarts.com`** salvo diversa decisione; niente caselle separate inutili;
verificare prima se il piano Zoho Free lo consente (eventuale upgrade a Zoho Mail Lite).
- **Per Stickers: `info-stickers@deroarts.com`**
- Altri previsti: `info-demo@`, `info-barnode@`, `info-aquilanera@`, `info-ccv@`.

## 4. Record DNS attuali (email Zoho) — NON modificare senza verifica

| Tipo | Nome | Contenuto | Prio | TTL |
|---|---|---|---|---|
| TXT | @ | `zoho-verification=zb87474940.zmverify.zoho.eu` | — | Auto |
| MX | @ | `mx.zoho.eu` | 10 | Auto |
| MX | @ | `mx2.zoho.eu` | 20 | Auto |
| MX | @ | `mx3.zoho.eu` | 50 | Auto |
| TXT (SPF) | @ | `v=spf1 include:zohomail.eu ~all` | — | Auto |
| TXT (DKIM) | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCRNNXxxp8waQbMNj5Ujh/NZZ3yMCCsVCpmsyDe5r2yBOiXLcqcBln42U33yNavmxCxM0tCJOuzFJQ9FsSgKh7HZlvuRPRHAMZ9BB+Yd9Z3d04k516cog209IYf3DiBv/m38mjSkm23Ijw9hhDXdxTkZr7nsOaz9MNFkMxLGHLnsQIDAQAB` | — | Auto |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@deroarts.com` | — | Auto |

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

## 8. Cosa servirà quando integreremo Stickers (checklist futura, NON ora)

1. Su **Render**: aggiungere il custom domain `stickers.deroarts.com` (e admin/api se separati) → Render fornisce
   un target CNAME.
2. Su **Cloudflare DNS**: creare i CNAME con i valori dati da Render (modalità da definire: proxy on/off secondo
   quanto richiede Render). Documentare ogni record come da §7.
3. Aggiornare in **Supabase Auth**: Site URL + Redirect URLs al nuovo dominio `stickers.deroarts.com` (oggi puntano
   a `stickers-matchbox.onrender.com` — vedi `18_PIANO_AUTH.md`).
4. Aggiornare **CSP/CORS** e eventuali URL hardcoded nell'app al nuovo dominio.
5. **Email auth anti-spam:** valutare l'invio da `info-stickers@deroarts.com` (dominio proprio con DKIM/DMARC) al
   posto del mittente gmail su Brevo → risolve il problema SPAM documentato in `18_PIANO_AUTH.md`.
6. Aggiornare i **testi legali** (privacy/termini in `app_settings`) con il nuovo dominio e la nuova email di contatto.
