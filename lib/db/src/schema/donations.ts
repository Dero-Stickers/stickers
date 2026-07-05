import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Donazioni spontanee ricevute via Ko-fi (webhook). L'app è 100% gratuita:
// questi contributi sono liberalità, non sbloccano nulla. La tabella è di sola
// consultazione lato admin; l'unico writer è il webhook Ko-fi (verificato col
// token). `kofiMessageId` è l'id transazione di Ko-fi: indice UNIQUE per
// idempotenza (Ko-fi può ritentare la consegna → niente doppioni).
export const donationsTable = pgTable(
  "donations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kofiMessageId: text("kofi_message_id").notNull(),
    fromName: text("from_name"),
    message: text("message"),
    // importo in valuta originale (Ko-fi manda stringa tipo "3.00")
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("EUR").notNull(),
    type: text("type"), // "Donation" | "Subscription" | "Shop Order" ...
    kofiTransactionId: text("kofi_transaction_id"),
    isPublic: text("is_public"), // Ko-fi manda booleano; teniamo il valore grezzo
    raw: jsonb("raw"), // payload completo Ko-fi, per audit/futuro
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    kofiMsgUnique: uniqueIndex("donations_kofi_message_unique").on(
      t.kofiMessageId,
    ),
    createdIdx: index("donations_created_idx").on(t.createdAt),
  }),
);

export type Donation = typeof donationsTable.$inferSelect;
export type InsertDonation = typeof donationsTable.$inferInsert;
