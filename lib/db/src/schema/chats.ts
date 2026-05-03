import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const chatsTable = pgTable(
  "chats",
  {
    id: serial("id").primaryKey(),
    user1Id: integer("user1_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    user2Id: integer("user2_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // "Open chats for user X" is the most frequent query — partial-style indexes
    // on each side cover both inbox queries.
    user1Idx: index("chats_user1_idx").on(t.user1Id, t.status),
    user2Idx: index("chats_user2_idx").on(t.user2Id, t.status),
  }),
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id").references(() => chatsTable.id, { onDelete: "cascade" }).notNull(),
    senderId: integer("sender_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    text: text("text").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // Render a chat in chronological order by chat_id + created_at.
    chatCreatedIdx: index("messages_chat_created_idx").on(t.chatId, t.createdAt),
    senderIdx: index("messages_sender_idx").on(t.senderId),
  }),
);

export const reportsTable = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id").references(() => usersTable.id).notNull(),
    reportedUserId: integer("reported_user_id").references(() => usersTable.id).notNull(),
    chatId: integer("chat_id").references(() => chatsTable.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("reports_status_idx").on(t.status, t.createdAt),
    reportedUserIdx: index("reports_reported_user_idx").on(t.reportedUserId),
  }),
);

export const adminActionsTable = pgTable(
  "admin_actions",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id").references(() => usersTable.id).notNull(),
    actionType: text("action_type").notNull(),
    targetUserId: integer("target_user_id").references(() => usersTable.id),
    targetChatId: integer("target_chat_id").references(() => chatsTable.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    adminCreatedIdx: index("admin_actions_admin_created_idx").on(t.adminUserId, t.createdAt),
    targetUserIdx: index("admin_actions_target_user_idx").on(t.targetUserId),
  }),
);

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatSchema = createInsertSchema(chatsTable).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export const insertAdminActionSchema = createInsertSchema(adminActionsTable).omit({ id: true, createdAt: true });

export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Chat = typeof chatsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
