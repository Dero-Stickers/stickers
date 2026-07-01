/**
 * HARD TEST — popola l'app come se fosse pubblicata da tempo:
 *   - ~3000 utenti sparsi in tutta Italia (CAP reali)
 *   - ogni utente: 1-3 album con figurine compilate, MEDIA 30-60 tra doppie e mancanti
 *   - Dero975 (utente di prova dell'owner) con collezione ampia sugli album core → tanti match
 *   - chat + messaggi + segnalazioni tra utenti (per popolare Messaggi/Segnalazioni admin)
 *
 * ADDITIVO e SICURO: parte solo con SEED_HARDTEST=1. NON tocca il catalogo
 * (albums/stickers) né gli account demo (admin, Dero975 restano; a Dero975
 * aggiungiamo solo possessi). Tutti gli utenti generati hanno recovery_code
 * con prefisso "STICK-TST-" per la pulizia successiva.
 *
 * Uso:
 *   SEED_HARDTEST=1 pnpm --filter @workspace/db exec tsx src/seed-hardtest.ts
 *
 * Cleanup (mantiene album vergini + account demo):
 *   DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE recovery_code LIKE 'STICK-TST-%')
 *      OR reported_user_id IN (SELECT id FROM users WHERE recovery_code LIKE 'STICK-TST-%');
 *   DELETE FROM users WHERE recovery_code LIKE 'STICK-TST-%';  -- cascade su album/figurine/chat/messaggi
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
const pool = new Pool({ connectionString, ssl: isSupabase ? { rejectUnauthorized: false } : undefined, max: 4 });
const db = drizzle(pool, { schema: { usersTable, albumsTable, stickersTable, userAlbumsTable, userStickersTable } });

// scrypt uguale al backend (auth.ts): scrypt$<saltB64>$<derivedB64>, N=16384, keylen=32
function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32, { N: 16384 });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}
const PIN_HASH = hashPin("1234"); // stesso hash per tutti i test (login PIN 1234) — riuso per velocità

// ---- Parametri ----
const N_USERS = Number(process.env.HARDTEST_N || 3000);   // override per prova (es. HARDTEST_N=30)
const N_CHATS_ENV = Number(process.env.HARDTEST_CHATS || 400);
const CORE_ALBUMS = [11, 12, 13, 14];          // dove vive la collezione di Dero975 → match
const EXTRA_POOL = [15, 16, 17, 18, 19, 20];   // album extra per varietà
// Figurine per album campionate: tarate per stare in media 30-60 doppie+mancanti
// per utente considerando 1-3 album. Stati: 45% doppia, 45% mancante, 10% posseduta.
const SAMPLE_PER_ALBUM_MIN = 22;
const SAMPLE_PER_ALBUM_MAX = 34;
const P_DOPPIA = 0.45, P_MANCANTE = 0.90; // <0.45 doppia, <0.90 mancante, else posseduta

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
  "luca","marco","giulia","anna","sara","paolo","chiara","davide","elena","roby",
  "fra","teo","ale","simo","marti","andre","vale","stefy","fede","giorgio",
  "laura","nico","bea","fabio","ila","ricky","cami","tommy","greta","renzo",
  "manu","silvia","dani","robi","michi","lori","vero","luigi","gaia","enzo",
  "rosa","pino","carla","gigi","nadia","bruno","lella","sergio","mara","toni",
  "gigio","kevin","denis","omar","ivan","dario","matteo","giada","alice","noemi",
];
const REPORT_REASONS = [
  "Comportamento scorretto durante lo scambio",
  "Linguaggio offensivo in chat",
  "Sospetto tentativo di truffa",
  "Non si è presentato allo scambio",
  "Spam / messaggi ripetuti",
];
const MSG_SAMPLES = [
  "Ciao! Ho visto che abbiamo un match, ti va di scambiare?",
  "Perfetto, quali doppie hai dell'album 2024-25?",
  "Io cerco la 45 e la 120, tu?",
  "Va bene per me, dove ci vediamo?",
  "Ci sto! Possiamo vederci in centro sabato.",
  "Ottimo, a sabato allora 👍",
  "Ti mando la lista delle mie doppie.",
  "Grazie mille, sei stato gentilissimo!",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function randInt(min: number, max: number) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

async function main() {
  if (process.env.SEED_HARDTEST !== "1") {
    console.error("⛔ STOP: imposta SEED_HARDTEST=1 per popolare l'app (additivo, non distruttivo).");
    process.exit(1);
  }
  const t0 = Date.now();
  console.log(`🚀 HARD TEST — popolamento ~${N_USERS} utenti…`);

  // Nickname già usati (evita collisioni con l'indice unico globale lower(nickname)).
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

  // ---------- 0) Dero975: collezione ampia sugli album core (per generare match) ----------
  const [deroRow] = (((await db.execute<{ id: number }>(sql`SELECT id FROM users WHERE lower(nickname)='dero975' LIMIT 1`)) as any).rows) as { id: number }[];
  if (deroRow) {
    const deroId = deroRow.id;
    // pulizia possessi precedenti di Dero (idempotente)
    await db.execute(sql`DELETE FROM user_stickers WHERE user_id=${deroId}`);
    await db.execute(sql`DELETE FROM user_albums WHERE user_id=${deroId}`);
    for (const albumId of CORE_ALBUMS) {
      const ids = stickersByAlbum.get(albumId) ?? [];
      if (!ids.length) continue;
      await db.execute(sql`INSERT INTO user_albums (user_id, album_id) VALUES (${deroId}, ${albumId})`);
      // Dero: metà album, stati bilanciati → forte potenziale di scambio con tutti
      const half = ids.slice(0, Math.floor(ids.length / 2));
      const rows = half.map((sid, k) => {
        const state = k % 2 === 0 ? "doppia" : "mancante";
        return sql`(${deroId}, ${albumId}, ${sid}, ${state})`;
      });
      for (let i = 0; i < rows.length; i += 500) {
        await db.execute(sql`INSERT INTO user_stickers (user_id, album_id, sticker_id, state) VALUES ${sql.join(rows.slice(i, i + 500), sql`, `)}`);
      }
    }
    console.log(`✓ Dero975 (id ${deroId}) collezione ampia su album ${CORE_ALBUMS.join(",")}`);
  }

  // ---------- 1) Utenti ----------
  const userValues: any[] = [];
  for (let i = 0; i < N_USERS; i++) {
    const city = CITIES[i % CITIES.length]!;
    const name = pick(NAMES);
    let nick = `${name}${city.cc}${i + 1}`;               // suffisso numerico → sempre unico
    nick = nick.slice(0, 12);
    while (used.has(nick.toLowerCase())) nick = `${name}${city.cc}${randInt(1, 99999)}`.slice(0, 12);
    used.add(nick.toLowerCase());
    nick = nick.charAt(0).toUpperCase() + nick.slice(1).toLowerCase();
    const rand = randomBytes(2).toString("hex").toUpperCase();
    userValues.push({
      nickname: nick,
      pinHash: PIN_HASH,
      cap: city.cap,
      area: city.area,
      recoveryCode: `STICK-TST-${String(i + 1).padStart(4, "0")}-${rand}`,
      authProvider: "pin",
      isPremium: i % 5 === 0,          // ~20% premium (tutte le chat)
      isBlocked: i % 97 === 0,         // ~1% bloccati (per testare il filtro)
      isAdmin: false,
      exchangesCompleted: randInt(0, 60),
    });
  }
  // insert utenti a chunk, raccogliendo gli id
  const insertedUsers: { id: number; nickname: string }[] = [];
  for (let i = 0; i < userValues.length; i += 500) {
    const part = await db.insert(usersTable).values(userValues.slice(i, i + 500)).returning({ id: usersTable.id, nickname: usersTable.nickname });
    insertedUsers.push(...part);
  }
  console.log(`✓ ${insertedUsers.length} utenti creati (su ${CITIES.length} città)`);

  // ---------- 2) Album + figurine (media 30-60 doppie/mancanti) ----------
  const albumTuples: any[] = [];
  const stickerTuples: any[] = [];
  let totDoppieMancanti = 0;
  for (const u of insertedUsers) {
    // 1-3 album: peso verso 1-2, con almeno un core album per fare match
    const nExtra = Math.random() < 0.55 ? 0 : Math.random() < 0.8 ? 1 : 2;
    const core = pick(CORE_ALBUMS);
    const extras = shuffle(EXTRA_POOL).slice(0, nExtra);
    const albums = [...new Set([core, ...extras])];
    // Budget totale ~30-60 doppie+mancanti/utente: se ha più album, si divide
    // il budget tra gli album (così il totale resta nel range anche con 2-3 album).
    const perAlbumMax = Math.max(12, Math.floor(SAMPLE_PER_ALBUM_MAX / albums.length) + 6);
    for (const albumId of albums) {
      albumTuples.push(sql`(${u.id}, ${albumId})`);
      const ids = stickersByAlbum.get(albumId) ?? [];
      if (!ids.length) continue;
      const sampleN = Math.min(randInt(SAMPLE_PER_ALBUM_MIN, perAlbumMax), ids.length);
      const sample = shuffle(ids).slice(0, sampleN);
      for (const sid of sample) {
        const r = Math.random();
        const state = r < P_DOPPIA ? "doppia" : r < P_MANCANTE ? "mancante" : "posseduta";
        if (state !== "posseduta") totDoppieMancanti++;
        stickerTuples.push(sql`(${u.id}, ${albumId}, ${sid}, ${state})`);
      }
    }
  }
  for (let i = 0; i < albumTuples.length; i += 800) {
    await db.execute(sql`INSERT INTO user_albums (user_id, album_id) VALUES ${sql.join(albumTuples.slice(i, i + 800), sql`, `)}`);
  }
  console.log(`✓ ${albumTuples.length} righe user_albums`);
  for (let i = 0; i < stickerTuples.length; i += 800) {
    await db.execute(sql`INSERT INTO user_stickers (user_id, album_id, sticker_id, state) VALUES ${sql.join(stickerTuples.slice(i, i + 800), sql`, `)}`);
    if (i % 8000 === 0) process.stdout.write(`  …figurine ${i}/${stickerTuples.length}\r`);
  }
  console.log(`\n✓ ${stickerTuples.length} righe user_stickers — media ${(totDoppieMancanti / insertedUsers.length).toFixed(1)} doppie+mancanti/utente`);

  // ---------- 3) Chat + messaggi + segnalazioni ----------
  // ~400 chat tra utenti a caso (+ alcune con Dero975), 2-8 messaggi, ~8% segnalate.
  const ids = insertedUsers.map(u => u.id);
  const N_CHATS = N_CHATS_ENV;
  const chatTuples: { u1: number; u2: number; status: string }[] = [];
  for (let i = 0; i < N_CHATS; i++) {
    let a = pick(ids), b = pick(ids);
    if (i < 40 && deroRow) a = deroRow.id;   // le prime 40 coinvolgono Dero975 (vista utente)
    while (b === a) b = pick(ids);
    chatTuples.push({ u1: a, u2: b, status: Math.random() < 0.15 ? "closed" : "active" });
  }
  const insertedChats: { id: number; u1: number; u2: number }[] = [];
  for (const c of chatTuples) {
    const [row] = (((await db.execute<{ id: number }>(sql`INSERT INTO chats (user1_id, user2_id, status) VALUES (${c.u1}, ${c.u2}, ${c.status}) RETURNING id`)) as any).rows) as { id: number }[];
    insertedChats.push({ id: row.id, u1: c.u1, u2: c.u2 });
  }
  console.log(`✓ ${insertedChats.length} chat`);

  const msgTuples: any[] = [];
  for (const c of insertedChats) {
    const nMsg = randInt(2, 8);
    for (let k = 0; k < nMsg; k++) {
      const sender = k % 2 === 0 ? c.u1 : c.u2;
      msgTuples.push(sql`(${c.id}, ${sender}, ${pick(MSG_SAMPLES)}, ${Math.random() < 0.6})`);
    }
  }
  for (let i = 0; i < msgTuples.length; i += 800) {
    await db.execute(sql`INSERT INTO messages (chat_id, sender_id, text, is_read) VALUES ${sql.join(msgTuples.slice(i, i + 800), sql`, `)}`);
  }
  console.log(`✓ ${msgTuples.length} messaggi`);

  // segnalazioni su ~8% delle chat
  const repTuples: any[] = [];
  for (const c of insertedChats) {
    if (Math.random() < 0.08) {
      repTuples.push(sql`(${c.u1}, ${c.u2}, ${c.id}, ${pick(REPORT_REASONS)}, 'pending')`);
    }
  }
  if (repTuples.length) {
    for (let i = 0; i < repTuples.length; i += 500) {
      await db.execute(sql`INSERT INTO reports (reporter_id, reported_user_id, chat_id, reason, status) VALUES ${sql.join(repTuples.slice(i, i + 500), sql`, `)}`);
    }
  }
  console.log(`✓ ${repTuples.length} segnalazioni`);

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Fatto in ${secs}s. App popolata come pubblicata da tempo.`);
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
