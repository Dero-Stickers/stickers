import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import { activateDemo, getDemoStatus } from "./auth";
import albumsRouter from "./albums";
import userAlbumsRouter from "./user-albums";
import matchesRouter from "./matches";
import chatsRouter from "./chats";
import adminRouter from "./admin";
import settingsRouter from "./settings";
import errorsRouter from "./errors";

const router: IRouter = Router();

router.use(healthRouter);

// Auth routes
router.use("/auth", authRouter);
router.post("/demo/activate", activateDemo);
router.get("/demo/status", getDemoStatus);

// Albums (public + admin)
router.use("/albums", albumsRouter);

// User-specific routes
router.use("/user", userAlbumsRouter);

// Match routes
router.use("/matches", matchesRouter);

// Chat routes
router.use("/chats", chatsRouter);

// Admin routes
router.use("/admin", adminRouter);

// Settings routes
router.use("/settings", settingsRouter);

// Error reports (user opt-in submission + admin management)
router.use(errorsRouter);

export default router;
