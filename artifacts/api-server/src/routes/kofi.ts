import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

// Webhook Ko-fi — riceve le donazioni spontanee e le salva.
//
// COME FUNZIONA: Ko-fi invia un POST application/x-www-form-urlencoded con un
// singolo campo `data` = stringa JSON (vedi https://ko-fi.com/manage/webhooks).
// Dentro c'è un `verification_token` che DEVE combaciare con KOFI_VERIFICATION_TOKEN
// (env): così solo Ko-fi può scrivere. Idempotente: `message_id` è UNIQUE in DB,
// quindi ritentativi di consegna non creano doppioni.
//
// L'app è 100% gratuita: nessun pagamento passa da qui. Salviamo solo per il
// pannello admin (sola lettura). Rispondiamo SEMPRE 200 quando la firma è valida:
// Ko-fi, se riceve errore, ritenta — ma un payload malformato non è colpa sua,
// quindi lo logghiamo e chiudiamo comunque per non farci martellare di retry.

const router: IRouter = Router();

interface KofiPayload {
  verification_token?: string;
  message_id?: string;
  timestamp?: string;
  type?: string; // "Donation" | "Subscription" | "Shop Order" | "Commission"
  from_name?: string;
  message?: string | null;
  amount?: string; // es. "3.00"
  currency?: string; // es. "EUR"
  is_public?: boolean;
  kofi_transaction_id?: string;
}

router.post("/webhook", async (req, res) => {
  const expected = process.env.KOFI_VERIFICATION_TOKEN?.trim();

  // Se il token non è configurato lato server, il webhook è "spento": rifiutiamo
  // in modo esplicito (meglio di un 200 che darebbe l'illusione di funzionare).
  if (!expected) {
    logger.warn("[kofi] webhook chiamato ma KOFI_VERIFICATION_TOKEN non configurato");
    res.status(503).json({ error: "KOFI_NOT_CONFIGURED" });
    return;
  }

  // Ko-fi manda { data: "<json string>" }. Fallback: alcuni test mandano il JSON
  // direttamente nel body.
  const raw = typeof req.body?.data === "string" ? req.body.data : null;
  let payload: KofiPayload;
  try {
    payload = raw ? JSON.parse(raw) : (req.body as KofiPayload);
  } catch {
    logger.warn("[kofi] payload non parsabile");
    res.status(400).json({ error: "BAD_PAYLOAD" });
    return;
  }

  // Verifica firma: token deve combaciare.
  if (payload.verification_token !== expected) {
    logger.warn("[kofi] verification_token non valido");
    res.status(401).json({ error: "BAD_TOKEN" });
    return;
  }

  if (!payload.message_id || !payload.amount) {
    logger.warn("[kofi] payload senza message_id/amount");
    res.status(400).json({ error: "INCOMPLETE_PAYLOAD" });
    return;
  }

  try {
    const { db, donationsTable } = await import("@workspace/db");
    await db
      .insert(donationsTable)
      .values({
        kofiMessageId: payload.message_id,
        fromName: payload.from_name ?? null,
        message: payload.message ?? null,
        amount: payload.amount,
        currency: (payload.currency ?? "EUR").toUpperCase(),
        type: payload.type ?? null,
        kofiTransactionId: payload.kofi_transaction_id ?? null,
        isPublic: payload.is_public === undefined ? null : String(payload.is_public),
        raw: payload as unknown as Record<string, unknown>,
      })
      // Idempotenza: stesso message_id → non re-inserire (Ko-fi può ritentare).
      .onConflictDoNothing({ target: donationsTable.kofiMessageId });

    logger.info(`[kofi] donazione registrata: ${payload.amount} ${payload.currency ?? "EUR"}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[kofi] errore salvataggio donazione");
    res.status(500).json({ error: "SAVE_FAILED" });
  }
});

export default router;
