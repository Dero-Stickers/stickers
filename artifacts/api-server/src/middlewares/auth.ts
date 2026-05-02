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
