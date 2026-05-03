/**
 * Seed Calciatori 2025-2026 album with the full 624-sticker collection.
 *
 * Idempotent: if the album already exists (matched by exact title) the script
 * exits without re-inserting. Run with:
 *
 *   pnpm tsx scripts/seed-calciatori-2025-2026.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, albumsTable, stickersTable } from "./index";

const TITLE = "Calciatori 2025-2026";
const DESCRIPTION = "Collezione ufficiale Panini Serie A — 624 figurine";
const SOURCE = resolve(
  process.cwd(),
  "../../attached_assets/Pasted-001-Trofeo-Serie-A-Enilive-002-Trofeo-Coppa-Italia-Frec_1777769415376.txt",
);

function parseLines(raw: string) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let kSeq = 0;
  const out: { number: number; name: string }[] = [];
  for (const line of lines) {
    // Numeric prefix: "001 - Name" or "1 - Name" or "1. Name"
    const num = line.match(/^(\d+)\s*[-.]\s*(.+)$/);
    if (num) {
      out.push({ number: parseInt(num[1], 10), name: num[2].trim() });
      continue;
    }
    // Kinder bonus: "K01 - Name" → assign sequential numbers 619..624,
    // keep the K-code in the name so it's still recognisable.
    const k = line.match(/^(K\d+)\s*[-.]\s*(.+)$/i);
    if (k) {
      kSeq += 1;
      out.push({ number: 618 + kSeq, name: `${k[1].toUpperCase()} - ${k[2].trim()}` });
      continue;
    }
  }
  // Deduplicate by number, keep first occurrence
  const seen = new Set<number>();
  return out.filter(s => {
    if (seen.has(s.number)) return false;
    seen.add(s.number);
    return true;
  });
}

async function main() {
  const raw = readFileSync(SOURCE, "utf8");
  const stickers = parseLines(raw);
  console.log(`[seed] parsed ${stickers.length} stickers from source`);

  const existing = await db.select().from(albumsTable).where(eq(albumsTable.title, TITLE));
  if (existing.length > 0) {
    const albumId = existing[0].id;
    const existingStickers = await db.select({ id: stickersTable.id })
      .from(stickersTable).where(eq(stickersTable.albumId, albumId));
    if (existingStickers.length >= stickers.length) {
      console.log(`[seed] album already has ${existingStickers.length} stickers — nothing to do`);
      process.exit(0);
    }
    console.log(`[seed] album exists (id=${albumId}) but only has ${existingStickers.length} stickers — wiping & reinserting in a transaction`);
    await db.transaction(async (tx) => {
      await tx.delete(stickersTable).where(eq(stickersTable.albumId, albumId));
      await tx.insert(stickersTable).values(stickers.map(s => ({ albumId, ...s })));
      await tx.update(albumsTable).set({ totalStickers: stickers.length }).where(eq(albumsTable.id, albumId));
    });
    console.log(`[seed] reinserted ${stickers.length} stickers into album ${albumId}`);
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    const [album] = await tx.insert(albumsTable).values({
      title: TITLE,
      description: DESCRIPTION,
      totalStickers: stickers.length,
      isPublished: true,
    }).returning();
    console.log(`[seed] created album id=${album.id}`);
    await tx.insert(stickersTable).values(stickers.map(s => ({ albumId: album.id, ...s })));
    console.log(`[seed] inserted ${stickers.length} stickers`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
