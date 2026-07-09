import { Router } from "express";
import type { RequestHandler } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

// Route legate all'utente corrente, oltre a /auth/me. Montate dietro il gate
// di autenticazione + anti-blocco (vedi routes/index.ts). Inviti che l'admin può
// inviare dalla pagina Utenti: "dona" (una tantum) e "condividi" (ripetibile).
const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

// GET /api/me/nudge
// Restituisce l'invito NON ancora visto (seen_at IS NULL) a priorità più alta,
// se c'è. { nudge: null } se non c'è nulla da mostrare. L'utente lo vede una
// volta per invio. Se ne ha più di uno pendente (dona + condividi), ne torniamo
// UNO solo (il più recente): l'app li mostra uno alla volta, mai due modali
// insieme. Il campo `type` dice all'app quale modale aprire.
const getMyNudge: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db, donationNudgesTable } = await import("@workspace/db");
    const { desc } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(donationNudgesTable)
      .where(and(eq(donationNudgesTable.userId, session.userId), isNull(donationNudgesTable.seenAt)))
      .orderBy(desc(donationNudgesTable.sentAt))
      .limit(1);
    res.json({
      nudge: row ? { type: row.type, sentAt: row.sentAt.toISOString() } : null,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/me/nudge/seen  { type?: "dona" | "condividi" }
// Segna come visto l'invito del tipo indicato (default: tutti i pendenti, per
// retro-compatibilità col client vecchio che non manda il type). Consuma
// l'invito: non riappare finché l'admin non lo rinvia.
const markMyNudgeSeen: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db, donationNudgesTable } = await import("@workspace/db");
    const type = (req.body?.type as string | undefined)?.trim();
    const conds = [
      eq(donationNudgesTable.userId, session.userId),
      isNull(donationNudgesTable.seenAt),
    ];
    if (type === "dona" || type === "condividi") {
      conds.push(eq(donationNudgesTable.type, type));
    }
    await db
      .update(donationNudgesTable)
      .set({ seenAt: new Date() })
      .where(and(...conds));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/nudge", getMyNudge);
router.post("/nudge/seen", markMyNudgeSeen);

export default router;
