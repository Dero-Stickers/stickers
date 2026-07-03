/**
 * export-albums — fotografa lo stato attuale degli album dal DB e lo scrive in
 * `src/data/calciatori.json` (versionato in git). Quel file è la fonte di
 * verità "default" da cui `restore-albums` ricrea gli album quando mancano.
 *
 * Da rilanciare SOLO quando si vuole aggiornare il set di default (es. dopo aver
 * aggiunto/corretto album da admin). Sola lettura sul DB.
 *
 *   pnpm --filter @workspace/db run export:albums
 */
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const ssl = { rejectUnauthorized: false };

// Salvato compresso (gzip): il dataset è grande (~1.8MB) e non serve al runtime
// del deploy, solo allo script di restore → repo leggero (~250KB).
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "data", "calciatori.json.gz");

async function main() {
  const client = new pg.Client({ connectionString, ssl });
  await client.connect();

  // I Mondiali hanno il loro file versionato (world-cup-2026.json.gz, generato
  // da build:worldcup-data): qui esportiamo solo il resto, niente duplicati.
  const albums = (await client.query(
    `select id, title, is_published, category from albums where title not ilike '%world cup%' order by title desc`,
  )).rows;

  const out: {
    title: string;
    isPublished: boolean;
    category: string;
    stickers: { number: number; code: string; name: string; description: string | null }[];
  }[] = [];

  for (const a of albums) {
    const stickers = (await client.query(
      `select number, code, name, description from stickers where album_id = $1 order by number asc`,
      [a.id],
    )).rows;
    out.push({
      title: a.title,
      isPublished: a.is_published,
      category: a.category,
      stickers: stickers.map(s => ({
        number: s.number,
        code: s.code ?? "",
        name: s.name,
        description: s.description ?? null,
      })),
    });
  }

  const total = out.reduce((s, a) => s + a.stickers.length, 0);
  writeFileSync(OUT, gzipSync(Buffer.from(JSON.stringify({ albums: out }), "utf8")));
  console.log(`[export] ${out.length} album, ${total} figurine → ${OUT}`);

  await client.end();
}

main().catch(err => { console.error("[export] errore:", err); process.exit(1); });
