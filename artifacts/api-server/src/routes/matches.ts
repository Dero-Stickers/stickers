import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, ne } from "drizzle-orm";

const router = Router();

async function requireAuth(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  try { return JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString()); }
  catch { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
}

function estimateDistance(cap1: string, cap2: string): number {
  if (cap1 === cap2) return Math.random() * 2 + 0.5;
  const prefix1 = cap1.slice(0, 2);
  const prefix2 = cap2.slice(0, 2);
  if (prefix1 === prefix2) return Math.random() * 15 + 2;
  return Math.random() * 80 + 20;
}

// GET /api/matches/best
const getBestMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;

    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable, userStickersTable } = await import("@workspace/db");

    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!myUser.length) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const myAlbums = await db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, session.userId));
    const myAlbumIds = myAlbums.map(a => a.albumId);

    if (!myAlbumIds.length) { res.json([]); return; }

    const myDuplicates = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.state, "doppia")));
    const myMissing = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.state, "mancante")));

    const otherUsers = await db.select().from(usersTable).where(and(ne(usersTable.id, session.userId), eq(usersTable.isBlocked, false)));

    const matches = await Promise.all(
      otherUsers.map(async other => {
        const theirDuplicates = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, other.id), eq(userStickersTable.state, "doppia")));
        const theirMissing = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, other.id), eq(userStickersTable.state, "mancante")));

        const myDupIds = new Set(myDuplicates.map(s => s.stickerId));
        const theirMissingIds = new Set(theirMissing.map(s => s.stickerId));
        const theirDupIds = new Set(theirDuplicates.map(s => s.stickerId));
        const myMissingIds = new Set(myMissing.map(s => s.stickerId));

        const youGive = [...myDupIds].filter(id => theirMissingIds.has(id)).length;
        const youReceive = [...theirDupIds].filter(id => myMissingIds.has(id)).length;
        const totalExchanges = Math.min(youGive, youReceive);

        if (totalExchanges === 0) return null;

        const theirAlbums = await db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, other.id));
        const theirAlbumIds = new Set(theirAlbums.map(a => a.albumId));
        const albumsInCommon = myAlbumIds.filter(id => theirAlbumIds.has(id)).length;

        return {
          userId: other.id,
          nickname: other.nickname,
          area: other.area,
          cap: other.cap,
          totalExchanges,
          distanceKm: parseFloat(estimateDistance(myUser[0].cap, other.cap).toFixed(1)),
          exchangesCompleted: other.exchangesCompleted,
          albumsInCommon,
        };
      })
    );

    const validMatches = matches.filter(Boolean).sort((a, b) => b!.totalExchanges - a!.totalExchanges).slice(0, 20);
    res.json(validMatches);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/matches/nearby
const getNearbyMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const radiusKm = parseFloat((req.query.radius ?? req.query.radiusKm ?? "10") as string);

    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable, userStickersTable } = await import("@workspace/db");

    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!myUser.length) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const myAlbums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, session.userId));
    const myAlbumIds = myAlbums.map(a => a.albumId);
    const myDuplicates = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.state, "doppia")));
    const myMissing = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.state, "mancante")));

    const otherUsers = await db.select().from(usersTable).where(and(ne(usersTable.id, session.userId), eq(usersTable.isBlocked, false)));

    const matches = await Promise.all(
      otherUsers.map(async other => {
        const dist = parseFloat(estimateDistance(myUser[0].cap, other.cap).toFixed(1));
        if (dist > radiusKm) return null;

        const theirDuplicates = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, other.id), eq(userStickersTable.state, "doppia")));
        const theirMissing = await db.select().from(userStickersTable).where(and(eq(userStickersTable.userId, other.id), eq(userStickersTable.state, "mancante")));

        const myDupIds = new Set(myDuplicates.map(s => s.stickerId));
        const theirMissingIds = new Set(theirMissing.map(s => s.stickerId));
        const theirDupIds = new Set(theirDuplicates.map(s => s.stickerId));
        const myMissingIds = new Set(myMissing.map(s => s.stickerId));

        const youGive = [...myDupIds].filter(id => theirMissingIds.has(id)).length;
        const youReceive = [...theirDupIds].filter(id => myMissingIds.has(id)).length;
        const totalExchanges = Math.min(youGive, youReceive);

        const theirAlbums = await db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, other.id));
        const theirAlbumIds = new Set(theirAlbums.map(a => a.albumId));
        const albumsInCommon = myAlbumIds.filter(id => theirAlbumIds.has(id)).length;

        return {
          userId: other.id,
          nickname: other.nickname,
          area: other.area,
          cap: other.cap,
          totalExchanges,
          distanceKm: dist,
          exchangesCompleted: other.exchangesCompleted,
          albumsInCommon,
        };
      })
    );

    const validMatches = matches.filter(Boolean).sort((a, b) => a!.distanceKm! - b!.distanceKm!).slice(0, 20);
    res.json(validMatches);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/matches/:userId
