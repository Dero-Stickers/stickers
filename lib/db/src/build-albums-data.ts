/**
 * build-albums-data — converte le checklist testuali degli album (Mondiali +
 * Europei) in `album-source/link/*.md` nei file dati versionati usati da
 * restore:albums, salvandoli come `src/data/<slug>.json.gz` (uno per album).
 *
 * Deduzione automatica dal NOME FILE:
 *   "World Cup 2006.md"  → titolo "World Cup 2006", categoria "mondiali"
 *   "Euro Cup 2004.md"   → titolo "Euro Cup 2004",  categoria "europei"
 *
 * Formato riga sorgente:  `CODICE Nome[ - Squadra][ FOIL]`
 *   es. "MEX2 Luis Malagón - Mexico" · "5 Team Photo 1 - Portugal" · "FWC3 … FOIL"
 * I codici possono essere ALFANUMERICI (MEX10, FWC19, UEFA1) o numerici puri:
 * vanno sempre nel campo `code` (testuale). `number` è la posizione 1..N nel
 * listino. Il marchio FOIL finisce in `description`. Il codice DEVE essere
 * univoco nel file (le collisioni note — es. World Cup 2006 — sono già state
 * risolte a monte con suffisso a/b nel sorgente).
 *
 * Gli album nascono con isPublished=false: li pubblica l'owner dall'admin dopo
 * il controllo. Rilanciarlo è idempotente (sovrascrive i .gz).
 *
 *   pnpm --filter @workspace/db run build:albums-data
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

type SeedSticker = { number: number; code: string; name: string; description: string | null };

const here = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(here, "../../../album-source/link");
const OUT_DIR = resolve(here, "data");

/** Titolo album = nome file senza estensione. Categoria dedotta dal prefisso. */
function deriveMeta(file: string): { title: string; category: string; slug: string } | null {
  const title = basename(file, ".md").trim();
  let category: string | null = null;
  if (/^world cup /i.test(title)) category = "mondiali";
  else if (/^euro cup /i.test(title)) category = "europei";
  if (!category) return null; // file non pertinente (es. link_album_calciatori.md)
  // slug file: "World Cup 2006" → "world-cup-2006"
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { title, category, slug };
}

function parseStickers(file: string, raw: string): SeedSticker[] {
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("```"));

  const stickers: SeedSticker[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    // Primo token = codice stampato; il resto è il nome (con eventuale squadra).
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) throw new Error(`[${file}] riga non riconosciuta: "${line}"`);
    const code = m[1];
    let name = m[2].trim();
    const isFoil = /\sFOIL$/.test(name);
    if (isFoil) name = name.replace(/\sFOIL$/, "").trim();
    if (seen.has(code)) throw new Error(`[${file}] codice duplicato nel sorgente: "${code}"`);
    seen.add(code);
    stickers.push({
      number: stickers.length + 1,
      code,
      name,
      description: isFoil ? "FOIL" : null,
    });
  }
  return stickers;
}

function main() {
  const files = readdirSync(SRC_DIR).filter(f => f.endsWith(".md")).sort();
  let built = 0;
  for (const file of files) {
    const meta = deriveMeta(file);
    if (!meta) continue; // salta file non album (es. calciatori)

    const raw = readFileSync(resolve(SRC_DIR, file), "utf8");
    const stickers = parseStickers(file, raw);
    const payload = {
      albums: [{ title: meta.title, isPublished: false, category: meta.category, stickers }],
    };
    const out = resolve(OUT_DIR, `${meta.slug}.json.gz`);
    writeFileSync(out, gzipSync(Buffer.from(JSON.stringify(payload), "utf8")));

    const foil = stickers.filter(s => s.description === "FOIL").length;
    const longest = stickers.reduce((a, s) => Math.max(a, s.code.length), 0);
    console.log(
      `[build-albums] ${meta.category.padEnd(9)} "${meta.title}": ${stickers.length} figurine ` +
      `(${foil} FOIL, codice max ${longest} char) → ${meta.slug}.json.gz`,
    );
    built++;
  }
  console.log(`[build-albums] fatto — ${built} album generati in ${OUT_DIR}`);
}

main();
