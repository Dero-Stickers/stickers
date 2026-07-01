import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { verifyToken } from "../lib/auth";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  const session = verifyToken(authHeader.slice(7).trim());
  if (!session) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  if (!session.isAdmin) { res.status(403).json({ error: "FORBIDDEN" }); return null; }
  return session;
}

// GET /api/admin/stats
const getStats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");

    // Conteggi calcolati a DB con COUNT(*) — NON scaricare intere tabelle in
    // memoria solo per contarle (con molti messaggi/figurine sarebbe lento e
    // sprecone di RAM). Una sola query aggregata.
    const statRows = await db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE is_admin = false)              AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE is_admin = false AND is_premium) AS premium_users,
        (SELECT COUNT(*)::int FROM users WHERE is_admin = false AND is_blocked) AS blocked_users,
        (SELECT COUNT(*)::int FROM albums)                                    AS total_albums,
        (SELECT COUNT(*)::int FROM messages)                                  AS total_messages,
        (SELECT COUNT(*)::int FROM chats WHERE status = 'active')             AS active_chats,
        (SELECT COUNT(*)::int FROM chat_unlocks)                              AS unlocks,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'pending')          AS pending_reports
    `);
    const s = (((statRows as any).rows ?? statRows) as Record<string, number>[])[0] ?? {};

    res.json({
      totalUsers: s.total_users ?? 0,
      totalAlbums: s.total_albums ?? 0,
      totalMessages: s.total_messages ?? 0,
      activeChats: s.active_chats ?? 0,
      premiumUsers: s.premium_users ?? 0,
      unlocks: s.unlocks ?? 0,
      blockedUsers: s.blocked_users ?? 0,
      pendingReports: s.pending_reports ?? 0,
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
    const { usersTable } = await import("@workspace/db");

    const users = await db.select().from(usersTable).where(eq(usersTable.isAdmin, false)).orderBy(desc(usersTable.createdAt));

    // Conteggio sblocchi di singola chat per utente (una query sola, no N+1).
    const unlockRows = await db.execute<{ user_id: number; n: number }>(
      sql`SELECT user_id, COUNT(*)::int AS n FROM chat_unlocks GROUP BY user_id`,
    );
    const unlockMap = new Map<number, number>(
      (((unlockRows as any).rows ?? unlockRows) as { user_id: number; n: number }[]).map(r => [r.user_id, r.n]),
    );

    // Conteggio album per utente in UNA query (GROUP BY) — evita N+1 (prima una
    // query per ogni utente: con 3000 utenti saturava il pool e andava in timeout).
    const albumRows = await db.execute<{ user_id: number; n: number }>(
      sql`SELECT user_id, COUNT(*)::int AS n FROM user_albums GROUP BY user_id`,
    );
    const albumMap = new Map<number, number>(
      (((albumRows as any).rows ?? albumRows) as { user_id: number; n: number }[]).map(r => [r.user_id, r.n]),
    );

    const result = users.map(u => ({
      id: u.id,
      nickname: u.nickname,
      cap: u.cap,
      area: u.area,
      isPremium: u.isPremium,
      hasAllChats: u.isPremium,
      unlockedChats: unlockMap.get(u.id) ?? 0,
      albumCount: albumMap.get(u.id) ?? 0,
      exchangesCompleted: u.exchangesCompleted,
      isBlocked: u.isBlocked,
      createdAt: u.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log?.error(err);
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
    res.json({
      id: updated.id,
      nickname: updated.nickname,
      cap: updated.cap,
      area: updated.area,
      isPremium: updated.isPremium,
      hasAllChats: updated.isPremium,
      unlockedChats: 0,
      albumCount: 0,
      exchangesCompleted: updated.exchangesCompleted,
      isBlocked: updated.isBlocked,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/admin/chats
// Ottimizzato per scalare a migliaia di chat: niente N+1 (prima 1 + 4·N query).
// Ora poche query totali — nickname, conteggi messaggi e report aggregati in blocco.
const listChats: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { chatsTable } = await import("@workspace/db");

    const chats = await db.select().from(chatsTable).orderBy(desc(chatsTable.createdAt));
    if (chats.length === 0) { res.json([]); return; }

    // 1) Nickname di tutti i partecipanti in UNA query (solo gli id coinvolti).
    const userIds = Array.from(new Set(chats.flatMap(c => [c.user1Id, c.user2Id])));
    const nickRows = await db.execute<{ id: number; nickname: string }>(
      sql`SELECT id, nickname FROM users WHERE id = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)})`,
    );
    const nickMap = new Map<number, string>(
      (((nickRows as any).rows ?? nickRows) as { id: number; nickname: string }[]).map(r => [r.id, r.nickname]),
    );

    // 2) Conteggio messaggi per chat in UNA query (GROUP BY).
    const msgRows = await db.execute<{ chat_id: number; n: number }>(
      sql`SELECT chat_id, COUNT(*)::int AS n FROM messages GROUP BY chat_id`,
    );
    const msgMap = new Map<number, number>(
      (((msgRows as any).rows ?? msgRows) as { chat_id: number; n: number }[]).map(r => [r.chat_id, r.n]),
    );

    // 3) Ultima segnalazione per chat in UNA query (DISTINCT ON, più recente).
    const repRows = await db.execute<{ chat_id: number; reason: string }>(
      sql`SELECT DISTINCT ON (chat_id) chat_id, reason
          FROM reports WHERE chat_id IS NOT NULL
          ORDER BY chat_id, created_at DESC`,
    );
    const repMap = new Map<number, string>(
      (((repRows as any).rows ?? repRows) as { chat_id: number; reason: string }[]).map(r => [r.chat_id, r.reason]),
    );

    const result = chats.map(chat => ({
      id: chat.id,
      user1Id: chat.user1Id,
      user2Id: chat.user2Id,
      user1Nickname: nickMap.get(chat.user1Id) ?? "",
      user2Nickname: nickMap.get(chat.user2Id) ?? "",
      status: chat.status,
      messageCount: msgMap.get(chat.id) ?? 0,
      hasReport: repMap.has(chat.id),
      reportReason: repMap.get(chat.id) ?? null,
      createdAt: chat.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /api/admin/chats/:chatId/close
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

// PATCH /api/admin/chats/:chatId/reopen — rimette una chat chiusa in stato attivo
const reopenChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const { db } = await import("@workspace/db");
    const { chatsTable } = await import("@workspace/db");
    await db.update(chatsTable).set({ status: "active" }).where(eq(chatsTable.id, chatId));
    res.json({ success: true, message: "Chat riaperta" });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /api/admin/chats/:chatId/resolve-report — segna come GESTITE le segnalazioni
// di questa chat (status pending → resolved). Conserva lo storico ma toglie l'utente
// dallo stato "sotto revisione" (il banner lato utente si basa sui soli report pending).
const resolveChatReports: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    if (!Number.isFinite(chatId)) { res.status(400).json({ error: "INVALID_ID" }); return; }
    const { db } = await import("@workspace/db");
    const { reportsTable } = await import("@workspace/db");
    const { and } = await import("drizzle-orm");
    const updated = await db
      .update(reportsTable)
      .set({ status: "resolved" })
      .where(and(eq(reportsTable.chatId, chatId), eq(reportsTable.status, "pending")))
      .returning({ id: reportsTable.id });
    res.json({ success: true, resolved: updated.length, message: "Segnalazione gestita" });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// DELETE /api/admin/chats/:chatId
// Elimina definitivamente una chat. Messaggi e conferme scambio collegati spariscono
// per FK CASCADE; le segnalazioni (FK NO ACTION) vanno rimosse prima per non bloccare.
const deleteChat: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    if (!Number.isFinite(chatId)) { res.status(400).json({ error: "INVALID_ID" }); return; }
    const { db } = await import("@workspace/db");
    const { chatsTable, reportsTable } = await import("@workspace/db");
    // Toglie prima le segnalazioni legate (vincolo FK NO ACTION), poi la chat.
    await db.delete(reportsTable).where(eq(reportsTable.chatId, chatId));
    const deleted = await db.delete(chatsTable).where(eq(chatsTable.id, chatId)).returning({ id: chatsTable.id });
    if (deleted.length === 0) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json({ success: true, message: "Chat eliminata" });
  } catch (err) {
    req.log?.error(err);
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
    res.json(msgs.map(r => ({ id: r.m.id, chatId: r.m.chatId, senderId: r.m.senderId, senderNickname: r.u.nickname, text: r.m.text, isRead: r.m.isRead, createdAt: r.m.createdAt.toISOString() })));
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
      const reported = r.reportedUserId
        ? (await db.select().from(usersTable).where(eq(usersTable.id, r.reportedUserId)).limit(1))[0] ?? null
        : null;
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

// Default prezzi (centesimi interi) e valuta se le impostazioni mancano.
const PAYWALL_DEFAULTS = { priceSingleCents: 199, priceAllCents: 999, currency: "EUR" };

// GET /api/admin/paywall/config — master switch chat a pagamento + prezzi.
const getPaywallConfig: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");
    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });
    res.json({
      chatPaywallEnabled: map["chat_paywall_enabled"] === "true",
      priceSingleCents: parseInt(map["price_single_cents"] ?? String(PAYWALL_DEFAULTS.priceSingleCents), 10),
      priceAllCents: parseInt(map["price_all_cents"] ?? String(PAYWALL_DEFAULTS.priceAllCents), 10),
      currency: map["paywall_currency"] ?? PAYWALL_DEFAULTS.currency,
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/admin/paywall/config — aggiorna master switch e prezzi (centesimi interi).
const updatePaywallConfig: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const upsert = async (key: string, value: string) => {
      const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key)).limit(1);
      if (existing.length) {
        await db.update(appSettingsTable).set({ value, updatedAt: new Date() }).where(eq(appSettingsTable.key, key));
      } else {
        await db.insert(appSettingsTable).values({ key, value });
      }
    };

    if (req.body.chatPaywallEnabled !== undefined) await upsert("chat_paywall_enabled", String(!!req.body.chatPaywallEnabled));
    // Prezzi: SEMPRE centesimi interi (mai float). Floor difensivo.
    if (req.body.priceSingleCents !== undefined) await upsert("price_single_cents", String(Math.max(0, Math.floor(Number(req.body.priceSingleCents) || 0))));
    if (req.body.priceAllCents !== undefined) await upsert("price_all_cents", String(Math.max(0, Math.floor(Number(req.body.priceAllCents) || 0))));
    if (req.body.currency !== undefined) await upsert("paywall_currency", String(req.body.currency));

    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });
    res.json({
      chatPaywallEnabled: map["chat_paywall_enabled"] === "true",
      priceSingleCents: parseInt(map["price_single_cents"] ?? String(PAYWALL_DEFAULTS.priceSingleCents), 10),
      priceAllCents: parseInt(map["price_all_cents"] ?? String(PAYWALL_DEFAULTS.priceAllCents), 10),
      currency: map["paywall_currency"] ?? PAYWALL_DEFAULTS.currency,
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/admin/users/:userId/premium — sblocco/revoca manuale "tutte le chat".
// hasAllChats coincide con isPremium: questo è l'unico modo lato admin per
// concederlo/revocarlo senza pagamento.
const setUserPremium: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const userId = parseInt(req.params.userId as string, 10);
    const grant = !!req.body?.grant;
    const { db } = await import("@workspace/db");
    const { usersTable, userAlbumsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "NOT_FOUND" }); return; }

    const [updated] = await db.update(usersTable).set({ isPremium: grant }).where(eq(usersTable.id, userId)).returning();
    const albums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, userId));
    const { chatUnlocksTable } = await import("@workspace/db");
    const unlocks = await db.select({ id: chatUnlocksTable.id }).from(chatUnlocksTable).where(eq(chatUnlocksTable.userId, userId));

    res.json({
      id: updated.id,
      nickname: updated.nickname,
      cap: updated.cap,
      area: updated.area,
      isPremium: updated.isPremium,
      hasAllChats: updated.isPremium,
      unlockedChats: unlocks.length,
      albumCount: albums.length,
      exchangesCompleted: updated.exchangesCompleted,
      isBlocked: updated.isBlocked,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/stats", getStats);
router.get("/users", listUsers);
router.patch("/users/:userId/block", toggleBlock);
router.post("/users/:userId/premium", setUserPremium);
router.get("/chats", listChats);
router.patch("/chats/:chatId/close", closeChat);
router.patch("/chats/:chatId/reopen", reopenChat);
router.patch("/chats/:chatId/resolve-report", resolveChatReports);
router.delete("/chats/:chatId", deleteChat);
router.get("/chats/:chatId/messages", getChatMessages);
router.get("/reports", listReports);
router.get("/paywall/config", getPaywallConfig);
router.put("/paywall/config", updatePaywallConfig);

export default router;
