import { pgTable, serial, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { paymentsTable } from "./payments";

/**
 * Sblocco di una singola chat (nuovo modello di monetizzazione).
 *
 * Una riga = l'utente `userId` ha sbloccato la chat verso `otherUserId`.
 * Chi apre/paga è `userId`; l'altro può rispondere gratis nella stessa chat
 * (il gate è solo all'APERTURA della conversazione, non sull'invio messaggi).
 * Lo sblocco "tutte le chat" NON usa questa tabella: è il flag premium/all
 * sull'utente. Le righe qui le crea SOLO il webhook del pagamento.
 */
export const chatUnlocksTable = pgTable(
  "chat_unlocks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    otherUserId: integer("other_user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    paymentId: integer("payment_id").references(() => paymentsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pairUnique: uniqueIndex("chat_unlocks_pair_unique").on(t.userId, t.otherUserId),
    userIdx: index("chat_unlocks_user_idx").on(t.userId),
  }),
);

export const insertChatUnlockSchema = createInsertSchema(chatUnlocksTable).omit({ id: true, createdAt: true });
export type InsertChatUnlock = z.infer<typeof insertChatUnlockSchema>;
export type ChatUnlock = typeof chatUnlocksTable.$inferSelect;
