import { Router } from "express";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";

const router = Router();

async function requireAuth(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  try {
    return JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString());
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
}

// GET /api/albums
const listAlbums: RequestHandler = async (req, res) => {
  try {
    const { db } = await import("@workspace/db");
    const { albumsTable } = await import("@workspace/db");
    const albums = await db.select().from(albumsTable).where(eq(albumsTable.isPublished, true));
    res.json(albums.map(a => ({
      id: a.id, title: a.title, description: a.description, coverUrl: a.coverUrl,
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
      description: req.body.description ?? null,
      coverUrl: req.body.coverUrl ?? null,
      isPublished: req.body.isPublished ?? false,
    }).returning();
    res.status(201).json({ id: album.id, title: album.title, description: album.description, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
      id: album.id, title: album.title, description: album.description, coverUrl: album.coverUrl,
      totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString(),
      stickers: stickers.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, name: s.name, description: s.description })),
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
      description: req.body.description ?? null,
      coverUrl: req.body.coverUrl ?? null,
      isPublished: req.body.isPublished ?? undefined,
    }).where(eq(albumsTable.id, albumId)).returning();
    if (!album) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: album.id, title: album.title, description: album.description, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
    res.json({ id: album.id, title: album.title, description: album.description, coverUrl: album.coverUrl, totalStickers: album.totalStickers, isPublished: album.isPublished, createdAt: album.createdAt.toISOString() });
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
    res.json(stickers.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, name: s.name, description: s.description })));
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

    let stickersToInsert: { albumId: number; number: number; name: string; description?: string }[] = [];

    if (req.body.rawList) {
      const lines = (req.body.rawList as string).split("\n").filter(Boolean);
      stickersToInsert = lines.map((line: string) => {
        const match = line.match(/^(\d+)[.\s-]+(.+)$/);
        if (match) {
          return { albumId, number: parseInt(match[1], 10), name: match[2].trim() };
        }
        return null;
      }).filter(Boolean) as any[];
    } else if (req.body.stickers) {
      stickersToInsert = req.body.stickers.map((s: any) => ({ albumId, ...s }));
    }

    if (!stickersToInsert.length) {
      res.json({ inserted: 0, stickers: [] });
      return;
    }

    const inserted = await db.insert(stickersTable).values(stickersToInsert).returning();
    await db.update(albumsTable).set({ totalStickers: inserted.length }).where(eq(albumsTable.id, albumId));

    res.status(201).json({ inserted: inserted.length, stickers: inserted.map(s => ({ id: s.id, albumId: s.albumId, number: s.number, name: s.name, description: s.description })) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/albums/:albumId/stickers/:stickerId
const updateSticker: RequestHandler = async (req, res) => {
  try {
    const stickerId = parseInt(req.params.stickerId as string, 10);
    const { db } = await import("@workspace/db");
    const { stickersTable } = await import("@workspace/db");
    const [s] = await db.update(stickersTable).set({ number: req.body.number, name: req.body.name, description: req.body.description ?? null }).where(eq(stickersTable.id, stickerId)).returning();
    if (!s) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ id: s.id, albumId: s.albumId, number: s.number, name: s.name, description: s.description });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", listAlbums);
router.post("/", createAlbum);
router.get("/:albumId", getAlbum);
router.put("/:albumId", updateAlbum);
router.patch("/:albumId/publish", togglePublish);
router.get("/:albumId/stickers", listStickers);
router.post("/:albumId/stickers", batchInsertStickers);
router.put("/:albumId/stickers/:stickerId", updateSticker);

export default router;
