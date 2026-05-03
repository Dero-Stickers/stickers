import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

/**
 * Deterministic distance estimation from Italian CAP codes.
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

interface CandidateRow extends Record<string, unknown> {
  id: number;
  nickname: string;
  area: string | null;
  cap: string;
  exchanges_completed: number;
  albums_in_common: number;
  you_give: number;
  you_receive: number;
}

/**
 * Top-N match aggregation done entirely in PostgreSQL.
 * Replaces the previous "load all users + all their stickers into Node memory"
 * approach which would have needed ~8MB+ of data per request at 10K users.
 *
 * Uses CTEs that hit the (user_id) and (sticker_id) indexes on user_stickers,
 * plus the (user_id, album_id) index on user_albums. Returns at most `limit`
 * candidates ranked by `LEAST(you_give, you_receive)` — i.e. the ones who can
 * actually trade the most stickers with the current user.
 */
async function fetchCandidates(
  meId: number,
  limit: number,
  capPrefix?: string,
): Promise<CandidateRow[]> {
  const { db } = await import("@workspace/db");
  // CAP pre-filter for /nearby — limits the candidate pool to nearby postal
  // codes before any sticker-set math runs.
  const capFilter = capPrefix
    ? sql`AND u.cap LIKE ${capPrefix + "%"}`
    : sql``;

  const rows = await db.execute<CandidateRow>(sql`
    WITH my_dups AS (
      SELECT sticker_id FROM user_stickers
      WHERE user_id = ${meId} AND state = 'doppia'
    ),
    my_miss AS (
      SELECT sticker_id FROM user_stickers
      WHERE user_id = ${meId} AND state = 'mancante'
    ),
    my_albums AS (
      SELECT album_id FROM user_albums WHERE user_id = ${meId}
    ),
    give AS (
      SELECT us.user_id, COUNT(*)::int AS n
      FROM user_stickers us
      JOIN my_dups d ON d.sticker_id = us.sticker_id
      WHERE us.state = 'mancante' AND us.user_id <> ${meId}
      GROUP BY us.user_id
    ),
    receive AS (
      SELECT us.user_id, COUNT(*)::int AS n
      FROM user_stickers us
      JOIN my_miss m ON m.sticker_id = us.sticker_id
      WHERE us.state = 'doppia' AND us.user_id <> ${meId}
      GROUP BY us.user_id
    ),
    common AS (
      SELECT ua.user_id, COUNT(*)::int AS n
      FROM user_albums ua
      JOIN my_albums ma ON ma.album_id = ua.album_id
      WHERE ua.user_id <> ${meId}
      GROUP BY ua.user_id
    )
    SELECT u.id, u.nickname, u.area, u.cap, u.exchanges_completed,
           COALESCE(c.n, 0) AS albums_in_common,
           COALESCE(g.n, 0) AS you_give,
           COALESCE(r.n, 0) AS you_receive
    FROM users u
    JOIN give g ON g.user_id = u.id
    JOIN receive r ON r.user_id = u.id
    LEFT JOIN common c ON c.user_id = u.id
    WHERE u.id <> ${meId} AND u.is_blocked = false
    ${capFilter}
    ORDER BY LEAST(g.n, r.n) DESC, c.n DESC NULLS LAST
    LIMIT ${limit}
  `);
  return (rows as any).rows ?? (rows as any);
}

// GET /api/matches  — top 20 by exchange potential
const getBestMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!me) { res.json([]); return; }

    const candidates = await fetchCandidates(session.userId, 20);
    const result = candidates.map(c => ({
      userId: c.id,
      nickname: c.nickname,
      area: c.area,
      cap: c.cap,
      totalExchanges: Math.min(c.you_give, c.you_receive),
      distanceKm: parseFloat(estimateDistance(me.cap, c.cap).toFixed(1)),
      exchangesCompleted: c.exchanges_completed,
      albumsInCommon: c.albums_in_common,
    }));
    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/matches/nearby?radius=10
const getNearbyMatches: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const radiusKm = parseFloat((req.query.radius ?? req.query.radiusKm ?? "10") as string);
    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!me) { res.json([]); return; }

    // For tight radii, pre-filter candidates by CAP prefix so the heavy
    // sticker aggregation runs on dozens, not thousands, of users.
    let capPrefix: string | undefined;
    if (radiusKm <= 5 && me.cap?.length >= 3) capPrefix = me.cap.slice(0, 3);
    else if (radiusKm <= 30 && me.cap?.length >= 2) capPrefix = me.cap.slice(0, 2);

    // Fetch a wider pool, then JS-filter by exact distance (CAP-based proxy).
    const candidates = await fetchCandidates(session.userId, 200, capPrefix);
    const result = candidates
      .map(c => ({
        userId: c.id,
        nickname: c.nickname,
        area: c.area,
        cap: c.cap,
        totalExchanges: Math.min(c.you_give, c.you_receive),
        distanceKm: parseFloat(estimateDistance(me.cap, c.cap).toFixed(1)),
        exchangesCompleted: c.exchanges_completed,
        albumsInCommon: c.albums_in_common,
      }))
      .filter(c => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 20);
    res.json(result);
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
    if (!Number.isFinite(otherUserId)) { res.status(400).json({ error: "BAD_REQUEST" }); return; }

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

    const [myStickers, theirStickers, commonAlbums, allStickers] = await Promise.all([
      db.select({ stickerId: userStickersTable.stickerId, albumId: userStickersTable.albumId, state: userStickersTable.state })
        .from(userStickersTable)
        .where(and(eq(userStickersTable.userId, session.userId), inArray(userStickersTable.albumId, commonAlbumIds))),
      db.select({ stickerId: userStickersTable.stickerId, albumId: userStickersTable.albumId, state: userStickersTable.state })
        .from(userStickersTable)
        .where(and(eq(userStickersTable.userId, otherUserId), inArray(userStickersTable.albumId, commonAlbumIds))),
      db.select().from(albumsTable).where(inArray(albumsTable.id, commonAlbumIds)),
      db.select().from(stickersTable).where(inArray(stickersTable.albumId, commonAlbumIds)),
    ]);

    const stickerMap = new Map<number, { id: number; albumId: number; number: number; name: string }>();
    for (const s of allStickers) stickerMap.set(s.id, { id: s.id, albumId: s.albumId, number: s.number, name: s.name });
    const toDetail = (ids: number[]) => ids.map(id => stickerMap.get(id)).filter(Boolean) as { id: number; albumId: number; number: number; name: string }[];

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
