import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, ne, desc } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  try {
    const session = JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString());
    if (!session.isAdmin) { res.status(403).json({ error: "FORBIDDEN" }); return null; }
    return session;
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
}

// GET /api/admin/stats
const getStats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { usersTable, albumsTable, chatsTable, reportsTable, messagesTable } = await import("@workspace/db");

    const users = await db.select().from(usersTable).where(eq(usersTable.isAdmin, false));
    const albums = await db.select().from(albumsTable);
    const chats = await db.select().from(chatsTable);
    const reports = await db.select().from(reportsTable);
    const messages = await db.select().from(messagesTable);

    const demoUsers = users.filter(u => u.demoStartedAt && u.demoExpiresAt && new Date() <= u.demoExpiresAt).length;
    const premiumUsers = users.filter(u => u.isPremium).length;
    const blockedUsers = users.filter(u => u.isBlocked).length;
    const activeChats = chats.filter(c => c.status === "active").length;
    const pendingReports = reports.filter(r => r.status === "pending").length;

    res.json({
      totalUsers: users.length,
      totalAlbums: albums.length,
      totalMessages: messages.length,
      activeChats,
      demoUsers,
      premiumUsers,
      blockedUsers,
      pendingReports,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/admin/users
const listUsers: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable } = await import("@workspace/db");

    const users = await db.select().from(usersTable).where(eq(usersTable.isAdmin, false)).orderBy(desc(usersTable.createdAt));

    const result = await Promise.all(users.map(async u => {
      let demoStatus = "free";
      if (u.isPremium) demoStatus = "premium";
      else if (u.demoStartedAt && u.demoExpiresAt && new Date() <= u.demoExpiresAt) demoStatus = "demo_active";
      else if (u.demoStartedAt) demoStatus = "demo_expired";

      const albums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, u.id));

      return {
        id: u.id,
        nickname: u.nickname,
        cap: u.cap,
        area: u.area,
        isPremium: u.isPremium,
        demoStatus,
        albumCount: albums.length,
        exchangesCompleted: u.exchangesCompleted,
        isBlocked: u.isBlocked,
        createdAt: u.createdAt.toISOString(),
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /api/admin/users/:userId/block
const toggleBlock: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const userId = parseInt(req.params.userId as string, 10);
    const isBlocked = req.body.isBlocked as boolean;
    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    const [updated] = await db.update(usersTable).set({ isBlocked: isBlocked ?? !user.isBlocked }).where(eq(usersTable.id, userId)).returning();
    res.json({ success: true, isBlocked: updated.isBlocked });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/admin/chats
const listChats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable, messagesTable, reportsTable } = await import("@workspace/db");

    const chats = await db.select().from(chatsTable).orderBy(desc(chatsTable.createdAt));
    const result = await Promise.all(chats.map(async chat => {
      const [u1] = await db.select().from(usersTable).where(eq(usersTable.id, chat.user1Id)).limit(1);
      const [u2] = await db.select().from(usersTable).where(eq(usersTable.id, chat.user2Id)).limit(1);
      const msgCount = (await db.select().from(messagesTable).where(eq(messagesTable.chatId, chat.id))).length;
      const reports = await db.select().from(reportsTable).where(eq(reportsTable.chatId, chat.id));
      return {
        id: chat.id,
        user1Nickname: u1?.nickname ?? "",
        user2Nickname: u2?.nickname ?? "",
        status: chat.status,
        messageCount: msgCount,
        hasReport: reports.length > 0,
        createdAt: chat.createdAt.toISOString(),
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/admin/chats/:chatId/close
const closeChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { db } = await import("@workspace/db");
    const { chatsTable } = await import("@workspace/db");
    await db.update(chatsTable).set({ status: "closed" }).where(eq(chatsTable.id, chatId));
    res.json({ success: true, message: "Chat chiusa" });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/admin/chats/:chatId/messages
const getChatMessages: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { db } = await import("@workspace/db");
    const { messagesTable, usersTable } = await import("@workspace/db");
    const msgs = await db.select({ m: messagesTable, u: usersTable })
      .from(messagesTable)
      .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
      .where(eq(messagesTable.chatId, chatId));
    res.json(msgs.map(r => ({ id: r.m.id, senderId: r.m.senderId, senderNickname: r.u.nickname, text: r.m.text, createdAt: r.m.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/admin/reports
const listReports: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { reportsTable, usersTable } = await import("@workspace/db");
    const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
    const result = await Promise.all(reports.map(async r => {
      const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, r.reporterId)).limit(1);
      const [reported] = r.reportedUserId
        ? await db.select().from(usersTable).where(eq(usersTable.id, r.reportedUserId)).limit(1)
        : [null];
      return {
        id: r.id,
        chatId: r.chatId,
        reporterNickname: reporter?.nickname ?? "",
        reportedUserNickname: reported?.nickname ?? "",
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      };
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/stats", getStats);
router.get("/users", listUsers);
router.patch("/users/:userId/block", toggleBlock);
router.get("/chats", listChats);
router.post("/chats/:chatId/close", closeChat);
router.get("/chats/:chatId/messages", getChatMessages);
router.get("/reports", listReports);

export default router;
