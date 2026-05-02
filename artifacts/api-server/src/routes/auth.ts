import { Router } from "express";
import {
  RegisterBody,
  LoginBody,
  RecoverAccountBody,
  GetRecoveryCodeBody,
} from "@workspace/api-zod";
import type { RequestHandler } from "express";
import {
  signToken,
  hashPin,
  verifyPin,
  hashAnswer,
  checkRateLimit,
  resetRateLimit,
} from "../lib/auth";
import { requireAuth, getSession } from "../middlewares/auth";

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 5;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: { ip?: string }): string {
  return req.ip || "unknown";
}

const router = Router();

function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `STICK-${segment()}-${segment()}-${segment()}`;
}

function computeDemoStatus(user: {
  isPremium: boolean;
  demoStartedAt: Date | null;
  demoExpiresAt: Date | null;
}): "free" | "demo_active" | "demo_expired" | "premium" {
  if (user.isPremium) return "premium";
  if (!user.demoStartedAt) return "free";
  if (user.demoExpiresAt && new Date() > user.demoExpiresAt) return "demo_expired";
  return "demo_active";
}

function userPayload(user: any) {
  return {
    id: user.id,
    nickname: user.nickname,
    cap: user.cap,
    area: user.area,
    isPremium: user.isPremium,
    demoStatus: computeDemoStatus(user),
    demoExpiresAt: user.demoExpiresAt?.toISOString() ?? null,
    exchangesCompleted: user.exchangesCompleted,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /api/auth/register
const register: RequestHandler = async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    const existing = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.nickname, body.nickname), eq(usersTable.cap, body.cap)))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "NICKNAME_TAKEN", message: "Nickname già in uso per questo CAP" });
      return;
    }

    const recoveryCode = generateRecoveryCode();
    const areaMap: Record<string, string> = {
      "20100": "Milano Nord", "20121": "Milano Centro", "20135": "Milano Sud",
      "20151": "Milano Ovest", "20137": "Milano Est", "00100": "Roma Centro",
      "00118": "Roma Nord", "10100": "Torino Centro", "40100": "Bologna",
    };
    const area = areaMap[body.cap] || `Area ${body.cap.slice(0, 2)}XXX`;

    const [user] = await db
      .insert(usersTable)
      .values({
        nickname: body.nickname,
        pinHash: await hashPin(body.pin),
        cap: body.cap,
        area,
        securityQuestion: body.securityQuestion,
        securityAnswerHash: await hashAnswer(body.securityAnswer),
        recoveryCode,
        isPremium: false,
      })
      .returning();

    res.status(201).json({
      user: userPayload(user),
      token: signToken({ userId: user.id, isAdmin: user.isAdmin }),
      recoveryCode,
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (err as any)?.message });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/login
const login: RequestHandler = async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);

    const ip = clientIp(req);
    const rateKey = `login:${ip}:${body.nickname.toLowerCase()}`;
    const limit = checkRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "RATE_LIMITED",
        message: `Troppi tentativi di login. Riprova fra ${retryAfter}s.`,
      });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    let usersFound;
    if (body.cap) {
      usersFound = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.nickname, body.nickname), eq(usersTable.cap, body.cap)));
    } else {
      usersFound = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.nickname, body.nickname));
    }

    let user: typeof usersFound[number] | undefined;
    for (const u of usersFound) {
      if (await verifyPin(body.pin, u.pinHash)) {
        user = u;
        break;
      }
    }

    if (!user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Nickname o PIN non validi" });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }

    resetRateLimit(rateKey);

    res.json({
      user: userPayload(user),
      token: signToken({ userId: user.id, isAdmin: user.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (err as any)?.message });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

const logout: RequestHandler = async (_req, res) => {
  res.json({ success: true, message: "Disconnesso" });
};

// POST /api/auth/recover
const recover: RequestHandler = async (req, res) => {
  try {
    const body = RecoverAccountBody.parse(req.body);

    const ip = clientIp(req);
    const rateKey = `recover:${ip}`;
    const limit = checkRateLimit(rateKey, RECOVERY_MAX_ATTEMPTS, RECOVERY_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "RATE_LIMITED",
        message: `Troppi tentativi di recupero. Riprova fra ${retryAfter}s.`,
      });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.recoveryCode, body.recoveryCode))
      .limit(1);

    if (!user) {
      res.status(400).json({ error: "INVALID_CODE", message: "Codice di recupero non valido" });
      return;
    }

    await db
      .update(usersTable)
      .set({ pinHash: await hashPin(body.newPin) })
      .where(eq(usersTable.id, user.id));

    resetRateLimit(rateKey);

    res.json({
      user: userPayload(user),
      token: signToken({ userId: user.id, isAdmin: user.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (err as any)?.message });
      return;
    }
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// GET /api/auth/me
const getMe: RequestHandler = async (req, res) => {
  try {
    const session = req.session!;

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "USER_NOT_FOUND", message: "Utente non trovato" });
      return;
    }

    res.json(userPayload(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/recovery-code
const getRecoveryCode: RequestHandler = async (req, res) => {
  try {
    const body = GetRecoveryCodeBody.parse(req.body);
    const session = req.session!;

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || !(await verifyPin(body.pin, user.pinHash))) {
      res.status(401).json({ error: "WRONG_PIN", message: "PIN non corretto" });
      return;
    }

    res.json({ recoveryCode: user.recoveryCode });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// POST /api/demo/activate
export const activateDemo: RequestHandler = async (req, res) => {
  try {
    const session = getSession(req, res);
    if (!session) return;

    const { db } = await import("@workspace/db");
    const { usersTable, appSettingsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    if (user.isPremium || user.demoStartedAt) {
      res.json({
        demoStatus: computeDemoStatus(user),
        demoStartedAt: user.demoStartedAt?.toISOString() ?? null,
        demoExpiresAt: user.demoExpiresAt?.toISOString() ?? null,
        isPremium: user.isPremium,
      });
      return;
    }

    const [setting] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "demo_hours")).limit(1);
    const hours = setting ? parseInt(setting.value, 10) : 24;
    const now = new Date();
    const expires = new Date(now.getTime() + hours * 3600 * 1000);

    await db.update(usersTable).set({ demoStartedAt: now, demoExpiresAt: expires }).where(eq(usersTable.id, user.id));

    res.json({
      demoStatus: "demo_active",
      demoStartedAt: now.toISOString(),
      demoExpiresAt: expires.toISOString(),
      isPremium: false,
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/demo/status
export const getDemoStatus: RequestHandler = async (req, res) => {
  try {
    const session = getSession(req, res);
    if (!session) return;

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    res.json({
      demoStatus: computeDemoStatus(user),
      demoStartedAt: user.demoStartedAt?.toISOString() ?? null,
      demoExpiresAt: user.demoExpiresAt?.toISOString() ?? null,
      isPremium: user.isPremium,
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/recover", recover);
router.get("/me", requireAuth, getMe);
router.post("/recovery-code", requireAuth, getRecoveryCode);

export default router;
