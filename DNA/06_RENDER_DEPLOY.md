# DNA — Guida Deploy su Render (100% Sicuro)

Ultimo aggiornamento: 2 Maggio 2026 — Sessione 6

---

## Panoramica Architettura Deploy

In produzione su Render, il server Express (`api-server`) serve:
1. Le **API** su `/api/*`
2. I **file statici** del frontend React (build Vite) su tutto il resto
3. Il **fallback SPA** (index.html per ogni rotta non-API)

Un solo servizio Render — nessun server frontend separato.

---

## Requisiti Pre-Deploy

### 1. Supabase configurato ✅
- Progetto Supabase attivo su `https://supabase.com`
- Schema DB pushato con `pnpm --filter @workspace/db run push`
- Dati seed inseriti (o dati reali caricati)
- Credenziali pronte (vedi sezione Variabili d'Ambiente)

### 2. Repository GitHub ✅
- Codice pushato su `github.com/Dero-Stickers/stickers`
- Branch `main` aggiornato

### 3. Account Render
- Registrazione gratuita su `https://render.com`
- Collegamento account GitHub

---

## Step 1 — Preparare il Server per la Produzione

Il file `artifacts/api-server/src/app.ts` deve includere il serving dei file statici del frontend in produzione. Questo è già configurato nel progetto.

---

## Step 2 — Creare il Servizio su Render

### 2a. New Web Service

1. Vai su `https://dashboard.render.com`
2. Clicca **"New +"** → **"Web Service"**
3. Connetti il repository `Dero-Stickers/stickers`
4. Configura come segue:

### 2b. Configurazione Servizio

| Campo | Valore |
|-------|--------|
| **Name** | `stickers-matchbox` |
| **Region** | `Frankfurt (EU Central)` — più vicino all'Italia |
| **Branch** | `main` |
| **Root Directory** | *(lascia vuoto — usa la root del repo)* |
| **Runtime** | `Node` |
| **Build Command** | vedi sotto |
| **Start Command** | vedi sotto |
| **Instance Type** | `Free` (sviluppo) o `Starter $7/mese` (produzione) |

### 2c. Build Command

```bash
npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/stickers-app run build && pnpm --filter @workspace/api-server run build
```

### 2d. Start Command

```bash
pnpm --filter @workspace/api-server run start
```

---

## Step 3 — Variabili d'Ambiente

Vai su **Environment** del servizio Render e aggiungi:

### Obbligatorie

| Variabile | Valore | Note |
|-----------|--------|------|
| `NODE_ENV` | `production` | Attiva serving file statici |
| `PORT` | *(auto Render — non impostare)* | Render lo imposta automaticamente |
| `SUPABASE_DATABASE_URL` | `postgresql://postgres.xxx:password@aws-1-eu-west-2.pooler.supabase.com:5432/postgres` | Dalla dashboard Supabase → Settings → Database → Connection String |
| `SUPABASE_ANON_KEY` | `eyJ...` | Da Supabase → Settings → API → anon public |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Da Supabase → Settings → API → Project URL |
| `BASE_PATH` | `/` | Percorso base dell'app |
| `SESSION_SECRET` | *(stringa random ≥ 32 char)* | **Obbligatoria in produzione**. Chiave per firmare i token sessione (HMAC-SHA256). Genera con `openssl rand -base64 48`. **Non condividere mai** e **non riusare** chiavi di altri ambienti. |

### Opzionali

| Variabile | Valore | Note |
|-----------|--------|------|
| `CORS_ORIGINS` | `https://app1.example.com,https://app2.example.com` | Lista CSV di origini autorizzate aggiuntive (oltre a `*.replit.app`). Lascia vuota se l'app è raggiunta solo dal proprio dominio Render. |
| `AUTH_SECRET` | *(alias di `SESSION_SECRET`)* | Solo per back-compat. Usa `SESSION_SECRET`. |

### Come trovare i valori Supabase

1. Vai su `https://supabase.com/dashboard/project/kuigzaqaewgcosfhahkv`
2. **Settings** → **Database** → **Connection String** → copia "URI"
3. **Settings** → **API** → copia `Project URL` e `anon public key`

### ⚠️ Attenzione Sicurezza

- **MAI** committare le variabili d'ambiente nel repository
- **MAI** usare la `service_role` key lato client (solo la `anon` key)
- `SUPABASE_DATABASE_URL` contiene la password del DB — trattala come segreto
- `SESSION_SECRET` firma i token di sessione: se cambi il valore, **tutti gli utenti vengono sloggati** (i token esistenti diventano invalidi). Ruota solo in caso di sospetta compromissione.
- Token di sessione: durata 30 giorni (`exp` nel payload firmato). Rate limit login: 8 tentativi / 5 min per IP+nickname; recupero PIN: 5 / 15 min per IP.

---

## Step 4 — Health Check

Render controlla automaticamente se il servizio è vivo.

Configura in Render → Settings → Health Check:
- **Health Check Path**: `/api/healthz`
- L'endpoint risponde con `{"status":"ok"}`

---

## Step 5 — Deploy e Verifica

### 5a. Primo Deploy

1. Clicca **"Create Web Service"**
2. Aspetta il build (circa 3-5 minuti la prima volta)
3. Controlla i log in tempo reale su Render
4. Al termine, l'app sarà su `https://stickers-matchbox.onrender.com`

### 5b. Verifica Post-Deploy

Testa questi URL:

```bash
# Health check API
curl https://stickers-matchbox.onrender.com/api/healthz

# Login test
curl -X POST https://stickers-matchbox.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"mario75","pin":"1234"}'

# Frontend (apri nel browser)
https://stickers-matchbox.onrender.com/
```

### 5c. Log e Debug

- Render → Logs → filtra per "ERROR" o "WARN"
- Se il build fallisce: controlla che tutte le ENV vars siano impostate
- Se l'app non risponde: controlla che PORT non sia hardcoded

---

## Step 6 — Deploy Automatico (CD)

Render può fare deploy automatico ad ogni push su `main`:

1. Render → Settings → **Auto-Deploy** → `Yes`
2. Ogni `git push origin main` trigghera un nuovo deploy

---

## Step 7 — Dominio Personalizzato (Futuro)

Quando il dominio sarà pronto:

1. Render → Settings → **Custom Domains** → Aggiungi dominio
2. Copia il CNAME record e aggiungilo al tuo DNS provider
3. Render gestisce automaticamente SSL/TLS (Let's Encrypt)

---

## Checklist Pre-Go-Live

- [ ] `NODE_ENV=production` impostato su Render
- [ ] `SUPABASE_DATABASE_URL` valido e connesso
- [ ] `SUPABASE_ANON_KEY` e `SUPABASE_URL` impostati
- [ ] Schema DB Supabase aggiornato (`pnpm db push`)
- [ ] Build completo senza errori
- [ ] Health check risponde `{"status":"ok"}`
- [ ] Login funziona con utente reale
- [ ] Frontend carica correttamente da Render URL
- [ ] HTTPS attivo (automatico su Render)
- [ ] Testi legali rivisti prima della pubblicazione pubblica

---

## Struttura File Post-Build

```
artifacts/
├── api-server/
│   └── dist/
│       └── index.mjs      ← server Node.js bundled
├── stickers-app/
│   └── dist/
│       └── public/        ← file statici React (HTML, JS, CSS)
│           ├── index.html
│           └── assets/
```

---

## Costi Render (Riferimento)

| Piano | CPU | RAM | Costo | Adatto per |
|-------|-----|-----|-------|-----------|
| Free | 0.1 | 512MB | $0/mese | Testing (si spegne dopo 15min inattività) |
| Starter | 0.5 | 512MB | $7/mese | Produzione leggera |
| Standard | 1 | 2GB | $25/mese | Produzione standard |

**Raccomandazione**: `Starter` per il lancio iniziale.

---

## Note Tecniche

### SSL / HTTPS
Render fornisce SSL automatico su tutti i servizi. Nessuna configurazione necessaria.

### Cold Start (Piano Free)
Il piano gratuito Render mette il servizio in sleep dopo 15 minuti di inattività.
Il primo accesso dopo il sleep può richiedere 30-60 secondi.
Soluzione: usa il piano Starter ($7/mese) per eliminare il cold start.

### Database Connection Pool
Il server usa `pg.Pool` con SSL abilitato per Supabase.
Il pool gestisce automaticamente le connessioni — nessuna configurazione aggiuntiva.

### CORS in Produzione
In produzione, CORS è configurato per accettare richieste dal dominio Render.
Se usi un dominio personalizzato, aggiorna la configurazione CORS nel server.
