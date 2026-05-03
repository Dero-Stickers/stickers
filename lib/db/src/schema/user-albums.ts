import { pgTable, serial, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { albumsTable } from "./albums";

export const userAlbumsTable = pgTable(
  "user_albums",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    albumId: integer("album_id").references(() => albumsTable.id, { onDelete: "cascade" }).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => ({
    userAlbumUnique: uniqueIndex("user_albums_user_album_unique").on(t.userId, t.albumId),
    albumIdx: index("user_albums_album_idx").on(t.albumId),
  }),
);

export const insertUserAlbumSchema = createInsertSchema(userAlbumsTable).omit({ id: true, addedAt: true });
export type InsertUserAlbum = z.infer<typeof insertUserAlbumSchema>;
export type UserAlbum = typeof userAlbumsTable.$inferSelect;
