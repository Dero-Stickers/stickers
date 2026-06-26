import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

// GET /api/user/albums
const getUserAlbums: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;

    const { db } = await import("@workspace/db");
    const { albumsTable, userAlbumsTable, userStickersTable } = await import("@workspace/db");

    const userAlbums = await db
      .select({ album: albumsTable, ua: userAlbumsTable })
      .from(userAlbumsTable)
      .innerJoin(albumsTable, eq(albumsTable.id, userAlbumsTable.albumId))
      .where(eq(userAlbumsTable.userId, session.userId))
      .orderBy(asc(userAlbumsTable.addedAt));

    // Conteggi possedute/doppie in UNA sola query aggregata (no N+1, no
    // over-fetch): prima si scaricavano tutte le righe user_stickers per album
    // solo per contarle in JS. Ora il DB raggruppa per (album, stato).
    const albumIds = userAlbums.map(({ album }) => album.id);
    const counts = albumIds.length
      ? await db
          .select({
            albumId: userStickersTable.albumId,
            state: userStickersTable.state,
            n: sql<number>`count(*)::int`,
          })
          .from(userStickersTable)
          .where(and(
            eq(userStickersTable.userId, session.userId),
            inArray(userStickersTable.albumId, albumIds),
          ))
          .groupBy(userStickersTable.albumId, userStickersTable.state)
      : [];

    const countByAlbum = new Map<number, { owned: number; duplicates: number }>();
    for (const c of counts) {
      const e = countByAlbum.get(c.albumId) ?? { owned: 0, duplicates: 0 };
      if (c.state === "posseduta") e.owned = c.n;
      else if (c.state === "doppia") e.duplicates = c.n;
      countByAlbum.set(c.albumId, e);
    }

    const result = userAlbums.map(({ album, ua }) => {
      const { owned, duplicates } = countByAlbum.get(album.id) ?? { owned: 0, duplicates: 0 };
      const missing = album.totalStickers - owned - duplicates;
      const completionPercent = album.totalStickers > 0
        ? Math.round(((owned + duplicates) / album.totalStickers) * 100)
        : 0;

      return {
        id: album.id,
        title: album.title,
        totalStickers: album.totalStickers,
        isPublished: album.isPublished,
        createdAt: album.createdAt.toISOString(),
        owned,
        missing: Math.max(0, missing),
        duplicates,
        completionPercent,
        addedAt: ua.addedAt.toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/user/albums/:albumId
const addAlbum: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const albumId = parseInt(req.params.albumId as string, 10);

    const { db } = await import("@workspace/db");
    const { userAlbumsTable, stickersTable, userStickersTable } = await import("@workspace/db");

    // Atomic enrollment: insert the user_album row + the per-sticker rows in
    // a single transaction. If anything fails, Postgres rolls back so we
    // never leave an "album added but stickers missing" inconsistent state.
    // The unique index on (user_id, album_id) protects against double-clicks.
    const result = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(userAlbumsTable)
        .values({ userId: session.userId, albumId })
        .onConflictDoNothing({ target: [userAlbumsTable.userId, userAlbumsTable.albumId] })
        .returning();

      if (inserted.length === 0) {
        return { alreadyAdded: true as const };
      }

      const stickers = await tx
        .select({ id: stickersTable.id })
        .from(stickersTable)
        .where(eq(stickersTable.albumId, albumId));

      if (stickers.length) {
        await tx
          .insert(userStickersTable)
          .values(stickers.map(s => ({ userId: session.userId, albumId, stickerId: s.id, state: "mancante" })))
          .onConflictDoNothing({ target: [userStickersTable.userId, userStickersTable.stickerId] });
      }
      return { alreadyAdded: false as const };
    });

    if (result.alreadyAdded) { res.status(400).json({ error: "ALREADY_ADDED" }); return; }
    res.status(201).json({ success: true, message: "Album aggiunto" });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// DELETE /api/user/albums/:albumId
const removeAlbum: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const albumId = parseInt(req.params.albumId as string, 10);

    const { db } = await import("@workspace/db");
    const { userAlbumsTable, userStickersTable } = await import("@workspace/db");

    await db.delete(userStickersTable).where(
      and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.albumId, albumId))
    );
    await db.delete(userAlbumsTable).where(
      and(eq(userAlbumsTable.userId, session.userId), eq(userAlbumsTable.albumId, albumId))
    );

    res.json({ success: true, message: "Album rimosso" });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/user/albums/:albumId/stickers
const getUserAlbumStickers: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const albumId = parseInt(req.params.albumId as string, 10);

    const { db } = await import("@workspace/db");
    const { userStickersTable, stickersTable } = await import("@workspace/db");

    const rows = await db
      .select({ us: userStickersTable, s: stickersTable })
      .from(userStickersTable)
      .innerJoin(stickersTable, eq(stickersTable.id, userStickersTable.stickerId))
      .where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.albumId, albumId)))
      // Ordine deterministico per numero figurina: senza ORDER BY le righe
      // aggiornate (cambio stato) "scivolano" in fondo e in vista Tutte
      // sembrano mancanti / saltano di posizione al tap.
      .orderBy(asc(stickersTable.number));

    res.json(rows.map(r => ({
      stickerId: r.s.id,
      albumId: r.s.albumId,
      state: r.us.state,
      number: r.s.number,
      code: r.s.code,
      name: r.s.name,
      description: r.s.description,
    })));
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /api/user/albums/:albumId/stickers/:stickerId
const updateStickerState: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const albumId = parseInt(req.params.albumId as string, 10);
    const stickerId = parseInt(req.params.stickerId as string, 10);
    const state = req.body.state as string;

    if (!["mancante", "posseduta", "doppia"].includes(state)) {
      res.status(400).json({ error: "INVALID_STATE" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { userStickersTable, stickersTable } = await import("@workspace/db");

    const [row] = await db
      .update(userStickersTable)
      .set({ state, updatedAt: new Date() })
      .where(and(
        eq(userStickersTable.userId, session.userId),
        eq(userStickersTable.albumId, albumId),
        eq(userStickersTable.stickerId, stickerId)
      ))
      .returning();

    if (!row) { res.status(404).json({ error: "NOT_FOUND" }); return; }

    const [s] = await db.select().from(stickersTable).where(eq(stickersTable.id, stickerId)).limit(1);

    res.json({
      stickerId: row.stickerId,
      albumId: row.albumId,
      state: row.state,
      number: s?.number ?? 0,
      code: s?.code ?? "",
      name: s?.name ?? "",
      description: s?.description ?? null,
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/albums", getUserAlbums);
router.post("/albums/:albumId", addAlbum);
router.delete("/albums/:albumId", removeAlbum);
router.get("/albums/:albumId/stickers", getUserAlbumStickers);
router.patch("/albums/:albumId/stickers/:stickerId", updateStickerState);

export default router;
