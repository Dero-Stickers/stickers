import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { chatsTable } from "./chats";

/**
 * Conferma di uno scambio concluso, lato singolo utente.
 *
 * Una riga = l'utente `userId` ha confermato, nella chat `chatId`, di aver
 * completato lo scambio di persona. La conferma aggiorna SOLO l'album di chi
 * conferma (doppie cedute → posseduta, mancanti ricevute → posseduta); non
 * tocca mai l'album dell'altro. `given_count`/`received_count` = quante figurine
 * sono state applicate per lato. Upsert su (chat, utente): una nuova conferma
 * (scambio parziale successivo) aggiorna la riga.
 */
export const tradeConfirmationsTable = pgTable(
  "trade_confirmations",
  {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id").references(() => chatsTable.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    givenCount: integer("given_count").default(0).notNull(),
    receivedCount: integer("received_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    chatUserUnique: uniqueIndex("trade_confirmations_chat_user_unique").on(t.chatId, t.userId),
  }),
);

export const insertTradeConfirmationSchema = createInsertSchema(tradeConfirmationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTradeConfirmation = z.infer<typeof insertTradeConfirmationSchema>;
export type TradeConfirmation = typeof tradeConfirmationsTable.$inferSelect;
