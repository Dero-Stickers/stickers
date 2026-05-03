import { pgTable, serial, text, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { albumsTable } from "./albums";

export const stickersTable = pgTable(
  "stickers",
  {
    id: serial("id").primaryKey(),
    albumId: integer("album_id").references(() => albumsTable.id, { onDelete: "cascade" }).notNull(),
    number: integer("number").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (t) => ({
    // Each album cannot have two stickers with the same number — and this is
    // also the dominant lookup pattern (album → ordered stickers).
    albumNumberUnique: uniqueIndex("stickers_album_number_unique").on(t.albumId, t.number),
    albumIdx: index("stickers_album_idx").on(t.albumId),
  }),
);

export const insertStickerSchema = createInsertSchema(stickersTable).omit({ id: true });
export type InsertSticker = z.infer<typeof insertStickerSchema>;
export type Sticker = typeof stickersTable.$inferSelect;
