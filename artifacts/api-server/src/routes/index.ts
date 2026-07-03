import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import albumsRouter from "./albums";
import userAlbumsRouter from "./user-albums";
import matchesRouter from "./matches";
import chatsRouter from "./chats";
import chatTradeRouter from "./chat-trade";
import billingRouter from "./billing";
import adminRouter from "./admin";
import settingsRouter from "./settings";
import errorsRouter from "./errors";
import { requireAuth, requireNotBlocked } from "../middlewares/auth";

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

// Match routes
router.use("/matches", ...blockGate, matchesRouter);

// Chat routes — gate montato UNA volta sul prefisso (vale per entrambi i
// router sottostanti; montarlo due volte lo farebbe girare doppio sulle
// route di scambio: 2 query DB sprecate a chiamata).
router.use("/chats", ...blockGate);
router.use("/chats", chatsRouter);
// Conferma scambio concluso (montata sotto /chats)
router.use("/chats", chatTradeRouter);

// Billing routes (sblocco chat a pagamento — stub finché il provider non è collegato)
router.use("/billing", ...blockGate, billingRouter);

// Admin routes
router.use("/admin", adminRouter);

// Settings routes
router.use("/settings", settingsRouter);

// Error reports (user opt-in submission + admin management)
router.use(errorsRouter);

export default router;
