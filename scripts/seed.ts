/**
 * Seed script — popola il DB con dati mock realistici
 * Run: npx tsx scripts/seed.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non impostato");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function hashPin(pin: string): string {
  return Buffer.from(pin + "sticker_salt").toString("base64");
}

function generateRecoveryCode(suffix: string): string {
  return `STICK-${suffix}`;
}

async function main() {
  console.log("Avvio seed...");

  // 1. Utenti
  const users = await db.insert(schema.usersTable).values([
    {
      nickname: "mario75",
      pinHash: hashPin("1234"),
      cap: "20100",
      area: "Milano Nord",
      securityQuestion: "Nome del tuo primo animale?",
      securityAnswerHash: Buffer.from("fido").toString("base64"),
      recoveryCode: generateRecoveryCode("ABCD-1234-EFGH"),
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
      recoveryCode: generateRecoveryCode("WXYZ-5678-IJKL"),
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
      recoveryCode: generateRecoveryCode("MNOP-9999-QRST"),
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
      recoveryCode: generateRecoveryCode("UVWX-1111-YZA0"),
      isPremium: false,
      demoStartedAt: new Date(Date.now() - 26 * 3600 * 1000),
      demoExpiresAt: new Date(Date.now() - 2 * 3600 * 1000),
      isBlocked: false,
      isAdmin: false,
      exchangesCompleted: 8,
    },
    {
      nickname: "admin",
      pinHash: hashPin("0000"),
      cap: "00000",
      area: "Admin",
      securityQuestion: "Admin",
      securityAnswerHash: Buffer.from("admin").toString("base64"),
      recoveryCode: generateRecoveryCode("ADMIN-0000-0000"),
      isPremium: true,
      isBlocked: false,
      isAdmin: true,
      exchangesCompleted: 0,
    },
  ]).returning();

  console.log(`✓ ${users.length} utenti creati`);

  // 2. Album
  const albums = await db.insert(schema.albumsTable).values([
    {
      title: "Calciatori 2024-2025",
      description: "La collezione ufficiale dei Calciatori 2024-2025",
      coverUrl: null,
      totalStickers: 0,
      isPublished: true,
    },
    {
      title: "UEFA Champions League 2024-25",
      description: "Collezione ufficiale UEFA Champions League",
      coverUrl: null,
      totalStickers: 0,
      isPublished: true,
    },
    {
      title: "Mondiali Qatar 2022",
      description: "Collezione Mondiali",
      coverUrl: null,
      totalStickers: 0,
      isPublished: true,
    },
    {
      title: "Calciatori 2023-2024",
      description: "Edizione precedente",
      coverUrl: null,
      totalStickers: 0,
      isPublished: false,
    },
  ]).returning();

  console.log(`✓ ${albums.length} album creati`);

  // 3. Figurine per album 1 (30 figurine demo)
  const album1 = albums[0];
  const album2 = albums[1];
  const album3 = albums[2];

  const generateStickers = (albumId: number, count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({
      albumId,
      number: i + 1,
      name: `${prefix} ${i + 1}`,
      description: null as string | null,
    }));

  const teams1 = [
    "Portiere", "Difensore", "Centrocampista", "Attaccante", "Capitano",
    "Stella", "Riserva", "Giovane", "Veterano", "Leader"
  ];

  const stickers1Data = Array.from({ length: 50 }, (_, i) => ({
    albumId: album1.id,
    number: i + 1,
    name: `${teams1[i % 10]} Serie A #${i + 1}`,
    description: null as string | null,
  }));

  const stickers2Data = Array.from({ length: 40 }, (_, i) => ({
    albumId: album2.id,
    number: i + 1,
    name: `Champions ${i + 1}`,
    description: null as string | null,
  }));

  const stickers3Data = Array.from({ length: 30 }, (_, i) => ({
    albumId: album3.id,
    number: i + 1,
    name: `Mondiale ${i + 1}`,
    description: null as string | null,
  }));

  const stickers1 = await db.insert(schema.stickersTable).values(stickers1Data).returning();
  const stickers2 = await db.insert(schema.stickersTable).values(stickers2Data).returning();
  const stickers3 = await db.insert(schema.stickersTable).values(stickers3Data).returning();

  await db.update(schema.albumsTable).set({ totalStickers: stickers1.length }).where(
    (await import("drizzle-orm")).eq(schema.albumsTable.id, album1.id)
  );
  await db.update(schema.albumsTable).set({ totalStickers: stickers2.length }).where(
    (await import("drizzle-orm")).eq(schema.albumsTable.id, album2.id)
  );
  await db.update(schema.albumsTable).set({ totalStickers: stickers3.length }).where(
    (await import("drizzle-orm")).eq(schema.albumsTable.id, album3.id)
  );

  console.log(`✓ ${stickers1.length + stickers2.length + stickers3.length} figurine create`);

  // 4. Album utente (mario75 ha album 1 e 2)
  const mario = users.find(u => u.nickname === "mario75")!;
  const luca = users.find(u => u.nickname === "luca_fan")!;
  const giulia = users.find(u => u.nickname === "giulia_stickers")!;

  await db.insert(schema.userAlbumsTable).values([
    { userId: mario.id, albumId: album1.id },
    { userId: mario.id, albumId: album2.id },
    { userId: luca.id, albumId: album1.id },
    { userId: luca.id, albumId: album3.id },
    { userId: giulia.id, albumId: album1.id },
  ]);

  console.log("✓ Album utente assegnati");

  // 5. Stato figurine mario75 (album1)
  const marioStickers1: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  stickers1.forEach((s, i) => {
    let state = "mancante";
    if (i < 20) state = "posseduta";
    else if (i < 28) state = "doppia";
    marioStickers1.push({ userId: mario.id, albumId: album1.id, stickerId: s.id, state });
  });
  await db.insert(schema.userStickersTable).values(marioStickers1);

  // Stato figurine mario75 (album2)
  const marioStickers2: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  stickers2.forEach((s, i) => {
    let state = "mancante";
    if (i < 15) state = "posseduta";
    else if (i < 22) state = "doppia";
    marioStickers2.push({ userId: mario.id, albumId: album2.id, stickerId: s.id, state });
  });
  await db.insert(schema.userStickersTable).values(marioStickers2);

  // Stato figurine luca (album1) — molte doppie che mario manca, molte mancanti che mario ha doppie
  const lucaStickers1: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  stickers1.forEach((s, i) => {
    let state = "mancante";
    if (i >= 28 && i < 45) state = "posseduta"; // luca possiede quello che mario manca
    else if (i >= 20 && i < 28) state = "mancante"; // luca manca quello che mario ha doppio
    else if (i < 10) state = "doppia"; // luca ha doppie delle prime figurine (mario manca le prime 0)
    lucaStickers1.push({ userId: luca.id, albumId: album1.id, stickerId: s.id, state });
  });
  await db.insert(schema.userStickersTable).values(lucaStickers1);

  // Stato figurine luca (album3)
  const lucaStickers3: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  stickers3.forEach((s, i) => {
    const state = i < 18 ? "posseduta" : i < 25 ? "doppia" : "mancante";
    lucaStickers3.push({ userId: luca.id, albumId: album3.id, stickerId: s.id, state });
  });
  await db.insert(schema.userStickersTable).values(lucaStickers3);

  // Stato figurine giulia (album1)
  const giuliaStickers1: { userId: number; albumId: number; stickerId: number; state: string }[] = [];
  stickers1.forEach((s, i) => {
    const state = i < 10 ? "posseduta" : i < 14 ? "doppia" : "mancante";
    giuliaStickers1.push({ userId: giulia.id, albumId: album1.id, stickerId: s.id, state });
  });
  await db.insert(schema.userStickersTable).values(giuliaStickers1);

  console.log("✓ Stato figurine utenti impostato");

  // 6. Impostazioni app
  await db.insert(schema.appSettingsTable).values([
    { key: "support_email", value: "dero975@gmail.com", description: "Email supporto" },
    { key: "demo_hours", value: "24", description: "Durata demo in ore" },
    { key: "demo_enabled", value: "true", description: "Demo abilitata" },
    { key: "app_name", value: "STICKERs matchbox", description: "Nome app" },
  ]);

  console.log("✓ Impostazioni app inserite");
  console.log("\n✅ Seed completato! Credenziali demo:");
  console.log("  mario75 / 1234 — demo attiva");
  console.log("  luca_fan / 5678 — premium");
  console.log("  giulia_stickers / 9999 — free");
  console.log("  sofia_ro / 1111 — demo scaduta");
  console.log("  admin / 0000 — admin");

  await pool.end();
}

main().catch(err => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
