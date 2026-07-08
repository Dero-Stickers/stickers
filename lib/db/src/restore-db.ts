/**
 * restore-db — ripristina l'INTERO database da un backup JSON prodotto da
 * `backup-db.ts` (formato { createdAt, tables: { tabella: [righe...] } }).
 *
 * A differenza di `restore-albums` (che ripristina solo il catalogo album), qui
 * si ripristinano TUTTE le tabelle e TUTTE le righe: è la rete di sicurezza per
 * un disaster recovery (DB corrotto, cancellazione accidentale, migrazione
 * sbagliata). Complementare a `backup-db`.
 *
 * SICUREZZA — operazione DISTRUTTIVA (sovrascrive i dati attuali):
 *  - gira SOLO se `ALLOW_DB_RESTORE=1` è impostato (evita esecuzioni accidentali);
 *  - opera in un'unica TRANSAZIONE: se qualcosa fallisce, rollback totale (il DB
 *    resta com'era, mai a metà);
 *  - i vincoli FK sono differiti a fine transazione (`SET CONSTRAINTS ALL DEFERRED`)
 *    così l'ordine di inserimento tra tabelle non conta;
 *  - per ogni tabella: TRUNCATE + reinserimento dal backup (ripristino fedele).
 *
 *   ALLOW_DB_RESTORE=1 pnpm --filter @workspace/db run restore:db -- <file.json>
 *   (senza argomento usa il backup JSON più recente in BACKUP/)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const ssl = { rejectUnauthorized: false };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

if (process.env.ALLOW_DB_RESTORE !== "1") {
  console.error(
    "[restore-db] RIFIUTATO: operazione distruttiva.\n" +
      "  Reimposta con: ALLOW_DB_RESTORE=1 pnpm --filter @workspace/db run restore:db -- <file.json>",
  );
  process.exit(1);
}

// Sceglie il file: argomento esplicito, oppure il backup più recente in BACKUP/.
function pickBackupFile(): string {
  const arg = process.argv[2];
  if (arg) {
    const p = resolve(arg);
    if (!existsSync(p)) throw new Error(`File non trovato: ${p}`);
    return p;
  }
  const dir = resolve(ROOT, "BACKUP");
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("backup_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) throw new Error(`Nessun backup_*.json in ${dir}`);
  return resolve(dir, files[0]);
}

async function main() {
  const file = pickBackupFile();
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    createdAt?: string;
    tables: Record<string, Record<string, unknown>[]>;
  };
  const tables = parsed.tables ?? {};
  const names = Object.keys(tables);
  if (names.length === 0) throw new Error("Backup senza tabelle: interrotto.");

  console.log(`[restore-db] file: ${file}`);
  console.log(`[restore-db] creato: ${parsed.createdAt ?? "?"} — ${names.length} tabelle`);

  const client = new pg.Client({ connectionString, ssl });
  await client.connect();
  try {
    await client.query("BEGIN");
    // I vincoli FK non contano durante il ripristino: verificati solo al COMMIT.
    await client.query("SET CONSTRAINTS ALL DEFERRED");

    const summary: string[] = [];
    for (const table of names) {
      const rows = tables[table] ?? [];
      // Svuota e reinserisce (ripristino fedele). CASCADE per rispettare le FK.
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const colList = cols.map((c) => `"${c}"`).join(", ");
        const values = cols.map((c) => (row as Record<string, unknown>)[c]);
        await client.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
          values,
        );
      }
      summary.push(`${table}:${rows.length}`);
    }

    await client.query("COMMIT");
    console.log(`[restore-db] ✅ ripristino completato (transazione confermata).`);
    console.log(`[restore-db] ${summary.join("  ")}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[restore-db] ❌ errore → ROLLBACK, il DB NON è stato modificato:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[restore-db] errore:", err);
  process.exit(1);
});
