import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const errorReportsTable = pgTable(
  "error_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    errorHash: text("error_hash").notNull(),
    count: integer("count").default(1).notNull(),
    priority: text("priority").default("medium").notNull(),
    status: text("status").default("new").notNull(),
    page: text("page"),
    errorType: text("error_type").notNull(),
    messageClean: text("message_clean"),
    stackTop: text("stack_top"),
    uaClass: text("ua_class"),
    ipPrefix: text("ip_prefix"),
    userId: integer("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    appVersion: text("app_version"),
    userNote: text("user_note"),
    adminNote: text("admin_note"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => ({
    hashUnique: uniqueIndex("error_reports_hash_unique").on(t.errorHash),
    statusPriorityIdx: index("error_reports_status_priority_idx").on(
      t.status,
      t.priority,
      t.createdAt,
    ),
    userIdx: index("error_reports_user_idx").on(t.userId),
  }),
);

export type ErrorReport = typeof errorReportsTable.$inferSelect;
export type InsertErrorReport = typeof errorReportsTable.$inferInsert;
