import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyToken, type SessionPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

function readSession(req: Request): SessionPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7).trim());
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Token mancante o non valido" });
    return;
  }
  req.session = session;
  next();
};

// Blocca ogni AZIONE se l'utente è bloccato, anche a sessione già aperta
// (il token resta valido finché non scade, ma qui lo intercettiamo subito).
// Va montato DOPO requireAuth sulle route di azione (album, chat, scambi,
// cambio profilo…), NON su /auth/me (deve poter leggere il proprio stato) né
// sulle route admin. Una query leggera per id; controlla sia il flag sulla
// riga sia la lista nera email (coerente con login/registrazione).
export const requireNotBlocked: RequestHandler = async (req, res, next) => {
  const session = req.session;
  if (!session) {
    // Difensivo: deve sempre girare dopo requireAuth.
    res.status(401).json({ error: "UNAUTHORIZED", message: "Token mancante o non valido" });
    return;
  }
  try {
    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [user] = await db
      .select({ isBlocked: usersTable.isBlocked, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "USER_NOT_FOUND", message: "Utente non trovato" });
      return;
    }
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (user.isBlocked || (await isEmailBlocked(user.email))) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }
    next();
  } catch (err) {
    (req as any).log?.error?.(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Token mancante o non valido" });
    return;
  }
  if (!session.isAdmin) {
    res.status(403).json({ error: "FORBIDDEN", message: "Privilegi admin richiesti" });
    return;
  }
  req.session = session;
  next();
};

export function getSession(req: Request, res: Response): SessionPayload | null {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Token mancante o non valido" });
    return null;
  }
  return session;
}

export type { SessionPayload, NextFunction };
