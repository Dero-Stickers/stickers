/**
 * Seed — popola il DB con dati mock realistici
 * Run: pnpm --filter @workspace/db run seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  usersTable, albumsTable, stickersTable,
  userAlbumsTable, userStickersTable, appSettingsTable
} from "./schema/index.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL non impostato");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, {
  schema: {
    usersTable, albumsTable, stickersTable,
    userAlbumsTable, userStickersTable, appSettingsTable
  }
});

function hashPin(pin: string): string {
  return Buffer.from(pin + "sticker_salt").toString("base64");
}

async function main() {
  console.log("Avvio seed...");

  // Pulizia tabelle (in ordine FK) e reset sequenze
  await db.delete(userStickersTable);
  await db.delete(userAlbumsTable);
  await db.delete(stickersTable);
  await db.delete(albumsTable);
  await db.delete(appSettingsTable);
  await db.delete(usersTable);

  // Reset delle sequenze auto-increment
  await pool.query(`
    ALTER SEQUENCE users_id_seq RESTART WITH 1;
    ALTER SEQUENCE albums_id_seq RESTART WITH 1;
    ALTER SEQUENCE stickers_id_seq RESTART WITH 1;
    ALTER SEQUENCE user_albums_id_seq RESTART WITH 1;
    ALTER SEQUENCE user_stickers_id_seq RESTART WITH 1;
  `);
  console.log("✓ Tabelle e sequenze ripristinate");

  // 1. Utenti
  const users = await db.insert(usersTable).values([
    {
      nickname: "mario75",
      pinHash: hashPin("1234"),
      cap: "20100",
      area: "Milano Nord",
      securityQuestion: "Nome del tuo primo animale?",
      securityAnswerHash: Buffer.from("fido").toString("base64"),
      recoveryCode: "STICK-ABCD-1234-EFGH",
      isPremium: false,
      demoStartedAt: new Date(Date.now() - 4 * 3600 * 1000),
      demoExpiresAt: new Date(Date.now() + 20 * 3600 * 1000),
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 12,
    },
    {
      nickname: "luca_fan",
      pinHash: hashPin("5678"),
      cap: "20121",
      area: "Milano Centro",
      securityQuestion: "Città dove sei nato?",
      securityAnswerHash: Buffer.from("roma").toString("base64"),
      recoveryCode: "STICK-WXYZ-5678-IJKL",
      isPremium: true,
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 45,
    },
    {
      nickname: "giulia_stickers",
      pinHash: hashPin("9999"),
      cap: "20135",
      area: "Milano Sud",
      securityQuestion: "Scuola elementare?",
      securityAnswerHash: Buffer.from("manzoni").toString("base64"),
      recoveryCode: "STICK-MNOP-9999-QRST",
      isPremium: false,
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 5,
    },
    {
      nickname: "sofia_ro",
      pinHash: hashPin("1111"),
      cap: "20151",
      area: "Milano Ovest",
      securityQuestion: "Colore preferito?",
      securityAnswerHash: Buffer.from("blu").toString("base64"),
      recoveryCode: "STICK-UVWX-1111-YZA0",
      isPremium: false,
      demoStartedAt: new Date(Date.now() - 30 * 3600 * 1000),
      demoExpiresAt: new Date(Date.now() - 6 * 3600 * 1000),
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 8,
    },
    {
      nickname: "roberto_collector",
      pinHash: hashPin("2222"),
      cap: "20141",
      area: "Milano Est",
      securityQuestion: "Squadra del cuore?",
      securityAnswerHash: Buffer.from("milan").toString("base64"),
      recoveryCode: "STICK-ROBE-2222-COLL",
      isPremium: true,
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 67,
    },
    {
      nickname: "admin",
      pinHash: hashPin("0000"),
      cap: "00000",
      area: "Admin",
      securityQuestion: "Admin",
      securityAnswerHash: Buffer.from("admin").toString("base64"),
      recoveryCode: "STICK-ADMIN-0000-XXXX",
      isPremium: true,
      isBlocked: false,
      isAdmin: true,
      exchangesCompleted: 0,
    },
  ]).returning();
  console.log(`✓ ${users.length} utenti creati`);

  const mario = users.find(u => u.nickname === "mario75")!;
  const luca = users.find(u => u.nickname === "luca_fan")!;
  const giulia = users.find(u => u.nickname === "giulia_stickers")!;
  const roberto = users.find(u => u.nickname === "roberto_collector")!;

  // 2. Album
  const albumsInserted = await db.insert(albumsTable).values([
    { title: "Calciatori 2024-2025", description: "La collezione ufficiale dei Calciatori 2024-2025", totalStickers: 0, isPublished: true },
    { title: "UEFA Champions League 2024-25", description: "Collezione ufficiale UEFA Champions League", totalStickers: 0, isPublished: true },
    { title: "Mondiali Qatar 2022", description: "La storica collezione del Mondiale", totalStickers: 0, isPublished: true },
    { title: "Serie A 2023-2024", description: "Edizione precedente Serie A", totalStickers: 0, isPublished: false },
  ]).returning();
  console.log(`✓ ${albumsInserted.length} album creati`);

  const [a1, a2, a3] = albumsInserted;

  // 3. Figurine
  const insertStickers = async (albumId: number, count: number, prefix: string) => {
    const data = Array.from({ length: count }, (_, i) => ({
      albumId, number: i + 1, name: `${prefix} n.${i + 1}`, description: null as string | null
    }));
    const result = await db.insert(stickersTable).values(data).returning();
    await db.update(albumsTable).set({ totalStickers: count }).where(eq(albumsTable.id, albumId));
    return result;
  };

  const s1 = await insertStickers(a1.id, 50, "Calciatori");
  const s2 = await insertStickers(a2.id, 40, "Champions");
  const s3 = await insertStickers(a3.id, 30, "Mondiale");
  console.log(`✓ ${s1.length + s2.length + s3.length} figurine create`);

  // 4. Album utente
  await db.insert(userAlbumsTable).values([
    { userId: mario.id, albumId: a1.id },
    { userId: mario.id, albumId: a2.id },
    { userId: luca.id, albumId: a1.id },
    { userId: luca.id, albumId: a3.id },
    { userId: giulia.id, albumId: a1.id },
    { userId: roberto.id, albumId: a1.id },
    { userId: roberto.id, albumId: a2.id },
    { userId: roberto.id, albumId: a3.id },
  ]);
  console.log("✓ Album assegnati agli utenti");

  // 5. Stato figurine — progettato per garantire match reciproci
  //
  // Schema album1 (50 figurine, indici 0-49):
  //   mario:  mancanti 0-9, possedute 10-34, doppie 35-44, mancanti 45-49
  //   luca:   doppie 0-9 (=mancanti mario!), mancanti 35-44 (=doppie mario!), possedute resto
  //   => mario dà 10 a luca, luca dà 10 a mario → 10 scambi
  //
  //   roberto: mancanti 0-4, possedute 5-29, doppie 30-39 (overlaps mario mancanti 45-49... no)
  //            Serve: doppie 45-49 per dare a mario, mancanti 35-44 per ricevere da mario
  //   roberto: possedute 0-34, doppie 45-49 (→ mario mancanti), mancanti 35-44 (← mario doppie)

  const mkState = (userId: number, albumId: number, stickers: typeof s1, mapFn: (i: number) => string) =>
    stickers.map((s, i) => ({ userId, albumId, stickerId: s.id, state: mapFn(i) }));

  // mario (album1): mancanti 0-9, possedute 10-34, doppie 35-44, mancanti 45-49
  const marioS1 = mkState(mario.id, a1.id, s1, i => {
    if (i < 10) return "mancante";
    if (i < 35) return "posseduta";
    if (i < 45) return "doppia";
    return "mancante";
  });
  // mario (album2): mancanti 0-7, possedute 8-28, doppie 29-36, mancanti 37-39
  const marioS2 = mkState(mario.id, a2.id, s2, i => {
    if (i < 8) return "mancante";
    if (i < 29) return "posseduta";
    if (i < 37) return "doppia";
    return "mancante";
  });

  // luca (album1): doppie 0-9 (mario manca), mancanti 35-44 (mario ha doppie), possedute resto
  const lucaS1 = mkState(luca.id, a1.id, s1, i => {
    if (i < 10) return "doppia";
    if (i >= 35 && i < 45) return "mancante";
    return "posseduta";
  });
  // luca (album3)
  const lucaS3 = mkState(luca.id, a3.id, s3, i => i < 18 ? "posseduta" : i < 25 ? "doppia" : "mancante");

  // giulia (album1): doppie 45-49 (mario manca), mancanti 35-44 (mario ha doppie)
  const giuliaS1 = mkState(giulia.id, a1.id, s1, i => {
    if (i < 30) return "posseduta";
    if (i < 35) return "mancante";
    if (i < 40) return "mancante"; // giulia manca 35-39 che mario ha doppie → mario può dare 5
    if (i < 45) return "posseduta"; // 40-44
    return "doppia"; // 45-49: giulia ha doppie che mario manca!
  });

  // roberto (album1): possedute 0-34, mancanti 35-44 (← mario doppie!), doppie 45-49 (→ mario mancanti!)
  const robertoS1 = mkState(roberto.id, a1.id, s1, i => {
    if (i < 35) return "posseduta";
    if (i < 45) return "mancante";
    return "doppia";
  });
  // roberto (album2): mancanti 29-36 (← mario doppie!), doppie 0-7 (→ mario mancanti!)
  const robertoS2 = mkState(roberto.id, a2.id, s2, i => {
    if (i < 8) return "doppia";
    if (i < 29) return "posseduta";
    if (i < 37) return "mancante";
    return "posseduta";
  });
  const robertoS3 = mkState(roberto.id, a3.id, s3, i => i < 25 ? "posseduta" : i < 28 ? "doppia" : "mancante");

  await db.insert(userStickersTable).values([
    ...marioS1, ...marioS2,
    ...lucaS1, ...lucaS3,
    ...giuliaS1,
    ...robertoS1, ...robertoS2, ...robertoS3,
  ]);
  console.log("✓ Stato figurine impostato");

  // 6. Impostazioni app
  await db.insert(appSettingsTable).values([
    { key: "support_email", value: "dero975@gmail.com", description: "Email supporto" },
    { key: "demo_hours", value: "24", description: "Durata demo in ore" },
    { key: "demo_enabled", value: "true", description: "Demo abilitata" },
    { key: "app_name", value: "STICKERs matchbox", description: "Nome app" },
    { key: "privacy_policy", value: "Politica sulla privacy dell'app STICKERs matchbox.", description: "Privacy policy" },
    { key: "terms", value: "Termini e condizioni d'uso dell'app STICKERs matchbox.", description: "Termini" },
    { key: "cookie_policy", value: "Policy cookie dell'app STICKERs matchbox.", description: "Cookie policy" },
  ]);
  console.log("✓ Impostazioni app inserite");

  console.log("\n✅ Seed completato!");
  console.log("  mario75 / 1234 — demo attiva (ancora 20h)");
  console.log("  luca_fan / 5678 — premium");
  console.log("  giulia_stickers / 9999 — free");
  console.log("  sofia_ro / 1111 — demo scaduta");
  console.log("  roberto_collector / 2222 — premium");
  console.log("  admin / 0000 — admin");

  await pool.end();
}

main().catch(err => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
