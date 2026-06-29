import { Router } from "express";
import type { RequestHandler } from "express";
import { getSession } from "../middlewares/auth";

const router = Router();

const requireAuth = async (req: any, res: any) => getSession(req, res);

/**
 * POST /api/billing/checkout — avvia il checkout per sbloccare la chat.
 *
 * Modello "paga per sbloccare la chat":
 *  - kind='single' → sblocca la chat verso `otherUserId` (una coppia);
 *  - kind='all'    → sblocca TUTTE le chat (a vita).
 *
 * STATO ATTUALE: STUB. Nessun pagamento reale viene effettuato. La rotta
 * valida il body e risponde { status: 'not_configured' }: l'integrazione con
 * un provider (PayPal/Stripe/simili) è un tassello FUTURO.
 *
 * REGOLA D'ORO: lo sblocco effettivo (grantChatUnlock / grantAllChats in
 * ../lib/billing) NON va MAI concesso da qui né dal client. Va concesso SOLO
 * dal webhook del provider, dopo conferma reale del pagamento (vedi TODO).
 */
const checkout: RequestHandler = async (req, res) => {
  try {
    const session = await requireAuth(req, res);
    if (!session) return;

    const kind = req.body?.kind as "single" | "all" | undefined;
    if (kind !== "single" && kind !== "all") {
      res.status(400).json({ error: "INVALID_BODY", message: "kind deve essere 'single' o 'all'" });
      return;
    }

    const otherUserId = req.body?.otherUserId as number | undefined;
    if (kind === "single" && (!otherUserId || isNaN(Number(otherUserId)))) {
      res.status(400).json({ error: "INVALID_BODY", message: "otherUserId richiesto per kind='single'" });
      return;
    }

    // TODO PAGAMENTI REALI — qui andrà l'integrazione col provider:
    //  1) leggere il prezzo da app_settings (price_single_cents / price_all_cents,
    //     paywall_currency) — importi SEMPRE in centesimi interi;
    //  2) creare una riga `payments` (status='pending') e ottenere dal provider
    //     un URL di checkout, da restituire qui come { status, url };
    //  3) NON sbloccare nulla adesso: lo sblocco si concede SOLO nel webhook,
    //     a pagamento confermato, chiamando:
    //       - grantChatUnlock(session.userId, otherUserId, paymentId)  per 'single'
    //       - grantAllChats(session.userId)                            per 'all'
    //     (entrambe in ../lib/billing, idempotenti, solo lato server).
    res.status(200).json({ status: "not_configured" });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.post("/checkout", checkout);

export default router;
