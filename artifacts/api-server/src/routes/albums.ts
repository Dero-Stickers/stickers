import express, { Router } from "express";
import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
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
    const albums = session?.isAdmin
      ? await db.select().from(albumsTable)
      : await db.select().from(albumsTable).where(eq(albumsTable.isPublished, true));
    res.json(albums.map(a => ({
      id: a.id, title: a.title, coverUrl: a.coverUrl,
      totalStickers: a.totalStickers, isPublished: a.isPublished, createdAt: a.createdAt.toISOString(),
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
      coverUrl: req.body.coverUrl ?? null,
      isPublished: req.body.isPublished ?? false,
    }).returning();
    res.status(201).json({ id: album.id, title: album.title, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
      id: album.id, title: album.title, coverUrl: album.coverUrl,
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
      coverUrl: req.body.coverUrl ?? null,
      isPublished: req.body.isPublished ?? undefined,
    }).where(eq(albumsTable.id, albumId)).returning();
    if (!album) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: album.id, title: album.title, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
    res.json({ id: album.id, title: album.title, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
        if (!match) continue;
        pos += 1;
        stickersToInsert.push({ albumId, number: pos, code: match[1].trim(), name: match[2].trim() });
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

// POST /api/albums/cover — admin: carica una copertina (immagine già ottimizzata
// dal client) su Supabase Storage e restituisce l'URL pubblico. Nel DB salviamo
// solo l'URL: lo storage tiene i file, il DB resta leggero.
const COVER_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const uploadCover: RequestHandler = async (req, res) => {
  try {
    const supabaseUrl = process.env["SUPABASE_URL"]?.trim();
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
    if (!supabaseUrl || !serviceKey) {
      res.status(503).json({ error: "STORAGE_NOT_CONFIGURED" });
      return;
    }
    const contentType = (req.headers["content-type"] ?? "").split(";")[0]!.trim();
    const ext = COVER_TYPES[contentType];
    if (!ext) { res.status(415).json({ error: "UNSUPPORTED_MEDIA_TYPE" }); return; }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "EMPTY_BODY" }); return;
    }

    const filename = `${randomUUID()}.${ext}`;
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/album-covers/${filename}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": contentType,
        "cache-control": "max-age=31536000, immutable",
      },
      body,
    });
    if (!uploadRes.ok) {
      req.log?.error({ status: uploadRes.status }, "cover upload failed");
      res.status(502).json({ error: "UPLOAD_FAILED" });
      return;
    }
    res.status(201).json({ url: `${supabaseUrl}/storage/v1/object/public/album-covers/${filename}` });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", listAlbums);
// Admin-only catalog mutations
router.post("/cover", requireAdmin, express.raw({ type: ["image/webp", "image/jpeg", "image/png"], limit: "600kb" }), uploadCover);
router.post("/", requireAdmin, createAlbum);
router.get("/:albumId", getAlbum);
router.put("/:albumId", requireAdmin, updateAlbum);
router.patch("/:albumId/publish", requireAdmin, togglePublish);
router.get("/:albumId/stickers", listStickers);
router.post("/:albumId/stickers", requireAdmin, batchInsertStickers);
router.put("/:albumId/stickers/:stickerId", requireAdmin, updateSticker);

export default router;
