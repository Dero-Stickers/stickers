/**
 * Seed di SIMULAZIONE "primi utenti veri": dà figurine a Dero975 (id 69) e crea
 * 6 utenti finti COMPLEMENTARI — 3 vicini (<30 km) + 3 lontani (30-150 km) da
 * Milano (CAP 20100) — così l'app mostra MATCH REALI (non solo i profili-prova).
 *
 * ADDITIVO e REVERSIBILE. Gli utenti finti hanno recovery_code con prefisso
 * "STICK-TST-" → cleanup standard del progetto:
 *   DELETE FROM users WHERE recovery_code LIKE 'STICK-TST-%';  (cascade)
 * Per ri-azzerare Dero975 (tornare vergine):
 *   DELETE FROM user_stickers WHERE user_id=69; DELETE FROM user_albums WHERE user_id=69;
 *
 * Sicurezza: parte solo con SEED_SIMULAZIONE=1. Non tocca albums/stickers (catalogo).
 *
 * Uso:
 *   SEED_SIMULAZIONE=1 pnpm --filter @workspace/db exec tsx src/seed-simulazione.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql, eq, and } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";
import {
  usersTable, albumsTable, stickersTable,
  userAlbumsTable, userStickersTable,
} from "./schema/index.js";

if (process.env.SEED_SIMULAZIONE !== "1") {
  console.error("Rifiuto: imposta SEED_SIMULAZIONE=1 per eseguire.");
  process.exit(1);
}

const { Pool } = pg;
const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL o DATABASE_URL non impostato");
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool, { schema: { usersTable, albumsTable, stickersTable, userAlbumsTable, userStickersTable } });

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32, { N: 16384 });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

const DERO = 69;
// Album usati per la simulazione (dal catalogo reale).
const ALB = { a2526: 11, a2425: 12, a2324: 13 };

// 6 utenti finti: 3 vicini + 3 lontani da Milano 20100 (distanze via CAP).
const FAKES = [
  { nick: "marcomi",  cap: "20121", area: "Milano Centro",      pin: "1111", near: true  }, // ~6 km
  { nick: "annasesto", cap: "20099", area: "Sesto San Giovanni", pin: "2222", near: true  }, // ~2 km
  { nick: "lucamonza", cap: "20900", area: "Monza",              pin: "3333", near: true  }, // ~28 km
  { nick: "sarabg",   cap: "24121", area: "Bergamo",            pin: "4444", near: false }, // ~41 km
  { nick: "paolocomo", cap: "22100", area: "Como",               pin: "5555", near: false }, // ~55 km
  { nick: "giuliarm", cap: "00184", area: "Roma",               pin: "6666", near: false }, // ~96 km
];

// Range per `number` su un album: A=primo quarto, B, C, D.
// Dero975 avrà: album 11 → doppia A, mancante C, posseduta B+D
//               album 12 → tutto mancante (così i finti che ce l'hanno gli danno tanto)
// I finti "complementari" avranno doppia dove a Dero manca e mancante dove Dero ha doppia.

async function albumRanges(albumId: number) {
  const rows = await db.select({ id: stickersTable.id, number: stickersTable.number })
    .from(stickersTable).where(eq(stickersTable.albumId, albumId));
  rows.sort((a, b) => a.number - b.number);
  const n = rows.length;
  const q = Math.floor(n / 4);
  return {
    all: rows,
    A: rows.slice(0, q), B: rows.slice(q, 2 * q), C: rows.slice(2 * q, 3 * q), D: rows.slice(3 * q),
  };
}

async function main() {
  console.log("== SEED SIMULAZIONE ==");

  // --- 1) Dero975: aggiungi album 11 e 12, con stati definiti ---
  const r11 = await albumRanges(ALB.a2526);
  const r12 = await albumRanges(ALB.a2425);

  // pulizia idempotente dei possessi Dero su questi album (ri-esecuzione sicura)
  await db.delete(userStickersTable).where(and(eq(userStickersTable.userId, DERO), sql`${userStickersTable.albumId} in (${ALB.a2526}, ${ALB.a2425})`));
  await db.delete(userAlbumsTable).where(and(eq(userAlbumsTable.userId, DERO), sql`${userAlbumsTable.albumId} in (${ALB.a2526}, ${ALB.a2425})`));

  await db.insert(userAlbumsTable).values([
    { userId: DERO, albumId: ALB.a2526 },
    { userId: DERO, albumId: ALB.a2425 },
  ]);

  const deroRows: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  // album 11: doppia A, mancante C, posseduta B+D
  for (const s of r11.A) deroRows.push({ userId: DERO, albumId: ALB.a2526, stickerId: s.id, state: "doppia" });
  for (const s of r11.C) deroRows.push({ userId: DERO, albumId: ALB.a2526, stickerId: s.id, state: "mancante" });
  for (const s of [...r11.B, ...r11.D]) deroRows.push({ userId: DERO, albumId: ALB.a2526, stickerId: s.id, state: "posseduta" });
  // album 12: tutto mancante
  for (const s of r12.all) deroRows.push({ userId: DERO, albumId: ALB.a2425, stickerId: s.id, state: "mancante" });

  // insert a blocchi
  for (let i = 0; i < deroRows.length; i += 500) {
    await db.insert(userStickersTable).values(deroRows.slice(i, i + 500));
  }
  console.log(`Dero975: album 11+12, ${deroRows.length} figurine (doppia A / mancante C / poss B,D · a12 tutto mancante)`);

  // --- 2) 6 utenti finti complementari ---
  let created = 0;
  for (const f of FAKES) {
    // già esistente? (idempotenza per nickname)
    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(sql`lower(${usersTable.nickname})`, f.nick.toLowerCase())).limit(1);
    if (existing.length) { console.log(`  ${f.nick} già presente, salto`); continue; }

    const [u] = await db.insert(usersTable).values({
      nickname: f.nick,
      pinHash: hashPin(f.pin),
      cap: f.cap,
      area: f.area,
      authProvider: "pin",
      recoveryCode: `STICK-TST-SIM-${f.nick}`,
      acceptedTermsAt: sql`now()`,
      exchangesCompleted: f.near ? 5 : 2,
    }).returning({ id: usersTable.id });
    const uid = u.id;

    // album 11 complementare a Dero: doppia C (Dero manca), mancante A (Dero ha doppie), poss B+D
    // album 12: doppia su tutto (Dero ha tutto mancante → riceve tanto)
    await db.insert(userAlbumsTable).values([
      { userId: uid, albumId: ALB.a2526 },
      { userId: uid, albumId: ALB.a2425 },
    ]);
    const rows: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
    for (const s of r11.C) rows.push({ userId: uid, albumId: ALB.a2526, stickerId: s.id, state: "doppia" });
    for (const s of r11.A) rows.push({ userId: uid, albumId: ALB.a2526, stickerId: s.id, state: "mancante" });
    for (const s of [...r11.B, ...r11.D]) rows.push({ userId: uid, albumId: ALB.a2526, stickerId: s.id, state: "posseduta" });
    // album 12: metà doppia (dà a Dero), metà posseduta
    const half12 = Math.floor(r12.all.length / 2);
    r12.all.forEach((s, idx) => rows.push({ userId: uid, albumId: ALB.a2425, stickerId: s.id, state: idx < half12 ? "doppia" : "posseduta" }));

    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(userStickersTable).values(rows.slice(i, i + 500));
    }
    created++;
    console.log(`  + ${f.nick} (${f.area}, ${f.cap}, ${f.near ? "VICINO" : "lontano"}) — ${rows.length} figurine`);
  }

  console.log(`\n== FATTO: Dero975 popolato + ${created} utenti finti (marker STICK-TST-SIM-) ==`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
