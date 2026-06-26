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
  isPremium: boolean("is_premium").default(false),
  demoStartedAt: timestamp("demo_started_at"),
  demoExpiresAt: timestamp("demo_expires_at"),
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
```

## SQL Script Supabase

Da eseguire nel Supabase SQL Editor per creare lo schema in produzione.
(Script generato da Drizzle con `pnpm --filter @workspace/db run push`)

## Supabase — note operative

- **Produzione**: PostgreSQL su Supabase, connessione via `SUPABASE_DATABASE_URL`
  (SSL abilitato). Il client (`lib/db/src/index.ts`) imposta `search_path=public`.
- **Push schema**: `cd lib/db && pnpm push-force` (Drizzle Kit).
- Stato attuale: 11 tabelle con indici integri.

### Seed e ripristino album "default" (sicuro)

Gli album reali (23 raccolte Calciatori, 17.581 figurine) sono **versionati nel repo** e
ripristinabili in qualsiasi momento, senza re-scraping.

- **Dataset versionato**: `lib/db/src/data/calciatori.json.gz` — fonte di verità "default"
  (titolo, pubblicazione, figurine con `number`/`code`/`name`). Committato in git,
  **compresso gzip** (~188 KB invece di ~1.8 MB): è dato di restore, non serve al runtime.
- **`run export:albums`** — rigenera quel file fotografando il DB attuale (sola lettura).
  Da usare solo dopo aver modificato di proposito il set di album da admin.
- **`run restore:albums`** — ripristina gli album mancanti dal file. **Additivo e non
  distruttivo**: crea gli album assenti e riempie SOLO le figurine mancanti
  (`ON CONFLICT (album_id, number) DO NOTHING`); non cancella nulla, quindi **non tocca i
  progressi degli utenti** (`user_stickers`/`user_albums`). Idempotente.
- **`run backup`** — snapshot logico JSON di tutte le tabelle in `BACKUP/` (git-ignored).
- ⚠️ **`seed:mock-dev`** (ex `seed`) è **DISTRUTTIVO** (cancella tutto, inserisce dati finti):
  protetto da `ALLOW_DESTRUCTIVE_SEED=1`, non può partire per errore. Per riavere gli album
  reali si usa `restore:albums`, MAI il seed mock.
- Sorgente raw dello scraping (testi figurine + link) in `album-source/` (locale,
  git-ignored): archivio, non più usata a runtime.

### Sicurezza accessi (RLS)

- **RLS attiva su tutte le 11 tabelle** (`ENABLE ROW LEVEL SECURITY`), **deny-by-default**: nessuna policy → i ruoli `anon`/`authenticated` (chiave pubblica nel frontend) **non possono leggere/scrivere** via PostgREST `/rest/v1`.
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
- **Dati**: bucket Storage `album-covers` **svuotato** (24→0); seed `calciatori.json.gz`
  rigenerato senza copertine.
- **Colonna DB** `albums.cover_url`: già azzerata; **DROP COLUMN da eseguire DOPO il deploy**
  del nuovo codice (il backend live vecchio la seleziona ancora — droparla prima lo romperebbe).
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
