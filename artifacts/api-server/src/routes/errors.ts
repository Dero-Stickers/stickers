import { Router, type IRouter, type RequestHandler } from "express";
import { z } from "zod/v4";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { verifyToken, checkRateLimit } from "../lib/auth";
import {
  sanitizeText,
  normalizePage,
  uaClass,
  ipPrefix,
  computeErrorHash,
} from "../lib/sanitize-error";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSession(req: any): { userId: number; isAdmin: boolean } | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return verifyToken(h.slice(7).trim());
}

async function requireAdmin(
  req: any,
  res: any,
): Promise<{ userId: number; isAdmin: boolean } | null> {
  const s = readSession(req);
  if (!s) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  if (!s.isAdmin) {
    res.status(403).json({ error: "FORBIDDEN" });
    return null;
  }
  return s;
}

const PRIORITIES = ["critical", "high", "medium", "low"] as const;
const STATUSES = ["new", "investigating", "resolved", "ignored"] as const;
const TYPES = ["user_report", "client_crash", "api_error", "other"] as const;

const reportInput = z.object({
  page: z.string().max(500).optional(),
  errorType: z.enum(TYPES).default("user_report"),
  messageClean: z.string().max(2000).optional(),
  stackTop: z.string().max(2000).optional(),
  userNote: z.string().max(500).optional(),
  appVersion: z.string().max(40).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/errors/report — user-side opt-in submission
// ---------------------------------------------------------------------------

const submitReport: RequestHandler = async (req, res) => {
  try {
    const session = readSession(req); // optional, may be null
    const ip = (req.ip ?? req.socket.remoteAddress ?? "").toString();

    // IP rate-limit: 3 / minute. User rate-limit: 10 / day.
    const ipRl = checkRateLimit(`err:ip:${ip}`, 3, 60_000);
    if (!ipRl.allowed) {
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        retryAfterMs: ipRl.retryAfterMs,
      });
      return;
    }
    if (session) {
      const userRl = checkRateLimit(
        `err:user:${session.userId}`,
        10,
        24 * 60 * 60_000,
      );
      if (!userRl.allowed) {
        res.status(429).json({
          error: "TOO_MANY_REQUESTS",
          retryAfterMs: userRl.retryAfterMs,
        });
        return;
      }
    }

    const parsed = reportInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "BAD_REQUEST" });
      return;
    }
    const body = parsed.data;

    const page = normalizePage(body.page ?? "");
    const messageClean = sanitizeText(body.messageClean ?? "", 1000);
    const stackTop = sanitizeText(body.stackTop ?? "", 1500);
    const userNote = sanitizeText(body.userNote ?? "", 500);

    if (!messageClean && !userNote) {
      res.status(400).json({ error: "EMPTY_REPORT" });
      return;
    }

    const hashSeed = messageClean || userNote || "no-msg";
    const hash = computeErrorHash(body.errorType, page, hashSeed);
    const ua = uaClass(req.headers["user-agent"] as string | undefined);
    const ipP = ipPrefix(ip);
    const appVersion = sanitizeText(body.appVersion ?? "", 40);

    const { db } = await import("@workspace/db");
    const { errorReportsTable } = await import("@workspace/db");

    // Upsert by error_hash: increment count, update last_seen_at, refresh
    // mutable fields from the latest occurrence.
    await db
      .insert(errorReportsTable)
      .values({
        errorHash: hash,
        priority: "medium",
        status: "new",
        page,
        errorType: body.errorType,
        messageClean,
        stackTop,
        uaClass: ua,
        ipPrefix: ipP,
        userId: session?.userId ?? null,
        appVersion,
        userNote,
      })
      .onConflictDoUpdate({
        target: errorReportsTable.errorHash,
        set: {
          count: sql`${errorReportsTable.count} + 1`,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          // Refresh diagnostics from the most recent occurrence so admins see
          // up-to-date stack/UA/version, not stale data from the first hit.
          messageClean,
          stackTop,
          page,
          uaClass: ua,
          appVersion,
          userNote,
          ipPrefix: ipP,
          ...(session?.userId ? { userId: session.userId } : {}),
          // Promote ignored/resolved back to "new" if it happens again.
          status: sql`CASE WHEN ${errorReportsTable.status} IN ('resolved','ignored') THEN 'new' ELSE ${errorReportsTable.status} END`,
        },
      });

    res.status(204).end();
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/errors — paginated, filterable list
// ---------------------------------------------------------------------------

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const listErrors: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const status = (req.query.status as string) || "all";
    const priority = (req.query.priority as string) || "all";
    const limit = Math.min(parseInt((req.query.limit as string) || "100", 10) || 100, 200);

    const { db } = await import("@workspace/db");
    const { errorReportsTable } = await import("@workspace/db");

    const conditions = [];
    if (status !== "all" && (STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(errorReportsTable.status, status));
    }
    if (priority !== "all" && (PRIORITIES as readonly string[]).includes(priority)) {
      conditions.push(eq(errorReportsTable.priority, priority));
    }

    const rows = await db
      .select()
      .from(errorReportsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(errorReportsTable.lastSeenAt))
      .limit(limit);

    rows.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
    });

    // Counts for the UI badges.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    const recent = await db
      .select()
      .from(errorReportsTable)
      .where(gte(errorReportsTable.lastSeenAt, since));
    const counts = {
      total: rows.length,
      new: recent.filter((r) => r.status === "new").length,
      critical: recent.filter((r) => r.priority === "critical" && r.status !== "ignored").length,
      last7d: recent.length,
    };

    res.json({
      counts,
      items: rows.map((r) => ({
        id: r.id,
        errorHash: r.errorHash,
        count: r.count,
        priority: r.priority,
        status: r.status,
        page: r.page,
        errorType: r.errorType,
        messageClean: r.messageClean,
        stackTop: r.stackTop,
        uaClass: r.uaClass,
        ipPrefix: r.ipPrefix,
        userId: r.userId,
        appVersion: r.appVersion,
        userNote: r.userNote,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/errors/:id — change status / priority / note
// ---------------------------------------------------------------------------

const patchInput = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  adminNote: z.string().max(1000).optional(),
});

const updateError: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const id = req.params.id as string;
    const parsed = patchInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "BAD_REQUEST" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { errorReportsTable } = await import("@workspace/db");

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status) set.status = parsed.data.status;
    if (parsed.data.priority) set.priority = parsed.data.priority;
    if (parsed.data.adminNote !== undefined) set.adminNote = parsed.data.adminNote;

    const [updated] = await db
      .update(errorReportsTable)
      .set(set)
      .where(eq(errorReportsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/errors/report — consolidated markdown for ChatGPT/Codex
// ---------------------------------------------------------------------------

const consolidateInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

const consolidatedReport: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const parsed = consolidateInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "BAD_REQUEST" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { errorReportsTable } = await import("@workspace/db");

    const rows = await db
      .select()
      .from(errorReportsTable)
      .where(inArray(errorReportsTable.id, parsed.data.ids));

    if (!rows.length) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    rows.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      return pa - pb;
    });

    const lines: string[] = [];
    lines.push("# Report tecnico — Sticker Matchbox");
    lines.push("");
    lines.push(`Generato: ${new Date().toISOString()}`);
    lines.push(`Segnalazioni incluse: ${rows.length}`);
    lines.push("");
    lines.push("> Tutti i dati sotto sono già sanitizzati: niente PII, niente token, niente IP completi.");
    lines.push("");
    for (const r of rows) {
      lines.push("---");
      lines.push("");
      lines.push(`## ${r.priority.toUpperCase()} — ${r.errorType}`);
      lines.push("");
      lines.push(`- **Pagina**: \`${r.page || "(sconosciuta)"}\``);
      lines.push(`- **Occorrenze**: ${r.count}`);
      lines.push(`- **Ultima volta**: ${r.lastSeenAt.toISOString()}`);
      lines.push(`- **Stato**: ${r.status}`);
      lines.push(`- **Dispositivo**: ${r.uaClass ?? "?"}`);
      if (r.appVersion) lines.push(`- **App version**: ${r.appVersion}`);
      lines.push("");
      if (r.messageClean) {
        lines.push("**Errore tecnico:**");
        lines.push("```");
        lines.push(r.messageClean);
        lines.push("```");
        lines.push("");
      }
      if (r.stackTop) {
        lines.push("**Stack:**");
        lines.push("```");
        lines.push(r.stackTop);
        lines.push("```");
        lines.push("");
      }
      if (r.userNote) {
        lines.push(`**Nota utente:** ${r.userNote}`);
        lines.push("");
      }
      if (r.adminNote) {
        lines.push(`**Nota admin:** ${r.adminNote}`);
        lines.push("");
      }
    }

    res.json({ markdown: lines.join("\n") });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.post("/errors/report", submitReport);
router.get("/admin/errors", listErrors);
router.patch("/admin/errors/:id", updateError);
router.post("/admin/errors/report", consolidatedReport);

export default router;
