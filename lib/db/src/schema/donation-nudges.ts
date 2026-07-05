import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// "Inviti a donare": l'admin, dalla pagina Utenti, può inviare a un utente un
// gentile invito (una tantum) a sostenere l'app con una donazione libera via
// Ko-fi. NON sblocca nulla, l'app resta gratuita: è solo un grazie.
//
// Ogni utente può avere UN SOLO invito attivo (uniqueIndex su user_id): l'admin
// lo "invita", l'utente lo vede UNA volta al prossimo accesso (`seen_at`), poi
// il modale non ricompare più. `seen_at` NULL = invito ancora da vedere.
export const donationNudgesTable = pgTable(
  "donation_nudges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // quando l'admin ha inviato l'invito
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    // quando l'utente l'ha visto (NULL = non ancora visto). Si valorizza sia se
    // clicca "Sostieni Stickers" sia se clicca "No grazie": in entrambi i casi
    // l'invito è "consumato" e non riappare.
    seenAt: timestamp("seen_at"),
  },
  (t) => ({
    // Un solo invito per utente: un secondo "Invita" aggiorna quello esistente.
    userUnique: uniqueIndex("donation_nudges_user_unique").on(t.userId),
  }),
);

export type DonationNudge = typeof donationNudgesTable.$inferSelect;
export type InsertDonationNudge = typeof donationNudgesTable.$inferInsert;
