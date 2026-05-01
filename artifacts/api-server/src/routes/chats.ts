import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, or, desc, lt } from "drizzle-orm";

const router = Router();

async function requireAuth(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  try { return JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString()); }
  catch { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
}

async function requirePremium(userId: number): Promise<boolean> {
  const { db } = await import("@workspace/db");
  const { usersTable } = await import("@workspace/db");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return false;
  if (user.isPremium) return true;
  if (user.demoStartedAt && user.demoExpiresAt && new Date() <= user.demoExpiresAt) return true;
  return false;
}

// GET /api/chats
const listChats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable, messagesTable } = await import("@workspace/db");

    const userChats = await db.select().from(chatsTable).where(
      or(eq(chatsTable.user1Id, session.userId), eq(chatsTable.user2Id, session.userId))
    );

    const result = await Promise.all(userChats.map(async chat => {
      const otherUserId = chat.user1Id === session.userId ? chat.user2Id : chat.user1Id;
      const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
      const [lastMsg] = await db.select().from(messagesTable).where(eq(messagesTable.chatId, chat.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
      const unread = (await db.select().from(messagesTable).where(
        and(eq(messagesTable.chatId, chat.id), eq(messagesTable.senderId, otherUserId), eq(messagesTable.isRead, false))
      )).length;

      return {
        id: chat.id,
        otherUserId,
        otherUserNickname: otherUser?.nickname ?? "",
        otherUserArea: otherUser?.area ?? "",
        status: chat.status,
        lastMessage: lastMsg?.text ?? null,
        lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
        unreadCount: unread,
        createdAt: chat.createdAt.toISOString(),
      };
    }));

    res.json(result.filter(c => c.status !== "closed" || c.lastMessage));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/chats/:userId/open
const openChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const otherUserId = parseInt(req.params.userId as string, 10);

    const canChat = await requirePremium(session.userId);
    if (!canChat) { res.status(403).json({ error: "PREMIUM_REQUIRED", message: "Funzione premium richiesta" }); return; }

    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable } = await import("@workspace/db");

    const existing = await db.select().from(chatsTable).where(
      or(
        and(eq(chatsTable.user1Id, session.userId), eq(chatsTable.user2Id, otherUserId)),
        and(eq(chatsTable.user1Id, otherUserId), eq(chatsTable.user2Id, session.userId))
      )
    ).limit(1);

    if (existing.length) {
      const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
      res.json({ id: existing[0].id, otherUserId, otherUserNickname: otherUser?.nickname ?? "", status: existing[0].status, createdAt: existing[0].createdAt.toISOString() });
      return;
    }

    const [chat] = await db.insert(chatsTable).values({ user1Id: session.userId, user2Id: otherUserId }).returning();
    const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);

    res.status(201).json({ id: chat.id, otherUserId, otherUserNickname: otherUser?.nickname ?? "", status: chat.status, createdAt: chat.createdAt.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/chats/:chatId/messages
const getChatMessages: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { db } = await import("@workspace/db");
    const { chatsTable, messagesTable, usersTable } = await import("@workspace/db");

    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat || (chat.user1Id !== session.userId && chat.user2Id !== session.userId)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }

    const msgs = await db.select({ m: messagesTable, u: usersTable })
      .from(messagesTable)
      .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
      .where(eq(messagesTable.chatId, chatId))
      .orderBy(messagesTable.createdAt);

    await db.update(messagesTable).set({ isRead: true }).where(
      and(eq(messagesTable.chatId, chatId), eq(messagesTable.senderId, chat.user1Id === session.userId ? chat.user2Id : chat.user1Id))
    );

    res.json(msgs.map(r => ({
      id: r.m.id,
      chatId: r.m.chatId,
      senderId: r.m.senderId,
      senderNickname: r.u.nickname,
      text: r.m.text,
      isRead: r.m.isRead,
      createdAt: r.m.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/chats/:chatId/messages
const sendMessage: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { text } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "EMPTY_MESSAGE" }); return; }

    const { db } = await import("@workspace/db");
    const { chatsTable, messagesTable, usersTable } = await import("@workspace/db");

    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat || (chat.user1Id !== session.userId && chat.user2Id !== session.userId)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }
    if (chat.status === "closed") { res.status(400).json({ error: "CHAT_CLOSED" }); return; }

    const [msg] = await db.insert(messagesTable).values({ chatId, senderId: session.userId, text: text.trim() }).returning();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

    res.status(201).json({ id: msg.id, chatId: msg.chatId, senderId: msg.senderId, senderNickname: u.nickname, text: msg.text, isRead: msg.isRead, createdAt: msg.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/chats/:chatId/report
const reportChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { db } = await import("@workspace/db");
    const { chatsTable, reportsTable } = await import("@workspace/db");

    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat || (chat.user1Id !== session.userId && chat.user2Id !== session.userId)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }

    const reportedUserId = chat.user1Id === session.userId ? chat.user2Id : chat.user1Id;
    await db.insert(reportsTable).values({ chatId, reporterId: session.userId, reportedUserId, reason: req.body.reason ?? "" });
    res.json({ success: true, message: "Segnalazione inviata" });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/chats/unread/count
const getUnreadCount: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { chatsTable, messagesTable } = await import("@workspace/db");

    const userChats = await db.select().from(chatsTable).where(
      or(eq(chatsTable.user1Id, session.userId), eq(chatsTable.user2Id, session.userId))
    );

    let count = 0;
    for (const chat of userChats) {
      const senderId = chat.user1Id === session.userId ? chat.user2Id : chat.user1Id;
      const unread = await db.select().from(messagesTable).where(
        and(eq(messagesTable.chatId, chat.id), eq(messagesTable.senderId, senderId), eq(messagesTable.isRead, false))
      );
      count += unread.length;
    }

    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", listChats);
router.post("/:userId/open", openChat);
router.get("/unread/count", getUnreadCount);
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendMessage);
router.post("/:chatId/report", reportChat);

export default router;
