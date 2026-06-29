import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Pagamenti per lo sblocco delle chat (nuovo modello di monetizzazione).
 *
 * Importi SEMPRE in centesimi interi (mai float) per evitare errori sui soldi.
 * Lo sblocco effettivo NON va mai concesso dal client: solo dal webhook del
 * provider (Stripe/PayPal) dopo conferma reale del pagamento. `providerRef` è
 * l'id transazione del provider e serve da chiave di idempotenza del webhook.
 */
export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    provider: text("provider").notNull(), // 'stripe' | 'paypal'
    kind: text("kind").notNull(), // 'single' (una chat) | 'all' (tutte, a vita)
    // Valorizzato solo per kind='single': il match con cui si sblocca la chat.
    otherUserId: integer("other_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: text("status").notNull().default("pending"), // 'pending' | 'paid' | 'failed' | 'refunded'
    providerRef: text("provider_ref"), // id transazione provider (idempotenza webhook)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    // NULL multipli ammessi (pending senza ref); una volta valorizzato è unico.
    providerRefUnique: uniqueIndex("payments_provider_ref_unique").on(t.providerRef),
    userIdx: index("payments_user_idx").on(t.userId),
  }),
);

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
