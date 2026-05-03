import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

async function requirePremium(userId: number): Promise<boolean> {
  const { db } = await import("@workspace/db");
  const { usersTable } = await import("@workspace/db");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return false;
  if (user.isPremium) return true;
  if (user.demoStartedAt && user.demoExpiresAt && new Date() <= user.demoExpiresAt) return true;
  return false;
}

// GET /api/chats — single aggregated query: chat + other user + last message
// + unread count, no per-row N+1. Backed by indexes:
//   chats_user1_idx / chats_user2_idx → WHERE filter
//   messages_chat_created_idx → LATERAL last-message + unread count
const listChats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const me = session.userId;

    const rows = await db.execute<{
      id: number;
      other_user_id: number;
      other_nickname: string;
      other_area: string | null;
      status: string;
      last_text: string | null;
      last_at: Date | null;
      unread: number;
      created_at: Date;
    }>(sql`
      SELECT
        c.id,
        CASE WHEN c.user1_id = ${me} THEN c.user2_id ELSE c.user1_id END AS other_user_id,
        ou.nickname AS other_nickname,
        ou.area AS other_area,
        c.status,
        lm.text AS last_text,
        lm.created_at AS last_at,
        COALESCE(uc.unread, 0)::int AS unread,
        c.created_at
      FROM chats c
      JOIN users ou ON ou.id = CASE WHEN c.user1_id = ${me} THEN c.user2_id ELSE c.user1_id END
      LEFT JOIN LATERAL (
        SELECT text, created_at FROM messages
        WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread FROM messages
        WHERE chat_id = c.id AND sender_id <> ${me} AND is_read = false
      ) uc ON true
      WHERE c.user1_id = ${me} OR c.user2_id = ${me}
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `);

    const result = ((rows as any).rows ?? rows).map((r: any) => ({
      id: r.id,
      otherUserId: r.other_user_id,
      otherUserNickname: r.other_nickname ?? "",
      otherUserArea: r.other_area ?? "",
      status: r.status,
      lastMessage: r.last_text ?? null,
      lastMessageAt: r.last_at ? new Date(r.last_at).toISOString() : null,
      unreadCount: Number(r.unread) || 0,
      createdAt: new Date(r.created_at).toISOString(),
    })).filter((c: any) => c.status !== "closed" || c.lastMessage);

    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/chats — open or get chat with body { otherUserId }
const openChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;

    const otherUserId = req.body?.otherUserId as number | undefined;
    if (!otherUserId || isNaN(Number(otherUserId))) {
      res.status(400).json({ error: "INVALID_BODY", message: "otherUserId richiesto" });
      return;
    }
    const otherUserIdNum = Number(otherUserId);

    const canChat = await requirePremium(session.userId);
    if (!canChat) { res.status(403).json({ error: "PREMIUM_REQUIRED", message: "Funzione premium richiesta" }); return; }

    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable } = await import("@workspace/db");

    // Race-proof open-or-create: serialize concurrent calls for the same
    // unordered pair via a transaction-scoped advisory lock keyed on the
    // sorted (lo, hi) ids. Two requests racing to open the same chat will
    // queue on the lock and only one INSERT actually runs.
    const lo = Math.min(session.userId, otherUserIdNum);
    const hi = Math.max(session.userId, otherUserIdNum);

    const [chat, otherUser] = await db.transaction(async (tx) => {
      // pg_advisory_xact_lock(int, int) — two 32-bit keys form a 64-bit lock
      // id. User ids are serial INT so they fit. Lock is auto-released at the
      // end of the transaction (commit or rollback).
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lo}::int, ${hi}::int)`);

      const existing = await tx.select().from(chatsTable).where(
        or(
          and(eq(chatsTable.user1Id, session.userId), eq(chatsTable.user2Id, otherUserIdNum)),
          and(eq(chatsTable.user1Id, otherUserIdNum), eq(chatsTable.user2Id, session.userId))
        )
      ).limit(1);

      const c = existing[0]
        ?? (await tx.insert(chatsTable).values({ user1Id: session.userId, user2Id: otherUserIdNum }).returning())[0];

      const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, otherUserIdNum)).limit(1);
      return [c, u] as const;
    });

    const status = chat.status;
    res.status(201).json({ id: chat.id, otherUserId: otherUserIdNum, otherUserNickname: otherUser?.nickname ?? "", status, createdAt: chat.createdAt.toISOString() });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/chats/unread-count — single COUNT(DISTINCT) query, no per-chat loop
const getUnreadCount: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const me = session.userId;

    const rows = await db.execute<{ n: number }>(sql`
      SELECT COUNT(DISTINCT m.chat_id)::int AS n
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.is_read = false
        AND m.sender_id <> ${me}
        AND (c.user1_id = ${me} OR c.user2_id = ${me})
    `);
    const r = ((rows as any).rows ?? rows)[0];
    res.json({ unreadCount: Number(r?.n ?? 0) });
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
    res.status(201).json({ success: true, message: "Segnalazione inviata" });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// Route order matters — static paths before dynamic
router.get("/", listChats);
router.post("/", openChat);
router.get("/unread-count", getUnreadCount);
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendMessage);
router.post("/:chatId/report", reportChat);

export default router;
