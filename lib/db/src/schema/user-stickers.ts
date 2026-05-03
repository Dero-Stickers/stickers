import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { albumsTable } from "./albums";
import { stickersTable } from "./stickers";

export const userStickersTable = pgTable(
  "user_stickers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    albumId: integer("album_id").references(() => albumsTable.id, { onDelete: "cascade" }).notNull(),
    stickerId: integer("sticker_id").references(() => stickersTable.id, { onDelete: "cascade" }).notNull(),
    state: text("state").notNull().default("mancante"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    // One row per (user, sticker) — prevents duplicates from race conditions and
    // is the natural lookup key for the toggle endpoint.
    userStickerUnique: uniqueIndex("user_stickers_user_sticker_unique").on(t.userId, t.stickerId),
    // Hot path: load all of a user's stickers for a given album in one shot.
    userAlbumIdx: index("user_stickers_user_album_idx").on(t.userId, t.albumId),
    stickerIdx: index("user_stickers_sticker_idx").on(t.stickerId),
  }),
);

export const insertUserStickerSchema = createInsertSchema(userStickersTable).omit({ id: true, updatedAt: true });
export type InsertUserSticker = z.infer<typeof insertUserStickerSchema>;
export type UserSticker = typeof userStickersTable.$inferSelect;
