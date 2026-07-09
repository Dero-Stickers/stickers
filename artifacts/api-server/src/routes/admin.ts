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
        (SELECT COUNT(*)::int FROM users WHERE is_admin = false AND is_blocked) AS blocked_users,
        (SELECT COUNT(*)::int FROM albums)                                    AS total_albums,
        (SELECT COUNT(*)::int FROM messages)                                  AS total_messages,
        (SELECT COUNT(*)::int FROM chats WHERE status = 'active')             AS active_chats,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'pending')          AS pending_reports
    `);
    const s = (((statRows as any).rows ?? statRows) as Record<string, number>[])[0] ?? {};

    res.json({
      totalUsers: s.total_users ?? 0,
      totalAlbums: s.total_albums ?? 0,
      totalMessages: s.total_messages ?? 0,
      activeChats: s.active_chats ?? 0,
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

    // Conteggio album per utente in UNA query (GROUP BY) — evita N+1 (prima una
    // query per ogni utente: con 3000 utenti saturava il pool e andava in timeout).
    const albumRows = await db.execute<{ user_id: number; n: number }>(
      sql`SELECT user_id, COUNT(*)::int AS n FROM user_albums GROUP BY user_id`,
    );
    const albumMap = new Map<number, number>(
      (((albumRows as any).rows ?? albumRows) as { user_id: number; n: number }[]).map(r => [r.user_id, r.n]),
    );

    // Gestione album: quante figurine l'utente ha davvero segnato come "sue"
    // (posseduta) e quante "doppie" (pronte allo scambio). Una query aggregata
    // (GROUP BY), stesso pattern di albumMap. Serve all'admin per distinguere
    // "sta gestendo la collezione" da "ha solo aggiunto l'album" (tutte mancanti
    // → owned=0, duplicates=0 = "non gestito"). Le mancanti non si contano.
    const stickerRows = await db.execute<{ user_id: number; owned: number; duplicates: number }>(
      sql`SELECT user_id,
                 COUNT(*) FILTER (WHERE state = 'posseduta')::int AS owned,
                 COUNT(*) FILTER (WHERE state = 'doppia')::int    AS duplicates
          FROM user_stickers GROUP BY user_id`,
    );
    const stickerMap = new Map<number, { owned: number; duplicates: number }>(
      (((stickerRows as any).rows ?? stickerRows) as { user_id: number; owned: number; duplicates: number }[])
        .map(r => [r.user_id, { owned: r.owned, duplicates: r.duplicates }]),
    );

    // Donazioni per nickname (best-effort): match sul nome del donatore Ko-fi
    // (from_name) OPPURE sul messaggio che contiene il nickname (il modale invita
    // l'utente a incollarlo). NON è garantito al 100% — è un INDIZIO, non un dato
    // certo. Un utente può avere PIÙ donazioni: restituiamo l'elenco completo
    // (data, importo, valuta, messaggio) così l'admin apre il dettaglio dal modale.
    // Una sola query, poi raggruppiamo in memoria per nickname (dataset piccolo).
    const donRows = await db.execute<{
      nick: string; amount: string; currency: string; message: string | null; created_at: Date;
    }>(
      sql`SELECT u.nickname AS nick, d.amount, d.currency, d.message, d.created_at
          FROM users u
          JOIN donations d
            ON lower(d.from_name) = lower(u.nickname)
            OR d.message ILIKE '%' || u.nickname || '%'
          WHERE u.is_admin = false
          ORDER BY d.created_at DESC`,
    );
    const donationsByNick = new Map<string, Array<{ amount: string; currency: string; message: string | null; createdAt: string }>>();
    for (const r of ((donRows as any).rows ?? donRows) as any[]) {
      const key = String(r.nick).toLowerCase();
      const list = donationsByNick.get(key) ?? [];
      list.push({
        amount: String(r.amount),
        currency: r.currency,
        message: r.message ?? null,
        createdAt: new Date(r.created_at).toISOString(),
      });
      donationsByNick.set(key, list);
    }

    // Inviti a donare inviati (storico anti-spam): una query, poi mappa per
    // user_id. `sent_at` = quando l'admin ha invitato; `seen_at` = quando
    // l'utente ha visto il modale (NULL = ancora da vedere). Serve all'admin
    // per sapere a chi ha già scritto e non ripetere l'invito.
    const nudgeRows = await db.execute<{ user_id: number; sent_at: Date; seen_at: Date | null }>(
      sql`SELECT user_id, sent_at, seen_at FROM donation_nudges`,
    );
    const nudgeMap = new Map<number, { sentAt: string; seenAt: string | null }>(
      (((nudgeRows as any).rows ?? nudgeRows) as { user_id: number; sent_at: Date; seen_at: Date | null }[]).map(r => [
        r.user_id,
        { sentAt: new Date(r.sent_at).toISOString(), seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : null },
      ]),
    );

    const result = users.map(u => {
      const donations = donationsByNick.get(u.nickname.toLowerCase()) ?? [];
      const donationTotal = donations.reduce((s, d) => s + Number(d.amount || 0), 0);
      const nudge = nudgeMap.get(u.id) ?? null;
      return {
        id: u.id,
        nickname: u.nickname,
        cap: u.cap,
        area: u.area,
        albumCount: albumMap.get(u.id) ?? 0,
        ownedCount: stickerMap.get(u.id)?.owned ?? 0,
        duplicatesCount: stickerMap.get(u.id)?.duplicates ?? 0,
        donationCount: donations.length,
        donationTotal: donationTotal.toFixed(2),
        donationCurrency: donations[0]?.currency ?? "EUR",
        donations,
        // stato invito a donare (null = mai invitato)
        nudgeSentAt: nudge?.sentAt ?? null,
        nudgeSeenAt: nudge?.seenAt ?? null,
        exchangesCompleted: u.exchangesCompleted,
        isBlocked: u.isBlocked,
        createdAt: u.createdAt.toISOString(),
      };
    });
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
    const nextBlocked = isBlocked ?? !user.isBlocked;
    const [updated] = await db.update(usersTable).set({ isBlocked: nextBlocked }).where(eq(usersTable.id, userId)).returning();
    // Lista nera email: tienila allineata al blocco così l'utente non può
    // aggirarlo eliminando l'account e re-iscrivendosi con la stessa email.
    // (Gli utenti PIN senza email vengono ignorati: helper no-op su email vuota.)
    const { blockEmail, unblockEmail } = await import("../lib/blocklist");
    if (nextBlocked) await blockEmail(updated.email, "Bloccato da admin");
    else await unblockEmail(updated.email);
    res.json({
      id: updated.id,
      nickname: updated.nickname,
      cap: updated.cap,
      area: updated.area,
      albumCount: 0,
      exchangesCompleted: updated.exchangesCompleted,
      isBlocked: updated.isBlocked,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/admin/users/:userId/nudge
// L'admin invia a un utente un gentile invito (una tantum) a sostenere l'app con
// una donazione libera via Ko-fi. L'utente lo vede UNA volta al prossimo accesso.
// Un solo invito per utente (UNIQUE su user_id): reinvitare aggiorna sent_at e
// azzera seen_at, così l'invito ricompare. Registra lo storico (anti-spam).
const nudgeUser: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const userId = parseInt(req.params.userId as string, 10);
    if (!Number.isInteger(userId)) { res.status(400).json({ error: "BAD_REQUEST" }); return; }
    const { db } = await import("@workspace/db");
    const { usersTable, donationNudgesTable } = await import("@workspace/db");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    if (user.isAdmin) { res.status(400).json({ error: "CANNOT_NUDGE_ADMIN" }); return; }
    // Upsert: se esiste già un invito per l'utente lo "riarma" (nuovo sent_at,
    // seen_at azzerato); altrimenti lo crea. onConflict su user_id (UNIQUE).
    const [row] = await db
      .insert(donationNudgesTable)
      .values({ userId, sentAt: new Date(), seenAt: null })
      .onConflictDoUpdate({
        target: donationNudgesTable.userId,
        set: { sentAt: new Date(), seenAt: null },
      })
      .returning();
    res.json({
      success: true,
      nudgeSentAt: row.sentAt.toISOString(),
      nudgeSeenAt: row.seenAt ? row.seenAt.toISOString() : null,
    });
  } catch (err) {
    req.log?.error(err);
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

// GET /api/admin/donations — riepilogo + elenco donazioni Ko-fi (sola lettura).
// L'app è 100% gratuita: qui l'owner monitora i contributi spontanei. Nessun
// pagamento passa dall'app; questa rotta legge solo ciò che il webhook ha salvato.
const getDonations: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db, donationsTable } = await import("@workspace/db");

    // Riepilogo aggregato a DB (una query): totale, numero, media, ultima data.
    const sumRows = await db.execute<Record<string, unknown>>(sql`
      SELECT
        COALESCE(SUM(amount), 0)::text            AS total,
        COUNT(*)::int                             AS count,
        COALESCE(ROUND(AVG(amount), 2), 0)::text  AS average,
        MAX(created_at)                           AS last_at
      FROM donations
    `);
    const s = (((sumRows as any).rows ?? sumRows) as Record<string, unknown>[])[0] ?? {};

    // Elenco (ultime 100, più recenti in alto).
    const rows = await db
      .select()
      .from(donationsTable)
      .orderBy(desc(donationsTable.createdAt))
      .limit(100);

    res.json({
      summary: {
        total: String(s.total ?? "0"),
        count: Number(s.count ?? 0),
        average: String(s.average ?? "0"),
        lastAt: s.last_at ?? null,
        currency: rows[0]?.currency ?? "EUR",
      },
      donations: rows.map((d) => ({
        id: d.id,
        fromName: d.fromName,
        message: d.message,
        amount: d.amount,
        currency: d.currency,
        type: d.type,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/stats", getStats);
router.get("/donations", getDonations);
router.get("/users", listUsers);
router.patch("/users/:userId/block", toggleBlock);
router.post("/users/:userId/nudge", nudgeUser);
router.get("/chats", listChats);
router.patch("/chats/:chatId/close", closeChat);
router.patch("/chats/:chatId/reopen", reopenChat);
router.patch("/chats/:chatId/resolve-report", resolveChatReports);
router.get("/chats/:chatId/messages", getChatMessages);
router.get("/reports", listReports);

export default router;
