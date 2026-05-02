import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, ne, inArray } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

/**
 * Deterministic distance estimation from Italian CAP codes.
 * Stable output for identical pairs — no Math.random().
 * Uses numeric CAP difference as a geographic proximity proxy.
 */
function estimateDistance(cap1: string, cap2: string): number {
  if (!cap1 || !cap2) return 99;
  const n1 = parseInt(cap1, 10);
  const n2 = parseInt(cap2, 10);
  if (isNaN(n1) || isNaN(n2)) return 99;
  if (n1 === n2) return 0.5;
  const diff = Math.abs(n1 - n2);
  if (diff < 10) return 1 + (diff * 1.2);
  if (diff < 100) return 3 + (diff % 18);
  if (diff < 1000) return 12 + (diff % 28);
  if (diff < 5000) return 35 + (diff % 55);
  return 60 + (diff % 140);
}

/**
 * Core match computation — fully batched.
 * Executes exactly 5 DB queries regardless of user count,
 * replacing the previous O(4N) N+1 pattern.
 */
async function computeMatchList(
  session: { userId: number },
  radiusKm?: number
): Promise<any[]> {
  const { db } = await import("@workspace/db");
  const { usersTable, userAlbumsTable, userStickersTable } = await import("@workspace/db");

  // Query 1: current user
  const [myUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!myUser) return [];

  // Query 2: my album IDs
  const myAlbumRows = await db
    .select({ albumId: userAlbumsTable.albumId })
    .from(userAlbumsTable)
    .where(eq(userAlbumsTable.userId, session.userId));
  if (!myAlbumRows.length) return [];

  // Query 3: my stickers (all states)
  const myStickers = await db
    .select({ stickerId: userStickersTable.stickerId, state: userStickersTable.state })
    .from(userStickersTable)
    .where(eq(userStickersTable.userId, session.userId));

  const myDuplicateIds = new Set(myStickers.filter(s => s.state === "doppia").map(s => s.stickerId));
  const myMissingIds = new Set(myStickers.filter(s => s.state === "mancante").map(s => s.stickerId));
  const myAlbumIds = new Set(myAlbumRows.map(a => a.albumId));

  // Query 4: all other users (not blocked, not self)
  const otherUsers = await db.select().from(usersTable)
    .where(and(ne(usersTable.id, session.userId), eq(usersTable.isBlocked, false)));
  if (!otherUsers.length) return [];

  const otherUserIds = otherUsers.map(u => u.id);

  // Query 5a: all albums for other users (batch)
  const allOtherAlbums = await db
    .select({ userId: userAlbumsTable.userId, albumId: userAlbumsTable.albumId })
    .from(userAlbumsTable)
    .where(inArray(userAlbumsTable.userId, otherUserIds));

  // Query 5b: all stickers for other users (batch)
  const allOtherStickers = await db
    .select({
      userId: userStickersTable.userId,
      stickerId: userStickersTable.stickerId,
      state: userStickersTable.state,
    })
    .from(userStickersTable)
    .where(inArray(userStickersTable.userId, otherUserIds));

  // Build in-memory lookup maps
  const otherAlbumsByUser = new Map<number, Set<number>>();
  for (const ua of allOtherAlbums) {
    if (!otherAlbumsByUser.has(ua.userId)) otherAlbumsByUser.set(ua.userId, new Set());
    otherAlbumsByUser.get(ua.userId)!.add(ua.albumId);
  }

  const otherDupsByUser = new Map<number, Set<number>>();
  const otherMissingByUser = new Map<number, Set<number>>();
  for (const s of allOtherStickers) {
    if (s.state === "doppia") {
      if (!otherDupsByUser.has(s.userId)) otherDupsByUser.set(s.userId, new Set());
      otherDupsByUser.get(s.userId)!.add(s.stickerId);
    } else if (s.state === "mancante") {
      if (!otherMissingByUser.has(s.userId)) otherMissingByUser.set(s.userId, new Set());
      otherMissingByUser.get(s.userId)!.add(s.stickerId);
    }
  }

  // Compute matches in-memory (zero extra DB queries)
  const matches: any[] = [];
  for (const other of otherUsers) {
    const dist = parseFloat(estimateDistance(myUser.cap, other.cap).toFixed(1));
    if (radiusKm !== undefined && dist > radiusKm) continue;

    const theirAlbums = otherAlbumsByUser.get(other.id) ?? new Set<number>();
    const theirDups = otherDupsByUser.get(other.id) ?? new Set<number>();
    const theirMissing = otherMissingByUser.get(other.id) ?? new Set<number>();

    const albumsInCommon = [...myAlbumIds].filter(id => theirAlbums.has(id)).length;
    const youGive = [...myDuplicateIds].filter(id => theirMissing.has(id)).length;
    const youReceive = [...theirDups].filter(id => myMissingIds.has(id)).length;
    const totalExchanges = Math.min(youGive, youReceive);

    if (totalExchanges === 0) continue;

    matches.push({
      userId: other.id,
      nickname: other.nickname,
      area: other.area,
      cap: other.cap,
      totalExchanges,
      distanceKm: dist,
      exchangesCompleted: other.exchangesCompleted,
      albumsInCommon,
    });
  }
  return matches;
}

