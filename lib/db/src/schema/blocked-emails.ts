import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Lista nera email — blocco a prova di aggiramento.
// Il blocco NON può vivere solo su users.is_blocked: eliminando la riga utente
// (hard delete) il blocco sparirebbe e l'email tornerebbe libera per una nuova
// iscrizione pulita. Qui la traccia SOPRAVVIVE alla cancellazione dell'account.
// La popola/svuota l'admin bloccando/sbloccando; login e registrazione la leggono.
export const blockedEmailsTable = pgTable(
  "blocked_emails",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    reason: text("reason"),
    blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  },
  (t) => ({
    // Una sola voce per email, case-insensitive (coerente con users_email_lower_unique).
    emailLowerUnique: uniqueIndex("blocked_emails_lower_unique").on(sql`lower(${t.email})`),
  }),
);

export type BlockedEmail = typeof blockedEmailsTable.$inferSelect;
export type InsertBlockedEmail = typeof blockedEmailsTable.$inferInsert;
