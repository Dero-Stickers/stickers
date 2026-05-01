import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { albumsTable } from "./albums";
import { stickersTable } from "./stickers";

export const userStickersTable = pgTable("user_stickers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  albumId: integer("album_id").references(() => albumsTable.id, { onDelete: "cascade" }).notNull(),
  stickerId: integer("sticker_id").references(() => stickersTable.id, { onDelete: "cascade" }).notNull(),
  state: text("state").notNull().default("mancante"), // mancante | posseduta | doppia
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserStickerSchema = createInsertSchema(userStickersTable).omit({ id: true, updatedAt: true });
export type InsertUserSticker = z.infer<typeof insertUserStickerSchema>;
export type UserSticker = typeof userStickersTable.$inferSelect;
