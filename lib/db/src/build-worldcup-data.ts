/**
 * build-worldcup-data — converte la checklist testuale dei Mondiali 2026
 * (`album-source/link/panini_world_cup_2026.md`) nel formato dati versionato
 * usato da restore:albums, e la salva come `src/data/world-cup-2026.json.gz`.
 *
 * Formato riga sorgente:  `CODICE Nome[ - Squadra][ FOIL]`
 *   es. "MEX2 Luis Malagón - Mexico"  ·  "FWC3 Official Mascots FOIL"
 * A differenza dei Calciatori i codici sono ALFANUMERICI (MEX10, FWC19, CC1):
 * vanno nel campo `code` (già testuale); `number` è la posizione 1..N nel
 * listino ufficiale. Il marchio FOIL finisce in `description`.
 *
 * L'album è generato con isPublished=false: lo pubblica l'owner dall'admin
 * dopo il controllo. Rilanciarlo è idempotente (sovrascrive il .gz).
 *
 *   pnpm --filter @workspace/db run build:worldcup-data
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

type SeedSticker = { number: number; code: string; name: string; description: string | null };

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../../../album-source/link/panini_world_cup_2026.md");
const OUT = resolve(here, "data", "world-cup-2026.json.gz");

const TITLE = "FIFA World Cup 2026";

function main() {
  const raw = readFileSync(SRC, "utf8");
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("```"));

  const stickers: SeedSticker[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    // Primo token = codice stampato; il resto è il nome (con eventuale squadra).
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) throw new Error(`Riga non riconosciuta: "${line}"`);
    const code = m[1];
    let name = m[2].trim();
    const isFoil = /\sFOIL$/.test(name);
    if (isFoil) name = name.replace(/\sFOIL$/, "").trim();
    if (seen.has(code)) throw new Error(`Codice duplicato nel sorgente: "${code}"`);
    seen.add(code);
    stickers.push({
      number: stickers.length + 1,
      code,
      name,
      description: isFoil ? "FOIL" : null,
    });
  }

  const payload = { albums: [{ title: TITLE, isPublished: false, stickers }] };
  writeFileSync(OUT, gzipSync(Buffer.from(JSON.stringify(payload), "utf8")));

  const foil = stickers.filter(s => s.description === "FOIL").length;
  const longest = stickers.reduce((a, s) => Math.max(a, s.code.length), 0);
  console.log(`[build-worldcup] "${TITLE}": ${stickers.length} figurine (${foil} FOIL, codice max ${longest} char) → ${OUT}`);
}

main();
