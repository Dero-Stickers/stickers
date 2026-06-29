import { Router } from "express";
import type { RequestHandler } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getSession } from "../middlewares/auth";
import { broadcast } from "../lib/realtime";
import { invalidateUser } from "../lib/matchCache";

/**
 * Conferma scambio concluso (montato sotto /chats).
 *
 * Modello: ogni utente conferma DAL PROPRIO lato; la conferma aggiorna SOLO il
 * suo album (doppie cedute → posseduta, mancanti ricevute → posseduta), mai
 * quello dell'altro. I match si ricalcolano da soli dallo stato delle figurine.
 */
const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

// GET /api/chats/:chatId/trade — proposta di scambio (cosa dai / cosa ricevi)
// per la coppia di questa chat, + stato conferme dei due utenti.
const getChatTrade: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);

    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable, tradeConfirmationsTable } = await import("@workspace/db");

    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat || (chat.user1Id !== session.userId && chat.user2Id !== session.userId)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }
    const otherUserId = chat.user1Id === session.userId ? chat.user2Id : chat.user1Id;

    const { computeTradeBreakdown } = await import("../lib/trade");
    const [{ give, receive, totalGive, totalReceive }, [otherUser], confirmations] = await Promise.all([
      computeTradeBreakdown(session.userId, otherUserId),
      db.select({ nickname: usersTable.nickname }).from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1),
      db.select().from(tradeConfirmationsTable).where(eq(tradeConfirmationsTable.chatId, chatId)),
    ]);

    const mine = confirmations.find(c => c.userId === session.userId);
    const theirs = confirmations.find(c => c.userId === otherUserId);

    res.json({
      otherUserId,
      otherUserNickname: otherUser?.nickname ?? "",
      totalGive,
      totalReceive,
      give,
      receive,
      myConfirmedAt: mine ? mine.updatedAt.toISOString() : null,
      otherConfirmedAt: theirs ? theirs.updatedAt.toISOString() : null,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/chats/:chatId/trade/confirm — conferma scambio concluso.
// Aggiorna SOLO l'album di chi conferma: doppie cedute → posseduta, mancanti
// ricevute → posseduta. Per sicurezza ricalcola lato server l'insieme valido e
// applica solo le figurine realmente scambiabili (ignora id arbitrari).
const confirmChatTrade: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const chatId = parseInt(req.params.chatId as string, 10);
    const giveIds: number[] = Array.isArray(req.body?.giveStickerIds) ? req.body.giveStickerIds.map(Number).filter(Number.isFinite) : [];
    const receiveIds: number[] = Array.isArray(req.body?.receiveStickerIds) ? req.body.receiveStickerIds.map(Number).filter(Number.isFinite) : [];

    const { db } = await import("@workspace/db");
    const { chatsTable, usersTable, userStickersTable, tradeConfirmationsTable } = await import("@workspace/db");

    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat || (chat.user1Id !== session.userId && chat.user2Id !== session.userId)) {
      res.status(403).json({ error: "FORBIDDEN" }); return;
    }
    const otherUserId = chat.user1Id === session.userId ? chat.user2Id : chat.user1Id;

    // Insieme VALIDO ricalcolato ora: solo le mie doppie che all'altro mancano
    // (give) e le doppie dell'altro che a me mancano (receive). Filtra gli id
    // ricevuti contro questo insieme → niente scrittura su figurine arbitrarie.
    const { computeTradeBreakdown } = await import("../lib/trade");
    const breakdown = await computeTradeBreakdown(session.userId, otherUserId);
    const validGive = new Set(breakdown.give.flatMap(g => g.stickers.map(s => s.id)));
    const validReceive = new Set(breakdown.receive.flatMap(g => g.stickers.map(s => s.id)));
    const applyGive = giveIds.filter(id => validGive.has(id));
    const applyReceive = receiveIds.filter(id => validReceive.has(id));

    if (!applyGive.length && !applyReceive.length) {
      res.status(400).json({ error: "NOTHING_TO_CONFIRM", message: "Nessuna figurina valida da aggiornare" });
      return;
    }

    const exchangesCompleted = await db.transaction(async (tx) => {
      if (applyGive.length) {
        await tx.update(userStickersTable)
          .set({ state: "posseduta", updatedAt: new Date() })
          .where(and(
            eq(userStickersTable.userId, session.userId),
            eq(userStickersTable.state, "doppia"),
            inArray(userStickersTable.stickerId, applyGive),
          ));
      }
      if (applyReceive.length) {
        await tx.update(userStickersTable)
          .set({ state: "posseduta", updatedAt: new Date() })
          .where(and(
            eq(userStickersTable.userId, session.userId),
            eq(userStickersTable.state, "mancante"),
            inArray(userStickersTable.stickerId, applyReceive),
          ));
      }

      // Prima conferma in questa chat? Solo allora conta come +1 scambio
      // completato (le ri-conferme di scambi parziali successivi non gonfiano).
      const [existing] = await tx.select({ id: tradeConfirmationsTable.id })
        .from(tradeConfirmationsTable)
        .where(and(eq(tradeConfirmationsTable.chatId, chatId), eq(tradeConfirmationsTable.userId, session.userId)))
        .limit(1);

      await tx.insert(tradeConfirmationsTable)
        .values({ chatId, userId: session.userId, givenCount: applyGive.length, receivedCount: applyReceive.length, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [tradeConfirmationsTable.chatId, tradeConfirmationsTable.userId],
          set: { givenCount: applyGive.length, receivedCount: applyReceive.length, updatedAt: new Date() },
        });

      let total = 0;
      if (!existing) {
        const [u] = await tx.update(usersTable)
          .set({ exchangesCompleted: sql`${usersTable.exchangesCompleted} + 1` })
          .where(eq(usersTable.id, session.userId))
          .returning({ n: usersTable.exchangesCompleted });
        total = u?.n ?? 0;
      } else {
        const [u] = await tx.select({ n: usersTable.exchangesCompleted }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
        total = u?.n ?? 0;
      }
      return total;
    });

    invalidateUser(session.userId); // collezione cambiata → i match si ricalcolano

    // Segnale realtime: l'altro vede subito che ho confermato.
    broadcast(`chat:${chatId}`, { chatId });
    broadcast(`user:${otherUserId}`, { chatId });

    res.status(200).json({
      success: true,
      givenApplied: applyGive.length,
      receivedApplied: applyReceive.length,
      exchangesCompleted,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/:chatId/trade", getChatTrade);
router.post("/:chatId/trade/confirm", confirmChatTrade);

export default router;
