import type { RequestHandler } from "express";
import { checkRateLimit } from "../lib/auth";

// Freno anti-flood GLOBALE su tutta l'API: un tetto generoso di richieste per IP,
// sopra ai limiti mirati già presenti (login/delete/social/error-report). Serve a
// contenere abusi/flood sugli endpoint autenticati oggi scoperti (match, chat) su
// un'unica istanza free. NON sostituisce la difesa volumetrica di Render/Cloudflare
// a monte: è un cuscinetto applicativo a costo zero (in-memory, riusa checkRateLimit).
//
// Tetto alto apposta: la navigazione normale dell'app (liste, chat, match) fa molte
// chiamate legittime → 240/min per IP non dà mai fastidio a un utente vero, ma taglia
// un client che martella. Chi supera riceve 429 con Retry-After.
const GLOBAL_MAX = 240; // richieste
const GLOBAL_WINDOW_MS = 60 * 1000; // per minuto

export const rateLimitGlobal: RequestHandler = (req, res, next) => {
  // req.ip è affidabile: app.ts imposta `trust proxy: 1` (vero client da Render),
  // quindi non è aggirabile con header spoofing.
  const ip = req.ip || "unknown";
  const r = checkRateLimit(`global:${ip}`, GLOBAL_MAX, GLOBAL_WINDOW_MS);
  if (!r.allowed) {
    res.setHeader("Retry-After", Math.ceil(r.retryAfterMs / 1000).toString());
    res.status(429).json({ error: "TOO_MANY_REQUESTS", message: "Troppe richieste, riprova tra poco." });
    return;
  }
  next();
};
