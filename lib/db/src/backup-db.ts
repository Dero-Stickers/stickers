/**
 * backup-db — snapshot logico dell'intero DB (tutte le tabelle public) in un
 * unico file JSON dentro `BACKUP/` (cartella esclusa da git).
 *
 * Non è un dump binario pg_dump, ma un backup logico completo e leggibile: ogni
 * tabella con tutte le righe. Sufficiente per ripristinare i dati in caso di
 * pulizia/errore durante i test.
 *
 *   pnpm --filter @workspace/db run backup
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const ssl = { rejectUnauthorized: false };

// lib/db/src → root: ../../../  (src → db → lib → root)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function main() {
  const client = new pg.Client({ connectionString, ssl });
  await client.connect();

  const tables = (await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  )).rows.map(r => r.table_name as string);

  const dump: Record<string, unknown[]> = {};
  const counts: string[] = [];
  for (const t of tables) {
    const rows = (await client.query(`select * from "${t}"`)).rows;
    dump[t] = rows;
    counts.push(`${t}:${rows.length}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = resolve(ROOT, "BACKUP", `backup_${stamp}.json`);
  writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), tables: dump }, null, 1) + "\n", "utf8");

  console.log(`[backup] ${tables.length} tabelle → ${file}`);
  console.log(`[backup] ${counts.join("  ")}`);
  await client.end();
}

main().catch(err => { console.error("[backup] errore:", err); process.exit(1); });
