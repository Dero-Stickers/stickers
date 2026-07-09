import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// "Inviti" che l'admin invia a un utente dalla pagina Utenti, a sua discrezione.
// Due tipi (colonna `type`):
//  - "dona"      → invito una-tantum a sostenere l'app con una donazione Ko-fi;
//  - "condividi" → invito RIPETIBILE a condividere l'app con gli amici (più
//                  persone = più match). Riarmabile: rinviandolo, l'utente lo
//                  rivede (l'invio azzera `seen_at`).
// NON sblocca nulla, l'app resta gratuita. L'utente vede il modale UNA volta per
// invio (`seen_at` NULL = ancora da vedere), poi non ricompare finché non lo
// rinvii. Unicità su (user_id, type): un invito-dona E un invito-condividi
// possono coesistere, ma non due dello stesso tipo.
export const NUDGE_TYPES = ["dona", "condividi"] as const;
export type NudgeType = (typeof NUDGE_TYPES)[number];

export const donationNudgesTable = pgTable(
  "donation_nudges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // tipo di invito: "dona" (default storico) | "condividi"
    type: text("type").notNull().default("dona"),
    // quando l'admin ha inviato l'invito
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    // quando l'utente l'ha visto (NULL = non ancora visto). Consuma l'invito.
    seenAt: timestamp("seen_at"),
  },
  (t) => ({
    // Un solo invito per (utente, tipo): un secondo invio dello stesso tipo
    // aggiorna la riga esistente (upsert su questo indice).
    userTypeUnique: uniqueIndex("donation_nudges_user_type_unique").on(t.userId, t.type),
  }),
);

export type DonationNudge = typeof donationNudgesTable.$inferSelect;
export type InsertDonationNudge = typeof donationNudgesTable.$inferInsert;