const getMatchDetail: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const otherUserId = parseInt(req.params.userId as string, 10);

    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable, userStickersTable, albumsTable, stickersTable } = await import("@workspace/db");

    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    const otherUser = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
    if (!otherUser.length) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const myAlbums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, session.userId));
    const theirAlbums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, otherUserId));
    const commonAlbumIds = myAlbums.map(a => a.albumId).filter(id => theirAlbums.some(b => b.albumId === id));

    let totalExchanges = 0;
    const albumDetails = await Promise.all(
      commonAlbumIds.map(async albumId => {
        const album = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId)).limit(1);
        const myDups = await db.select({ stickerId: userStickersTable.stickerId }).from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.albumId, albumId), eq(userStickersTable.state, "doppia")));
        const myMiss = await db.select({ stickerId: userStickersTable.stickerId }).from(userStickersTable).where(and(eq(userStickersTable.userId, session.userId), eq(userStickersTable.albumId, albumId), eq(userStickersTable.state, "mancante")));
        const theirDups = await db.select({ stickerId: userStickersTable.stickerId }).from(userStickersTable).where(and(eq(userStickersTable.userId, otherUserId), eq(userStickersTable.albumId, albumId), eq(userStickersTable.state, "doppia")));
        const theirMiss = await db.select({ stickerId: userStickersTable.stickerId }).from(userStickersTable).where(and(eq(userStickersTable.userId, otherUserId), eq(userStickersTable.albumId, albumId), eq(userStickersTable.state, "mancante")));

        const myDupIds = new Set(myDups.map(s => s.stickerId));
        const theirMissIds = new Set(theirMiss.map(s => s.stickerId));
        const theirDupIds = new Set(theirDups.map(s => s.stickerId));
        const myMissIds = new Set(myMiss.map(s => s.stickerId));

        const youGiveIds = [...myDupIds].filter(id => theirMissIds.has(id));
        const youReceiveIds = [...theirDupIds].filter(id => myMissIds.has(id));
        const exchangeCount = Math.min(youGiveIds.length, youReceiveIds.length);
        totalExchanges += exchangeCount;

        const stickerDetails = async (ids: number[]) => {
          const stickers = await Promise.all(ids.slice(0, 10).map(id => db.select().from(stickersTable).where(eq(stickersTable.id, id)).limit(1)));
          return stickers.flat().map(s => ({ id: s.id, albumId: s.albumId, number: s.number, name: s.name }));
        };

        return {
          albumId,
          albumTitle: album[0]?.title ?? "",
          exchangeCount,
          youGive: await stickerDetails(youGiveIds),
          youReceive: await stickerDetails(youReceiveIds),
        };
      })
    );

    res.json({
      userId: otherUserId,
      nickname: otherUser[0].nickname,
      area: otherUser[0].area,
      totalExchanges,
      distanceKm: parseFloat(estimateDistance(myUser[0]?.cap ?? "00000", otherUser[0].cap).toFixed(1)),
      exchangesCompleted: otherUser[0].exchangesCompleted,
      albums: albumDetails,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", getBestMatches);
router.get("/nearby", getNearbyMatches);
router.get("/:userId", getMatchDetail);

export default router;
