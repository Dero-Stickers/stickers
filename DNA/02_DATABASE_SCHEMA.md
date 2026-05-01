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
  description: text("description"),
  coverUrl: text("cover_url"),
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
