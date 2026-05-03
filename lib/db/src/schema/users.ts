import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
  demoStartedAt: timestamp("demo_started_at"),
  demoExpiresAt: timestamp("demo_expires_at"),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  exchangesCompleted: integer("exchanges_completed").default(0).notNull(),
  acceptedTermsAt: timestamp("accepted_terms_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Race-safe uniqueness for "nickname per CAP".
  nicknameCapUnique: uniqueIndex("users_nickname_cap_unique").on(t.cap, t.nickname),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
