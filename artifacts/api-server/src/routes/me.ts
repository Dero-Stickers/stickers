import { Router } from "express";
import type { RequestHandler } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "../middlewares/auth";

// Route legate all'utente corrente, oltre a /auth/me. Montate dietro il gate
// di autenticazione + anti-blocco (vedi routes/index.ts). Per ora: l'invito a
// donare (una tantum) che l'admin può inviare dalla pagina Utenti.
const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

// GET /api/me/nudge
// Restituisce l'invito a donare NON ancora visto (seen_at IS NULL), se c'è.
// { nudge: null } se non c'è nulla da mostrare. L'utente lo vede una volta sola.
const getMyNudge: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db, donationNudgesTable } = await import("@workspace/db");
    const [row] = await db
      .select()
      .from(donationNudgesTable)
      .where(and(eq(donationNudgesTable.userId, session.userId), isNull(donationNudgesTable.seenAt)))
      .limit(1);
    res.json({
      nudge: row ? { sentAt: row.sentAt.toISOString() } : null,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/me/nudge/seen
// Segna l'invito come visto (sia che l'utente clicchi "Sostieni" sia "No
// grazie"): in entrambi i casi è consumato e non riappare più.
const markMyNudgeSeen: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;
    const { db, donationNudgesTable } = await import("@workspace/db");
    await db
      .update(donationNudgesTable)
      .set({ seenAt: new Date() })
      .where(and(eq(donationNudgesTable.userId, session.userId), isNull(donationNudgesTable.seenAt)));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/nudge", getMyNudge);
router.post("/nudge/seen", markMyNudgeSeen);

export default router;
