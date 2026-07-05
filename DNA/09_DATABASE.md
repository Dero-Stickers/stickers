# DNA — Schema Database

## Schema Drizzle (sviluppo)

Definito in `lib/db/src/schema/`

### Tabelle Principali

```typescript
// users
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  pinHash: text("pin_hash").notNull(),
  cap: text("cap").notNull(),
  area: text("area"),
  securityQuestion: text("security_question").notNull(),
  securityAnswerHash: text("security_answer_hash").notNull(),
  recoveryCode: text("recovery_code").notNull().unique(),
  isPremium: boolean("is_premium").default(false), // = sblocco "tutte le chat"
  isBlocked: boolean("is_blocked").default(false),
  isAdmin: boolean("is_admin").default(false),
  exchangesCompleted: integer("exchanges_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// albums
export const albumsTable = pgTable("albums", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  totalStickers: integer("total_stickers").default(0),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// stickers
export const stickersTable = pgTable("stickers", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").references(() => albumsTable.id).notNull(),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

// user_albums
export const userAlbumsTable = pgTable("user_albums", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  albumId: integer("album_id").references(() => albumsTable.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// user_stickers
export const userStickersTable = pgTable("user_stickers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  albumId: integer("album_id").references(() => albumsTable.id).notNull(),
  stickerId: integer("sticker_id").references(() => stickersTable.id).notNull(),
  state: text("state").notNull().default("mancante"), // mancante|posseduta|doppia
  updatedAt: timestamp("updated_at").defaultNow(),
});

// chats
export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => usersTable.id).notNull(),
  user2Id: integer("user2_id").references(() => usersTable.id).notNull(),
  status: text("status").notNull().default("active"), // active|closed
  deletedByUser1: boolean("deleted_by_user1").notNull().default(false), // soft-delete per-utente (mig. 0007)
  deletedByUser2: boolean("deleted_by_user2").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// messages
export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chatsTable.id).notNull(),
  senderId: integer("sender_id").references(() => usersTable.id).notNull(),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// reports
export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => usersTable.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => usersTable.id).notNull(),
  chatId: integer("chat_id").references(() => chatsTable.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending|reviewed|resolved
  createdAt: timestamp("created_at").defaultNow(),
});

// admin_actions
export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => usersTable.id).notNull(),
  actionType: text("action_type").notNull(),
  targetUserId: integer("target_user_id").references(() => usersTable.id),
  targetChatId: integer("target_chat_id").references(() => chatsTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// app_settings
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// payments — audit/incassi sblocco chat. Importi in CENTESIMI interi (mai float).
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  provider: text("provider").notNull(),          // 'stripe' | 'paypal'
  kind: text("kind").notNull(),                   // 'single' | 'all'
  otherUserId: integer("other_user_id").references(() => usersTable.id), // solo 'single'
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull().default("pending"), // pending|paid|failed|refunded
  providerRef: text("provider_ref"),              // id transazione provider (idempotenza)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// chat_unlocks — sblocco di UNA chat (coppia utente→match). Righe create SOLO
// dal webhook del pagamento confermato. unique(user_id, other_user_id).
export const chatUnlocksTable = pgTable("chat_unlocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  otherUserId: integer("other_user_id").references(() => usersTable.id).notNull(),
  paymentId: integer("payment_id").references(() => paymentsTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// trade_confirmations — conferma scambio concluso, lato singolo utente. Una riga
// per (chat, utente); upsert su nuova conferma. La conferma aggiorna SOLO
// l'album di chi conferma. unique(chat_id, user_id).
export const tradeConfirmationsTable = pgTable("trade_confirmations", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chatsTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  givenCount: integer("given_count").default(0).notNull(),
  receivedCount: integer("received_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

## SQL Script Supabase

Da eseguire nel Supabase SQL Editor per creare lo schema in produzione.
(Script generato da Drizzle con `pnpm --filter @workspace/db run push`)

## Supabase — note operative

- **Produzione**: PostgreSQL su Supabase, connessione via `SUPABASE_DATABASE_URL`
  (SSL abilitato). Il client (`lib/db/src/index.ts`) imposta `search_path=public`.
- **Push schema**: `cd lib/db && pnpm push-force` (Drizzle Kit).
- Stato attuale: **15 tabelle** con indici integri (+`donations`, +`donation_nudges`, +`trade_confirmations`, +`blocked_emails`).
  `albums` ha `category` (mig. 0009). Monetizzazione **rimossa** anche dal DB (lug 2026, vedi sotto).

### Monetizzazione — RIMOSSA anche dal DB (lug 2026)

Il paywall "sblocco chat a pagamento" è stato eliminato dal codice (app 100% gratuita) e ora **anche dal
DB reale** — codice e DB allineati.
- **Consolidamento applicato (5 lug):** `DROP payments` + `DROP chat_unlocks` (erano vuote) + `DELETE` delle
  4 chiavi paywall in `app_settings` (`chat_paywall_enabled`, `paywall_currency`, `price_single_cents`,
  `price_all_cents`). Corrisponde a `0005_drop_monetization.sql`, ora **applicata**.
- **Colonne demo** (`users.demo_started_at`/`demo_expires_at`): **già assenti** dal DB reale (0004 di
  fatto applicata). Resta solo `users.is_premium` **INERTE** (non letta/scritta, scelta owner: no drop).
- `app_settings` ora contiene solo: `app_name`, `cookie_policy`, `privacy_policy`, `support_email`, `terms`.
- Le migrazioni storiche `0003_monetization_foundation.sql` / `0004_drop_demo.sql` restano nello storico
  come traccia, ma il loro effetto netto è annullato dal consolidamento sopra.
- **`0005_trade_confirmations.sql`** — **APPLICATA**. Additiva: crea `trade_confirmations`
  (RLS attiva, unique `chat_id,user_id`) per la conferma scambio concluso. Non tocca dati
  esistenti. Modello in `04_MATCHING_SCAMBI.md` → "Conferma scambio concluso".
- **`0008_blocked_emails.sql`** — **APPLICATA** (3 lug 2026). Additiva: crea `blocked_emails`
  (email unique su `lower(email)`, reason, blocked_at; RLS attiva deny-all — la usa solo il
  backend). Lista nera email per blocco a prova di aggiramento: sopravvive all'eliminazione
  dell'account. Allineata da admin blocca/sblocca via `api-server/src/lib/blocklist.ts`.
  Enforcement completo in `02_UTENTI_AUTENTICAZIONE.md` → "Blocco utente".
- **`0009_album_category.sql`** — **APPLICATA** (3 lug 2026). Additiva: colonna
  `albums.category` text NOT NULL DEFAULT 'campionato' + backfill Mondiali→'mondiali'.
  Categoria master assegnata dall'admin (sostituisce la deduzione dal titolo). Valori
  canonici in `ALBUM_CATEGORIES`. Dettagli in `03_ALBUM_FIGURINE.md` → "Categorie master".
- **`0010_donations.sql`** — **APPLICATA** (5 lug 2026). Additiva: crea `donations` (RLS attiva
  deny-all — solo backend). Salva le donazioni Ko-fi ricevute via webhook `POST /api/kofi/webhook`.
  `kofi_message_id` UNIQUE (idempotenza retry Ko-fi) + indice su `created_at`. Sola lettura lato
  admin (`GET /api/admin/donations`). Dettagli in `06_PREMIUM_DEMO.md` → "Integrazione Ko-fi".
- **`0011_donation_nudges.sql`** — **APPLICATA** (5 lug 2026). Additiva: crea `donation_nudges`
  (RLS attiva deny-all — solo backend). "Invito a donare" una-tantum: l'admin invita un utente
  (`POST /api/admin/users/:id/nudge`), l'utente lo vede UNA volta al prossimo accesso e lo consuma
  (`GET/POST /api/me/nudge*`). `user_id` UNIQUE (un invito per utente; reinvitare riarma sent_at e
  azzera seen_at). `sent_at`/`seen_at` = storico anti-spam mostrato in admin → Utenti (colonna
  "Invito"). Non tocca dati esistenti. Dettagli in `06_PREMIUM_DEMO.md` → "Invito a donare".

### Seed e ripristino album "default" (sicuro)

Gli album reali (23 raccolte Calciatori, 17.581 figurine) sono **versionati nel repo** e
ripristinabili in qualsiasi momento, senza re-scraping.

- **Dataset versionati**: `lib/db/src/data/calciatori.json.gz` (23 album Calciatori) e
  `world-cup-2026.json.gz` (FIFA World Cup 2026: 992 figurine, codici ALFANUMERICI
  MEX10/FWC19/CC1 nel campo `code`, FOIL in `description`, nasce NON pubblicato).
  Committati in git, **compressi gzip**: dati di restore, non servono al runtime.
- **`run build:worldcup-data`** — rigenera il file Mondiali dalla checklist
  `album-source/link/panini_world_cup_2026.md` (parser: `CODICE Nome [- Squadra] [FOIL]`).
- **`run export:albums`** — rigenera il file Calciatori fotografando il DB attuale (sola
  lettura; esclude i Mondiali, che hanno la loro fonte). Da usare solo dopo aver
  modificato di proposito il set di album da admin.
- **`run restore:albums`** — ripristina gli album mancanti da TUTTI i file dati. **Additivo
  e non distruttivo**: crea gli album assenti e riempie SOLO le figurine mancanti
  (`ON CONFLICT (album_id, number) DO NOTHING`); non cancella nulla, quindi **non tocca i
  progressi degli utenti** (`user_stickers`/`user_albums`). Idempotente. NON tocca
  `is_published` degli album esistenti (pubblicare è decisione admin).
- **`run backup`** — snapshot logico JSON di tutte le tabelle in `BACKUP/` (git-ignored).
- ⚠️ **`seed:mock-dev`** (ex `seed`) è **DISTRUTTIVO** (cancella tutto, inserisce dati finti):
  protetto da `ALLOW_DESTRUCTIVE_SEED=1`, non può partire per errore. Per riavere gli album
  reali si usa `restore:albums`, MAI il seed mock.
- Sorgente raw dello scraping (testi figurine + link) in `album-source/` (locale,
  git-ignored): archivio, non più usata a runtime.

### Sicurezza accessi (RLS)

- **RLS attiva su tutte le 15 tabelle** (`ENABLE ROW LEVEL SECURITY`), **deny-by-default**: nessuna policy → i ruoli `anon`/`authenticated` (chiave pubblica nel frontend) **non possono leggere/scrivere** via PostgREST `/rest/v1`.
- Il backend si connette come ruolo **`postgres`** (proprietario delle tabelle, `rolbypassrls=true`): **bypassa RLS**, quindi tutte le API continuano a funzionare. Tutti i dati passano **solo** dal backend.
- La chiave anon nel frontend serve **esclusivamente** al Realtime **broadcast** della chat (non legge tabelle): RLS non lo tocca.
- ⚠️ Se in futuro un client dovesse leggere tabelle **direttamente** con la chiave anon, servirà aggiungere **policy esplicite** (oggi non necessarie).

### Copertine album — RIMOSSE COMPLETAMENTE (scelta legale/IP)

Feature copertine eliminata in tutto lo stack, **come se non fosse mai esistita** (no artwork
di terzi: l'app gestisce solo dati testuali — numero, nome, squadra):

- **Schema/codice**: campo `coverUrl` rimosso da Drizzle (`schema/albums.ts`), da OpenAPI
  (`Album`, `CreateAlbumBody`) e client rigenerati, da tutte le risposte backend. Componente
  `AlbumCover` **eliminato**; nessuna tessera/placeholder/modale-anteprima: le card mostrano
  solo testo (titolo + figurine + %). UI upload copertina in admin rimossa; `lib/optimize-image.ts`
  e il route `POST /api/albums/cover` **eliminati**.
- **Dati**: bucket Storage `album-covers` **eliminato** (svuotato 24→0, poi rimosso via
  Storage API — nessun bucket residuo); seed `calciatori.json.gz` rigenerato senza copertine.
- **Colonna DB** `albums.cover_url`: **RIMOSSA** (`ALTER TABLE ... DROP COLUMN`, eseguito
  dopo il deploy del nuovo codice e verificato in produzione). `albums` = id, title,
  total_stickers, is_published, created_at.
- Vecchie immagini locali in `album-source/immagini/` (git-ignored, non servite): archivio.

### cap_zones (futuro)
```sql
cap, area_name, lat_approx, lng_approx, region
```
Tabella per il calcolo distanza tra CAP.

## Calcolo distanza CAP

- Fase iniziale: distanza approssimata su un dataset di CAP italiani con
  coordinate indicative (distanza euclidea, sufficiente per i match per vicinanza).
- Produzione: funzione Haversine o PostGIS su Supabase.
