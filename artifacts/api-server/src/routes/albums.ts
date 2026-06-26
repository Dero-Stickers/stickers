import { Router } from "express";
import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { getSession, requireAdmin } from "../middlewares/auth";
import { verifyToken } from "../lib/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

// GET /api/albums
const listAlbums: RequestHandler = async (req, res) => {
  try {
    const { db } = await import("@workspace/db");
    const { albumsTable } = await import("@workspace/db");
    // L'admin vede TUTTI gli album (anche non pubblicati) per gestirli;
    // gli utenti vedono solo quelli pubblicati.
    const authHeader = req.headers.authorization;
    const session = authHeader?.startsWith("Bearer ")
      ? verifyToken(authHeader.slice(7).trim())
      : null;
    const isAdmin = !!session?.isAdmin;
    // Ordine stabile per id (cronologico-discendente per come sono importati):
    // un album messo Off Line NON cambia posizione in lista.
    const albums = isAdmin
      ? await db.select().from(albumsTable).orderBy(albumsTable.id)
      : await db.select().from(albumsTable).where(eq(albumsTable.isPublished, true)).orderBy(albumsTable.id);

    // Solo lato admin: quanti utenti hanno l'album tra "I miei album".
    // Una sola query aggregata (niente N+1).
    let userCounts: Record<number, number> = {};
    if (isAdmin) {
      const { userAlbumsTable } = await import("@workspace/db");
      const { sql } = await import("drizzle-orm");
      const rows = await db
        .select({ albumId: userAlbumsTable.albumId, n: sql<number>`count(*)::int` })
        .from(userAlbumsTable)
        .groupBy(userAlbumsTable.albumId);
      userCounts = Object.fromEntries(rows.map(r => [r.albumId, Number(r.n)]));
    }

    res.json(albums.map(a => ({
      id: a.id, title: a.title,
      totalStickers: a.totalStickers, isPublished: a.isPublished, createdAt: a.createdAt.toISOString(),
      ...(isAdmin ? { userCount: userCounts[a.id] ?? 0 } : {}),
    })));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/albums (admin)
const createAlbum: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { albumsTable } = await import("@workspace/db");
    const [album] = await db.insert(albumsTable).values({
      title: req.body.title,
      isPublished: req.body.isPublished ?? false,
    }).returning();
    res.status(201).json({ id: album.id, title: album.title, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/albums/:albumId
const getAlbum: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const { db } = await import("@workspace/db");
    const { albumsTable, stickersTable } = await import("@workspace/db");
    const [album] = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId)).limit(1);
    if (!album) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    const stickers = await db.select().from(stickersTable).where(eq(stickersTable.albumId, albumId));
    res.json({
      id: album.id, title: album.title,
      totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString(),
      stickers: stickers.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, code: s.code, name: s.name, description: s.description })),
    });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/albums/:albumId (admin)
const updateAlbum: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const { db } = await import("@workspace/db");
    const { albumsTable } = await import("@workspace/db");
    const [album] = await db.update(albumsTable).set({
      title: req.body.title,
      isPublished: req.body.isPublished ?? undefined,
    }).where(eq(albumsTable.id, albumId)).returning();
    if (!album) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: album.id, title: album.title, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /api/albums/:albumId/publish
const togglePublish: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const { db } = await import("@workspace/db");
    const { albumsTable } = await import("@workspace/db");
    const [album] = await db.update(albumsTable).set({ isPublished: req.body.isPublished }).where(eq(albumsTable.id, albumId)).returning();
    if (!album) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: album.id, title: album.title, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/albums/:albumId/stickers
const listStickers: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const { db } = await import("@workspace/db");
    const { stickersTable } = await import("@workspace/db");
    const stickers = await db.select().from(stickersTable).where(eq(stickersTable.albumId, albumId));
    res.json(stickers.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, code: s.code, name: s.name, description: s.description })));
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/albums/:albumId/stickers (batch insert)
const batchInsertStickers: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const { db } = await import("@workspace/db");
    const { albumsTable, stickersTable } = await import("@workspace/db");

    let stickersToInsert: { albumId: number; number: number; code: string; name: string; description?: string }[] = [];

    if (req.body.rawList) {
      // Posizione di partenza: continua dopo le figurine già presenti, così un
      // import successivo non collide con l'indice unico (album, number).
      const existing = await db
        .select({ number: stickersTable.number })
        .from(stickersTable)
        .where(eq(stickersTable.albumId, albumId));
      let pos = existing.reduce((m, r) => Math.max(m, r.number), 0);

      const lines = (req.body.rawList as string).split("\n").map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // "<codice> - Nome" o "<codice>. Nome". Il codice può essere
        // alfanumerico ("001", "UPD01"); l'ordine = ordine della lista.
        const match = line.match(/^(\S+?)\s*[.\-]\s+(.+)$/);
        if (match) {
          pos += 1;
          stickersToInsert.push({ albumId, number: pos, code: match[1].trim(), name: match[2].trim() });
          continue;
        }
        // Album vecchi: la fonte espone SOLO il numero, senza nome (es. "001").
        // Accetta la riga come codice puro (nome vuoto) se è un identificatore
        // breve alfanumerico; altrimenti scartala.
        if (/^[A-Za-z0-9]{1,8}$/.test(line)) {
          pos += 1;
          stickersToInsert.push({ albumId, number: pos, code: line, name: "" });
        }
      }
    } else if (req.body.stickers) {
      stickersToInsert = req.body.stickers.map((s: any) => ({ albumId, ...s, code: s.code ?? String(s.number ?? "") }));
    }

    if (!stickersToInsert.length) {
      res.json({ inserted: 0, stickers: [] });
      return;
    }

    const inserted = await db.insert(stickersTable).values(stickersToInsert).returning();
    const allStickers = await db.select({ id: stickersTable.id }).from(stickersTable).where(eq(stickersTable.albumId, albumId));
    await db.update(albumsTable).set({ totalStickers: allStickers.length }).where(eq(albumsTable.id, albumId));

    res.status(201).json({ inserted: inserted.length, stickers: inserted.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, code: s.code, name: s.name, description: s.description })) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/albums/:albumId/stickers/:stickerId
const updateSticker: RequestHandler = async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId as string, 10);
    const stickerId = parseInt(req.params.stickerId as string, 10);
    if (!Number.isFinite(albumId) || !Number.isFinite(stickerId)) {
      res.status(400).json({ error: "BAD_REQUEST" }); return;
    }
    const { db } = await import("@workspace/db");
    const { stickersTable } = await import("@workspace/db");
    // Constrain the update to the sticker AND its parent album to prevent
    // cross-album tampering (IDOR).
    const [s] = await db.update(stickersTable)
      .set({ number: req.body.number, name: req.body.name, description: req.body.description ?? null })
      .where(and(eq(stickersTable.id, stickerId), eq(stickersTable.albumId, albumId)))
      .returning();
    if (!s) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: s.id, albumId: s.albumId, number: s.number, code: s.code, name: s.name, description: s.description });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", listAlbums);
// Admin-only catalog mutations
router.post("/", requireAdmin, createAlbum);
router.get("/:albumId", getAlbum);
router.put("/:albumId", requireAdmin, updateAlbum);
router.patch("/:albumId/publish", requireAdmin, togglePublish);
router.get("/:albumId/stickers", listStickers);
router.post("/:albumId/stickers", requireAdmin, batchInsertStickers);
router.put("/:albumId/stickers/:stickerId", requireAdmin, updateSticker);

export default router;
