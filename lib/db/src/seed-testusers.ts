/**
 * Seed ADDITIVO di utenti di test sparsi per l'Italia, con album e figurine
 * casuali per generare molti match testabili. NON cancella nulla.
 *
 * Sicurezza: parte solo con SEED_TESTUSERS=1. Inserisce solo righe nuove
 * (users / user_albums / user_stickers). Gli album e le figurine REALI non
 * vengono toccati: gli utenti si limitano ad "aggiungere" album esistenti.
 *
 * Uso:
 *   SEED_TESTUSERS=1 pnpm --filter @workspace/db run seed:testusers
 *
 * Cleanup (gli utenti creati hanno recoveryCode che inizia con "STICK-TST-"):
 *   DELETE FROM users WHERE recovery_code LIKE 'STICK-TST-%';  -- cascade su album/figurine
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";
import {
  usersTable, albumsTable, stickersTable,
  userAlbumsTable, userStickersTable,
} from "./schema/index.js";

const { Pool } = pg;

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const isSupabase = !!process.env.SUPABASE_DATABASE_URL?.trim();
const pool = new Pool({ connectionString, ssl: isSupabase ? { rejectUnauthorized: false } : undefined });
const db = drizzle(pool, { schema: { usersTable, albumsTable, stickersTable, userAlbumsTable, userStickersTable } });

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32, { N: 16384 });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

// Città italiane (CAP reali per provincia) sparse su tutta la penisola + isole.
const CITIES: { area: string; cap: string; cc: string }[] = [
  { area: "Torino", cap: "10121", cc: "to" }, { area: "Milano", cap: "20121", cc: "mi" },
  { area: "Como", cap: "22100", cc: "co" }, { area: "Bergamo", cap: "24121", cc: "bg" },
  { area: "Brescia", cap: "25121", cc: "bs" }, { area: "Genova", cap: "16121", cc: "ge" },
  { area: "La Spezia", cap: "19121", cc: "sp" }, { area: "Aosta", cap: "11100", cc: "ao" },
  { area: "Venezia", cap: "30121", cc: "ve" }, { area: "Verona", cap: "37121", cc: "vr" },
  { area: "Padova", cap: "35121", cc: "pd" }, { area: "Vicenza", cap: "36100", cc: "vi" },
  { area: "Trieste", cap: "34121", cc: "ts" }, { area: "Udine", cap: "33100", cc: "ud" },
  { area: "Trento", cap: "38122", cc: "tn" }, { area: "Bolzano", cap: "39100", cc: "bz" },
  { area: "Bologna", cap: "40121", cc: "bo" }, { area: "Modena", cap: "41121", cc: "mo" },
  { area: "Parma", cap: "43121", cc: "pr" }, { area: "Ferrara", cap: "44121", cc: "fe" },
  { area: "Rimini", cap: "47921", cc: "rn" }, { area: "Ravenna", cap: "48121", cc: "ra" },
  { area: "Firenze", cap: "50122", cc: "fi" }, { area: "Pisa", cap: "56121", cc: "pi" },
  { area: "Livorno", cap: "57121", cc: "li" }, { area: "Perugia", cap: "06121", cc: "pg" },
  { area: "Ancona", cap: "60121", cc: "an" }, { area: "Roma", cap: "00184", cc: "rm" },
  { area: "Latina", cap: "04100", cc: "lt" }, { area: "Pescara", cap: "65121", cc: "pe" },
  { area: "L'Aquila", cap: "67100", cc: "aq" }, { area: "Napoli", cap: "80121", cc: "na" },
  { area: "Salerno", cap: "84121", cc: "sa" }, { area: "Caserta", cap: "81100", cc: "ce" },
  { area: "Bari", cap: "70121", cc: "ba" }, { area: "Lecce", cap: "73100", cc: "le" },
  { area: "Foggia", cap: "71121", cc: "fg" }, { area: "Taranto", cap: "74121", cc: "ta" },
  { area: "Potenza", cap: "85100", cc: "pz" }, { area: "Cosenza", cap: "87100", cc: "cs" },
  { area: "Reggio Calabria", cap: "89121", cc: "rc" }, { area: "Catanzaro", cap: "88100", cc: "cz" },
  { area: "Palermo", cap: "90121", cc: "pa" }, { area: "Catania", cap: "95121", cc: "ct" },
  { area: "Messina", cap: "98121", cc: "me" }, { area: "Siracusa", cap: "96100", cc: "sr" },
  { area: "Cagliari", cap: "09121", cc: "ca" }, { area: "Sassari", cap: "07100", cc: "ss" },
  { area: "Nuoro", cap: "08100", cc: "nu" }, { area: "Olbia", cap: "07026", cc: "ot" },
];

const NAMES = [
  "luca", "marco", "giulia", "anna", "sara", "paolo", "chiara", "davide", "elena", "roby",
  "fra", "teo", "ale", "simo", "marti", "andre", "vale", "stefy", "fede", "giorgio",
  "laura", "nico", "bea", "fabio", "ila", "ricky", "cami", "tommy", "greta", "renzo",
  "manu", "silvia", "dani", "robi", "michi", "lori", "vero", "luigi", "gaia", "enzo",
  "rosa", "pino", "carla", "gigi", "nadia", "bruno", "lella", "sergio", "mara", "toni",
];

const SAMPLE_CORE = 150;   // figurine campionate per album condiviso
const SAMPLE_EXTRA = 120;  // figurine campionate per album extra
const CORE_ALBUMS = [11, 12, 13, 14];     // album posseduti da Dero975 (id 1)
const EXTRA_POOL = [15, 16, 17, 18];      // album extra per varietà "in comune"
const N_USERS = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  if (process.env.SEED_TESTUSERS !== "1") {
    console.error("⛔ STOP: imposta SEED_TESTUSERS=1 per inserire i 50 utenti di test (additivo, non distruttivo).");
    process.exit(1);
  }
  console.log("Avvio seed additivo utenti di test…");

  // Nickname già usati (lower) per evitare collisioni con l'indice unico globale.
  const existing = await db.execute<{ nickname: string }>(sql`SELECT lower(nickname) AS nickname FROM users`);
  const used = new Set<string>(((existing as any).rows ?? existing).map((r: any) => r.nickname));

  // Preload id figurine per album usati.
  const allAlbumIds = [...new Set([...CORE_ALBUMS, ...EXTRA_POOL])];
  const stRows = await db.execute<{ id: number; album_id: number }>(
    sql`SELECT id, album_id FROM stickers WHERE album_id IN (${sql.join(allAlbumIds.map(id => sql`${id}`), sql`, `)}) ORDER BY album_id, number`,
  );
  const stickersByAlbum = new Map<number, number[]>();
  for (const r of (((stRows as any).rows ?? stRows) as { id: number; album_id: number }[])) {
    if (!stickersByAlbum.has(r.album_id)) stickersByAlbum.set(r.album_id, []);
    stickersByAlbum.get(r.album_id)!.push(r.id);
  }

  // 1) Costruisci e inserisci i 50 utenti.
  const userValues = [];
  for (let i = 0; i < N_USERS; i++) {
    const city = CITIES[i % CITIES.length];
    const name = NAMES[i % NAMES.length];
    let nick = `${name}${city.cc}`;
    while (used.has(nick.toLowerCase())) nick = `${name}${city.cc}${i}`;
    used.add(nick.toLowerCase());
    // REGOLA NICKNAME (vedi auth.ts): 5-12 caratteri [A-Za-z0-9_-], forma
    // canonica = prima lettera maiuscola, resto minuscolo. Rispettarla sempre.
    nick = nick.charAt(0).toUpperCase() + nick.slice(1).toLowerCase();
    const n = String(i + 1).padStart(2, "0");
    const rand = randomBytes(2).toString("hex").toUpperCase();
    userValues.push({
      nickname: nick,
      pinHash: hashPin("1234"),
      cap: city.cap,
      area: city.area,
      securityQuestion: "Città dove sei nato?",
      securityAnswerHash: hashPin(city.area.toLowerCase()),
      recoveryCode: `STICK-TST-${n}-${rand}`,
      isPremium: i % 3 === 0,
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: Math.floor(Math.random() * 40),
    });
  }
  const insertedUsers = await db.insert(usersTable).values(userValues).returning({ id: usersTable.id, nickname: usersTable.nickname });
  console.log(`✓ ${insertedUsers.length} utenti creati (sparsi su ${new Set(CITIES.map(c => c.cap)).size} città)`);

  // 2) Album utente + figurine campionate con stati pesati.
  const albumRows: { userId: number; albumId: number }[] = [];
  const stickerRows: { userId: number; albumId: number; stickerId: number; state: string }[] = [];

  for (const u of insertedUsers) {
    const extras = shuffle(EXTRA_POOL).slice(0, 1 + Math.floor(Math.random() * 2)); // 1-2 extra
    const albums = [...CORE_ALBUMS, ...extras];
    for (const albumId of albums) {
      albumRows.push({ userId: u.id, albumId });
      const ids = stickersByAlbum.get(albumId) ?? [];
      if (ids.length === 0) continue;
      const sampleN = Math.min(CORE_ALBUMS.includes(albumId) ? SAMPLE_CORE : SAMPLE_EXTRA, ids.length);
      const sample = shuffle(ids).slice(0, sampleN);
      // 40% doppia, 40% mancante, 20% posseduta → massimizza il potenziale di scambio
      for (let k = 0; k < sample.length; k++) {
        const r = Math.random();
        const state = r < 0.4 ? "doppia" : r < 0.8 ? "mancante" : "posseduta";
        stickerRows.push({ userId: u.id, albumId, stickerId: sample[k], state });
      }
    }
  }

  await db.insert(userAlbumsTable).values(albumRows);
  console.log(`✓ ${albumRows.length} righe user_albums`);

  // Insert a chunk per non superare i limiti del singolo statement.
  const CHUNK = 1000;
  for (let i = 0; i < stickerRows.length; i += CHUNK) {
    await db.insert(userStickersTable).values(stickerRows.slice(i, i + CHUNK));
  }
  console.log(`✓ ${stickerRows.length} righe user_stickers (doppie/mancanti/possedute)`);

  console.log("✅ Fatto. Utenti di test pronti per i match.");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
