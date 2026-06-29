import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  pinHash: text("pin_hash").notNull(),
  cap: text("cap").notNull(),
  area: text("area"),
  securityQuestion: text("security_question").notNull(),
  securityAnswerHash: text("security_answer_hash").notNull(),
  recoveryCode: text("recovery_code").notNull().unique(),
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
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
