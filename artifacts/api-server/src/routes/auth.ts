import { Router } from "express";
import {
  RegisterBody,
  LoginBody,
  RecoverAccountBody,
  GetRecoveryCodeBody,
} from "@workspace/api-zod";
import type { RequestHandler } from "express";

const router = Router();

function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `STICK-${segment()}-${segment()}-${segment()}`;
}

function hashPin(pin: string): string {
  // Simple hash for mock/dev — replace with bcrypt in production
  return Buffer.from(pin + "sticker_salt").toString("base64");
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
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

// POST /api/auth/register
const register: RequestHandler = async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    // Check if nickname+cap combo already exists
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
        pinHash: hashPin(body.pin),
        cap: body.cap,
        area,
        securityQuestion: body.securityQuestion,
        securityAnswerHash: Buffer.from(body.securityAnswer.toLowerCase()).toString("base64"),
        recoveryCode,
        isPremium: false,
      })
      .returning();

    const session = { userId: user.id, isAdmin: user.isAdmin };

    res.status(201).json({
      user: {
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
      },
      token: Buffer.from(JSON.stringify(session)).toString("base64"),
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

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    // Search by nickname (+ optional CAP for disambiguation)
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

    const user = usersFound.find(u => verifyPin(body.pin, u.pinHash));

    if (!user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Nickname o PIN non validi" });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }

    const session = { userId: user.id, isAdmin: user.isAdmin };
    res.json({
      user: {
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
      },
      token: Buffer.from(JSON.stringify(session)).toString("base64"),
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

// POST /api/auth/logout
const logout: RequestHandler = async (req, res) => {
  res.json({ success: true, message: "Disconnesso" });
};

// POST /api/auth/recover
const recover: RequestHandler = async (req, res) => {
  try {
    const body = RecoverAccountBody.parse(req.body);

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
      .set({ pinHash: hashPin(body.newPin) })
      .where(eq(usersTable.id, user.id));

    res.json({
      user: {
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
      },
      token: Buffer.from(JSON.stringify({ userId: user.id, isAdmin: user.isAdmin })).toString("base64"),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (err as any)?.message });
      return;
    }
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// GET /api/auth/me — requires auth token in Authorization header
const getMe: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Non autenticato" });
      return;
    }

    let session: { userId: number; isAdmin: boolean };
    try {
      session = JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString());
    } catch {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Token non valido" });
      return;
    }

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

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/recovery-code
const getRecoveryCode: RequestHandler = async (req, res) => {
  try {
    const body = GetRecoveryCodeBody.parse(req.body);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    let session: { userId: number };
    try {
      session = JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString());
    } catch {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || !verifyPin(body.pin, user.pinHash)) {
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
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }
    let session: { userId: number };
    try { session = JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString()); }
    catch { res.status(401).json({ error: "UNAUTHORIZED" }); return; }

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
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/demo/status
export const getDemoStatus: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }
    let session: { userId: number };
    try { session = JSON.parse(Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString()); }
    catch { res.status(401).json({ error: "UNAUTHORIZED" }); return; }

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
router.get("/me", getMe);
router.post("/recovery-code", getRecoveryCode);

export default router;