// GET /api/matches  — sorted by exchange count (best matches first)
const getBestMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const matches = await computeMatchList(session);
    matches.sort((a, b) => b.totalExchanges - a.totalExchanges);
    res.json(matches.slice(0, 20));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/matches/nearby  — filtered by radius, sorted by distance
const getNearbyMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const radiusKm = parseFloat((req.query.radius ?? req.query.radiusKm ?? "10") as string);
    const matches = await computeMatchList(session, radiusKm);
    matches.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json(matches.slice(0, 20));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/matches/:userId  — detailed per-album sticker breakdown
const getMatchDetail: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const otherUserId = parseInt(req.params.userId as string, 10);

    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable, userStickersTable, albumsTable, stickersTable } = await import("@workspace/db");

    const [[myUser], [otherUser]] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1),
      db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1),
    ]);
    if (!otherUser) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const [myAlbumRows, theirAlbumRows] = await Promise.all([
      db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, session.userId)),
      db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, otherUserId)),
    ]);

    const theirAlbumIdSet = new Set(theirAlbumRows.map(a => a.albumId));
    const commonAlbumIds = myAlbumRows.map(a => a.albumId).filter(id => theirAlbumIdSet.has(id));

    if (!commonAlbumIds.length) {
      res.json({
        userId: otherUserId,
        nickname: otherUser.nickname,
        area: otherUser.area,
        totalExchanges: 0,
        distanceKm: parseFloat(estimateDistance(myUser?.cap ?? "00000", otherUser.cap).toFixed(1)),
        exchangesCompleted: otherUser.exchangesCompleted,
        albums: [],
      });
      return;
    }

    // Batch-fetch everything needed for detail view
    const [myStickers, theirStickers, commonAlbums, allStickers] = await Promise.all([
      db.select({
        stickerId: userStickersTable.stickerId,
        albumId: userStickersTable.albumId,
        state: userStickersTable.state,
      })
        .from(userStickersTable)
        .where(and(
          eq(userStickersTable.userId, session.userId),
          inArray(userStickersTable.albumId, commonAlbumIds)
        )),
      db.select({
        stickerId: userStickersTable.stickerId,
        albumId: userStickersTable.albumId,
        state: userStickersTable.state,
      })
        .from(userStickersTable)
        .where(and(
          eq(userStickersTable.userId, otherUserId),
          inArray(userStickersTable.albumId, commonAlbumIds)
        )),
      db.select().from(albumsTable).where(inArray(albumsTable.id, commonAlbumIds)),
      db.select().from(stickersTable).where(inArray(stickersTable.albumId, commonAlbumIds)),
    ]);

    const stickerMap = new Map<number, { id: number; albumId: number; number: number; name: string }>();
    for (const s of allStickers) {
      stickerMap.set(s.id, { id: s.id, albumId: s.albumId, number: s.number, name: s.name });
    }

    const toDetail = (ids: number[]) =>
      ids.map(id => stickerMap.get(id)).filter(Boolean) as { id: number; albumId: number; number: number; name: string }[];

    let totalExchanges = 0;
    const albumDetails = commonAlbumIds.map(albumId => {
      const album = commonAlbums.find(a => a.id === albumId);
      const myDups = new Set(myStickers.filter(s => s.albumId === albumId && s.state === "doppia").map(s => s.stickerId));
      const myMiss = new Set(myStickers.filter(s => s.albumId === albumId && s.state === "mancante").map(s => s.stickerId));
      const theirDups = new Set(theirStickers.filter(s => s.albumId === albumId && s.state === "doppia").map(s => s.stickerId));
      const theirMiss = new Set(theirStickers.filter(s => s.albumId === albumId && s.state === "mancante").map(s => s.stickerId));

      const youGiveIds = [...myDups].filter(id => theirMiss.has(id));
      const youReceiveIds = [...theirDups].filter(id => myMiss.has(id));
      const exchangeCount = Math.min(youGiveIds.length, youReceiveIds.length);
      totalExchanges += exchangeCount;

      return {
        albumId,
        albumTitle: album?.title ?? `Album #${albumId}`,
        exchangeCount,
        youGive: toDetail(youGiveIds),
        youReceive: toDetail(youReceiveIds),
      };
    }).filter(a => a.exchangeCount > 0);

    res.json({
      userId: otherUserId,
      nickname: otherUser.nickname,
      area: otherUser.area,
      totalExchanges,
      distanceKm: parseFloat(estimateDistance(myUser?.cap ?? "00000", otherUser.cap).toFixed(1)),
      exchangesCompleted: otherUser.exchangesCompleted,
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
