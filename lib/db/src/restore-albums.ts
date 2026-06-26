/**
 * restore-albums — ripristina gli album "default" dal file versionato
 * `src/data/calciatori.json`. È il comando da usare quando si vuole riportare
 * l'app allo stato con tutti gli album presenti (es. dopo test/pulizie).
 *
 * SICURO E ADDITIVO:
 *  - crea gli album mancanti (con copertina + figurine);
 *  - sugli album esistenti riempie SOLO le figurine mancanti (ON CONFLICT DO
 *    NOTHING su album_id+number): non cancella nulla, quindi NON tocca i
 *    progressi degli utenti (user_stickers/user_albums restano intatti);
 *  - imposta is_published=true e ripristina la copertina solo se mancante.
 *
 *   pnpm --filter @workspace/db run restore:albums
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

type SeedSticker = { number: number; code: string; name: string; description: string | null };
type SeedAlbum = { title: string; coverUrl: string | null; isPublished: boolean; stickers: SeedSticker[] };

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const ssl = { rejectUnauthorized: false };

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "data", "calciatori.json.gz");

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertStickers(client: pg.PoolClient | pg.Client, albumId: number, stickers: SeedSticker[]) {
  let inserted = 0;
  for (const part of chunk(stickers, 500)) {
    const values: unknown[] = [];
    const rows = part.map((s, i) => {
      const b = i * 5;
      values.push(albumId, s.number, s.code, s.name, s.description);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5})`;
    });
    const res = await client.query(
      `insert into stickers (album_id, number, code, name, description)
       values ${rows.join(",")}
       on conflict (album_id, number) do nothing`,
      values,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

async function main() {
  const data: { albums: SeedAlbum[] } = JSON.parse(gunzipSync(readFileSync(SRC)).toString("utf8"));
  const client = new pg.Client({ connectionString, ssl });
  await client.connect();

  let created = 0, filled = 0, ok = 0;
  for (const a of data.albums) {
    const found = await client.query(`select id from albums where title = $1`, [a.title]);
    if (found.rows.length === 0) {
      await client.query("begin");
      try {
        const ins = await client.query(
          `insert into albums (title, cover_url, total_stickers, is_published)
           values ($1,$2,$3,$4) returning id`,
          [a.title, a.coverUrl, a.stickers.length, a.isPublished],
        );
        const albumId = ins.rows[0].id;
        await insertStickers(client, albumId, a.stickers);
        await client.query("commit");
        created++;
        console.log(`[restore] creato "${a.title}" (${a.stickers.length} figurine)`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    } else {
      const albumId = found.rows[0].id;
      const added = await insertStickers(client, albumId, a.stickers);
      // copertina solo se mancante; pubblicazione e conteggio riallineati
      await client.query(
        `update albums set cover_url = coalesce(cover_url, $2),
                           is_published = true,
                           total_stickers = $3
         where id = $1`,
        [albumId, a.coverUrl, a.stickers.length],
      );
      if (added > 0) { filled++; console.log(`[restore] "${a.title}": aggiunte ${added} figurine mancanti`); }
      else { ok++; }
    }
  }

  console.log(`[restore] fatto — creati:${created} integrati:${filled} già a posto:${ok} (totale album:${data.albums.length})`);
  await client.end();
}

main().catch(err => { console.error("[restore] errore:", err); process.exit(1); });
