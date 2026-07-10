import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import albumsRouter from "./albums";
import userAlbumsRouter from "./user-albums";
import matchesRouter from "./matches";
import chatsRouter from "./chats";
import chatTradeRouter from "./chat-trade";
import adminRouter from "./admin";
import settingsRouter from "./settings";
import errorsRouter from "./errors";
import kofiRouter from "./kofi";
import meRouter from "./me";
import { requireAuth, requireNotBlocked, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);

// Auth routes
router.use("/auth", authRouter);

// Albums (public + admin)
router.use("/albums", albumsRouter);

// Gate anti-blocco sulle route di AZIONE: un utente bloccato viene fermato
// subito (403 ACCOUNT_BLOCKED) anche a sessione già aperta. requireAuth popola
// req.session; requireNotBlocked verifica flag + lista nera email. NON montato
// su /auth (login/me/recupero), catalogo pubblico, admin, settings, errori.
const blockGate = [requireAuth, requireNotBlocked];

// User-specific routes
router.use("/user", ...blockGate, userAlbumsRouter);

// "Io" (utente corrente): invito a donare, ecc. Dietro il gate auth+blocco
// (un utente bloccato non deve vedere l'invito).
router.use("/me", ...blockGate, meRouter);

// Match routes
router.use("/matches", ...blockGate, matchesRouter);

// Chat routes — gate montato UNA volta sul prefisso (vale per entrambi i
// router sottostanti; montarlo due volte lo farebbe girare doppio sulle
// route di scambio: 2 query DB sprecate a chiamata).
router.use("/chats", ...blockGate);
router.use("/chats", chatsRouter);
// Conferma scambio concluso (montata sotto /chats)
router.use("/chats", chatTradeRouter);

// Admin routes — gate requireAdmin montato UNA volta sul prefisso: ogni route
// admin (presente e FUTURA) è protetta a livello router, non solo dal controllo
// per-handler. Un nuovo handler admin che dimenticasse il check resta comunque
// chiuso. La validazione interna dei singoli handler resta (difesa in profondità).
router.use("/admin", requireAdmin, adminRouter);

// Settings routes
router.use("/settings", settingsRouter);

// Webhook Ko-fi — PUBBLICO (Ko-fi non ha login): niente gate di auth/blocco. La
// sicurezza è il verification_token verificato dentro l'handler. Sola scrittura
// da parte di Ko-fi; l'app non tratta pagamenti.
router.use("/kofi", kofiRouter);

// Error reports (user opt-in submission + admin management)
router.use(errorsRouter);

export default router;
