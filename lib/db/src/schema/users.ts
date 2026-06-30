import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  // PIN e domanda di sicurezza sono OPZIONALI: gli utenti Google/email non li
  // hanno (entrano tramite Supabase Auth). Restano per gli utenti storici.
  pinHash: text("pin_hash"),
  cap: text("cap").notNull(),
  area: text("area"),
  securityQuestion: text("security_question"),
  securityAnswerHash: text("security_answer_hash"),
  // Codice di recupero: solo per utenti PIN storici; per Google/email è NULL
  // (il recupero passa da Google / link email). Unicità solo sui valori presenti.
  recoveryCode: text("recovery_code"),
  // Identità esterna (Supabase Auth). auth_provider: 'pin' | 'google' | 'email'.
  email: text("email"),
  authProvider: text("auth_provider").default("pin").notNull(),
  supabaseUserId: uuid("supabase_user_id"),
  isPremium: boolean("is_premium").default(false).notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  exchangesCompleted: integer("exchanges_completed").default(0).notNull(),
  acceptedTermsAt: timestamp("accepted_terms_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Nickname unico GLOBALE (case-insensitive). Il CAP non fa più parte
  // dell'identità: è solo dato geografico, modificabile dall'utente.
  nicknameUnique: uniqueIndex("users_nickname_lower_unique").on(sql`lower(${t.nickname})`),
  // Unicità su email / supabase_user_id / recovery_code solo sui valori presenti.
  emailUnique: uniqueIndex("users_email_lower_unique")
    .on(sql`lower(${t.email})`)
    .where(sql`${t.email} IS NOT NULL`),
  supabaseUserIdUnique: uniqueIndex("users_supabase_user_id_unique")
    .on(t.supabaseUserId)
    .where(sql`${t.supabaseUserId} IS NOT NULL`),
  recoveryCodeUnique: uniqueIndex("users_recovery_code_unique_idx")
    .on(t.recoveryCode)
    .where(sql`${t.recoveryCode} IS NOT NULL`),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
