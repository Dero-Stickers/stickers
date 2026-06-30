import { Router } from "express";
import {
  LoginBody,
  RecoverAccountBody,
  GetRecoveryCodeBody,
} from "@workspace/api-zod";
import type { RequestHandler } from "express";
import {
  signToken,
  hashPin,
  verifyPin,
  verifyAnswer,
  checkRateLimit,
  resetRateLimit,
} from "../lib/auth";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { isChatPaywallEnabled } from "../lib/billing";
import { invalidateUser } from "../lib/matchCache";
import { verifySupabaseToken, isSupabaseAuthConfigured } from "../lib/supabase-auth";

const PIN_REGEX = /^\d{4,6}$/;

// Nickname: 5–12 caratteri (lettere, numeri, - o _), normalizzato a forma
// canonica "iniziale maiuscola + resto minuscolo" (es. "marco-bo" -> "Marco-bo").
// DEVE essere ALFANUMERICO MISTO: almeno una lettera E almeno un numero (no solo
// lettere, no solo numeri) — più robusto e meno confondibile.
// Login e recupero confrontano sempre in lower(), quindi l'accesso resta
// case-insensitive anche se l'utente digita maiuscole/minuscole diverse.
const NICKNAME_REGEX = /^[A-Za-z0-9_-]{5,12}$/;
const NICKNAME_HAS_LETTER = /[A-Za-z]/;
const NICKNAME_HAS_DIGIT = /[0-9]/;
const NICKNAME_MSG =
  "Il nickname deve avere 5-12 caratteri con almeno una lettera e un numero (ammessi - e _)";
const canonicalNickname = (s: string): string => {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};
const NicknameSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(NICKNAME_REGEX, NICKNAME_MSG))
  .refine((s) => NICKNAME_HAS_LETTER.test(s) && NICKNAME_HAS_DIGIT.test(s), NICKNAME_MSG)
  .transform(canonicalNickname);

// For LOGIN we still need to accept legacy mixed-case nicknames stored in
// the DB, so we only normalize (lowercase + trim) without enforcing the
// stricter 5–15 alphanumeric rule that applies to NEW nicknames.
const LoginNicknameSchema = z
  .string()
  .trim()
  .transform(s => s.toLowerCase())
  .pipe(z.string().min(1).max(64));

// Recupero account: ora basato sul SOLO nickname (unico in tutta l'app).
// Il CAP non serve più — non fa più parte dell'identità.
const RecoverLookupBody = z.object({
  nickname: LoginNicknameSchema,
});

const RecoverAnswerBody = z.object({
  nickname: LoginNicknameSchema,
  securityAnswer: z.string().min(1),
  newPin: z.string().regex(PIN_REGEX, "Il PIN deve essere di 4-6 cifre numeriche"),
});

// Cambio zona di ricerca: il CAP è ora solo geografia, modificabile a piacere
// (es. quando l'utente è in un'altra città). 5 cifre numeriche.
const CAP_REGEX = /^\d{5}$/;
const ChangeLocationBody = z.object({
  cap: z.string().regex(CAP_REGEX, "Il CAP deve essere di 5 cifre"),
});

// Deriva l'area leggibile dal CAP. Unica fonte, riusata da registrazione e
// cambio zona, così CAP e area non vanno mai fuori sincrono.
// 1) match esatto su zone note; 2) fallback sul prefisso provincia (prime 2
// cifre ≈ provincia in Italia); 3) generico se sconosciuto.
const AREA_MAP: Record<string, string> = {
  "20100": "Milano Nord", "20121": "Milano Centro", "20135": "Milano Sud",
  "20151": "Milano Ovest", "20137": "Milano Est", "00100": "Roma Centro",
  "00118": "Roma Nord", "10100": "Torino Centro", "40100": "Bologna",
};
const AREA_PREFIX: Record<string, string> = {
  "00": "Roma", "09": "Cagliari", "10": "Torino", "16": "Genova",
  "20": "Milano", "30": "Venezia", "34": "Trieste", "35": "Padova",
  "37": "Verona", "40": "Bologna", "41": "Modena", "43": "Parma",
  "47": "Forlì-Cesena", "50": "Firenze", "60": "Ancona", "70": "Bari",
  "80": "Napoli", "90": "Palermo", "95": "Catania",
};
function deriveArea(cap: string): string {
  return AREA_MAP[cap] || AREA_PREFIX[cap.slice(0, 2)] || `Area ${cap.slice(0, 2)}XXX`;
}

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 5;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const DELETE_MAX_ATTEMPTS = 5;
const DELETE_WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: { ip?: string }): string {
  return req.ip || "unknown";
}

const router = Router();

async function userPayload(user: any) {
  // Nuovo modello "paga per sbloccare la chat":
  //  - paywallEnabled riflette il master switch app_settings chat_paywall_enabled;
  //  - hasAllChats = isPremium (l'utente ha sbloccato TUTTE le chat).
  const paywallEnabled = await isChatPaywallEnabled();
  return {
    id: user.id,
    nickname: user.nickname,
    cap: user.cap,
    area: user.area,
    isPremium: user.isPremium,
    paywallEnabled,
    hasAllChats: user.isPremium,
    exchangesCompleted: user.exchangesCompleted,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

// NB: la registrazione con nickname+PIN è stata RITIRATA. I nuovi account si
// creano solo con Google o Email (Supabase Auth → `social`/`socialComplete`).
// Restano attivi login e recupero per gli account storici già esistenti.

// POST /api/auth/login
const login: RequestHandler = async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);
    // Normalize nickname (lowercase + trim) so users typing it with capitals
    // still match. Legacy DB rows may have mixed case so we compare with lower().
    const nickname = LoginNicknameSchema.parse(body.nickname);

    const ip = clientIp(req);
    const rateKey = `login:${ip}:${nickname}`;
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
    const { sql } = await import("drizzle-orm");

    // Nickname unico in tutta l'app → login con solo nickname + PIN.
    // Confronto case-insensitive: le maiuscole/minuscole digitate non contano.
    const usersFound = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.nickname}) = ${nickname}`);

    let user: typeof usersFound[number] | undefined;
    for (const u of usersFound) {
      // Utenti social (Google/email) non hanno PIN: salta il confronto.
      if (u.pinHash && (await verifyPin(body.pin, u.pinHash))) {
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
      user: await userPayload(user),
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
      user: await userPayload(user),
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

    res.json(await userPayload(user));
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
    if (!user || !user.pinHash || !(await verifyPin(body.pin, user.pinHash))) {
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

// GET /api/auth/me/export — GDPR Art.20 portabilità dati
const exportMe: RequestHandler = async (req, res) => {
  try {
    const session = req.session!;
    const { db } = await import("@workspace/db");
    const {
      usersTable,
      chatsTable,
      messagesTable,
      userAlbumsTable,
      userStickersTable,
    } = await import("@workspace/db");
    const { eq, or } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const chats = await db.select().from(chatsTable).where(or(eq(chatsTable.user1Id, user.id), eq(chatsTable.user2Id, user.id)));
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.senderId, user.id));
    const userAlbums = await db.select().from(userAlbumsTable).where(eq(userAlbumsTable.userId, user.id));
    const userStickers = await db.select().from(userStickersTable).where(eq(userStickersTable.userId, user.id));

    res.setHeader("Content-Disposition", `attachment; filename="stickers-data-${user.id}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        nickname: user.nickname,
        cap: user.cap,
        area: user.area,
        securityQuestion: user.securityQuestion,
        isPremium: user.isPremium,
        exchangesCompleted: user.exchangesCompleted,
        createdAt: user.createdAt,
      },
      chats,
      messagesSent: messages,
      userAlbums,
      userStickers,
      note: "PIN, codice di recupero e risposta alla domanda di sicurezza non sono inclusi per motivi di sicurezza.",
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// DELETE /api/auth/me — GDPR Art.17 diritto alla cancellazione
const deleteMe: RequestHandler = async (req, res) => {
  try {
    const session = req.session!;
    const { confirm, pin } = req.body ?? {};
    if (confirm !== "ELIMINA") {
      res.status(400).json({ error: "CONFIRM_REQUIRED", message: "Conferma cancellazione mancante" });
      return;
    }

    const ip = clientIp(req);
    const rateKey = `delete:${session.userId}:${ip}`;
    const limit = checkRateLimit(rateKey, DELETE_MAX_ATTEMPTS, DELETE_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "RATE_LIMITED",
        message: `Troppi tentativi. Riprova fra ${retryAfter}s.`,
      });
      return;
    }

    const { db } = await import("@workspace/db");
    const {
      usersTable,
      reportsTable,
      adminActionsTable,
    } = await import("@workspace/db");
    const { eq, or } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    if (user.isAdmin) {
      res.status(403).json({ error: "ADMIN_CANNOT_SELF_DELETE", message: "Un account admin non può essere eliminato in autonomia." });
      return;
    }

    if (!pin || !user.pinHash || !(await verifyPin(String(pin), user.pinHash))) {
      res.status(401).json({ error: "WRONG_PIN", message: "PIN non corretto" });
      return;
    }

    resetRateLimit(rateKey);

    // Pulizia tabelle senza cascade
    await db.delete(reportsTable).where(or(eq(reportsTable.reporterId, user.id), eq(reportsTable.reportedUserId, user.id)));
    await db.delete(adminActionsTable).where(or(eq(adminActionsTable.adminUserId, user.id), eq(adminActionsTable.targetUserId, user.id)));

    // Cancella utente (cascade: chats, messages, user_albums, user_stickers)
    await db.delete(usersTable).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "Account eliminato definitivamente." });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/recover/lookup — returns the security question for a given nickname+cap
const recoverLookup: RequestHandler = async (req, res) => {
  try {
    const body = RecoverLookupBody.parse(req.body);

    const ip = clientIp(req);
    const rateKey = `recover-lookup:${ip}`;
    const limit = checkRateLimit(rateKey, RECOVERY_MAX_ATTEMPTS, RECOVERY_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "RATE_LIMITED",
        message: `Troppi tentativi. Riprova fra ${retryAfter}s.`,
      });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.nickname}) = ${body.nickname}`)
      .limit(1);

    // Anti-enumeration: same shape & status code whether the user exists or not.
    // The security-question feature inherently requires showing the question to a
    // legitimate user; abuse is mitigated by rate limiting (5 / 15min per IP) and
    // by the answer-verification step that follows.
    if (!user) {
      res.status(200).json({ securityQuestion: null });
      return;
    }

    res.json({ securityQuestion: user.securityQuestion });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Dati non validi" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/recover/answer — reset PIN by answering the security question
const recoverAnswer: RequestHandler = async (req, res) => {
  try {
    const body = RecoverAnswerBody.parse(req.body);

    const ip = clientIp(req);
    const rateKey = `recover-answer:${ip}:${body.nickname}`;
    const limit = checkRateLimit(rateKey, RECOVERY_MAX_ATTEMPTS, RECOVERY_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "RATE_LIMITED",
        message: `Troppi tentativi. Riprova fra ${retryAfter}s.`,
      });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, sql } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.nickname}) = ${body.nickname}`)
      .limit(1);

    if (!user || !user.securityAnswerHash || !(await verifyAnswer(body.securityAnswer, user.securityAnswerHash))) {
      res.status(401).json({ error: "WRONG_ANSWER", message: "Risposta non corretta" });
      return;
    }

    await db
      .update(usersTable)
      .set({ pinHash: await hashPin(body.newPin) })
      .where(eq(usersTable.id, user.id));

    resetRateLimit(rateKey);

    res.json({
      user: await userPayload(user),
      token: signToken({ userId: user.id, isAdmin: user.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Dati non validi" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// NOTA: la modifica del nickname è stata RIMOSSA di proposito (giu 2026).
// Il nickname è l'identità pubblica permanente: si sceglie una volta in
// registrazione (con conferma) e non è più modificabile — app più pulita e
// sicura (niente impersonificazione di nomi appena liberati). Vedi DNA 18.

// PATCH /api/auth/me/location — cambia il CAP = zona di ricerca match.
// Il CAP è solo geografia (non più identità): basta l'autenticazione, niente PIN.
// Ricalcola l'area così CAP e area restano sempre allineati.
const changeLocation: RequestHandler = async (req, res) => {
  try {
    const body = ChangeLocationBody.parse(req.body);
    const session = req.session!;

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [updated] = await db
      .update(usersTable)
      .set({ cap: body.cap, area: deriveArea(body.cap) })
      .where(eq(usersTable.id, session.userId))
      .returning();

    if (!updated) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    invalidateUser(session.userId); // la zona influisce sulle distanze dei match → invalida cache

    res.json({ user: await userPayload(updated) });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "CAP non valido (5 cifre)" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// ---------------------------------------------------------------------------
// Accesso social (Google / Email via Supabase Auth)
// ---------------------------------------------------------------------------

const SocialBody = z.object({
  accessToken: z.string().min(10).max(4096),
});

const SocialCompleteBody = z.object({
  accessToken: z.string().min(10).max(4096),
  nickname: NicknameSchema,
  cap: z.string().regex(CAP_REGEX, "Il CAP deve essere di 5 cifre"),
  acceptTerms: z.literal(true),
});

// POST /api/auth/social — verifica il token Supabase. Se l'utente esiste già
// (collegato per supabaseUserId o email), effettua il login e ritorna il nostro
// token. Altrimenti risponde 200 { needsProfile: true } così il frontend mostra
// la schermata "Completa profilo".
const social: RequestHandler = async (req, res) => {
  try {
    if (!isSupabaseAuthConfigured()) {
      res.status(503).json({ error: "SOCIAL_UNAVAILABLE", message: "Accesso social non disponibile" });
      return;
    }
    const { accessToken } = SocialBody.parse(req.body);

    const ip = clientIp(req);
    const limit = checkRateLimit(`social:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "RATE_LIMITED", message: `Troppi tentativi. Riprova fra ${retryAfter}s.` });
      return;
    }

    const identity = await verifySupabaseToken(accessToken);
    if (!identity) {
      res.status(401).json({ error: "INVALID_TOKEN", message: "Accesso non valido" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, or, sql } = await import("drizzle-orm");

    // Cerca per supabaseUserId (collegamento certo) o per email (riconciliazione).
    const emailLower = identity.email?.toLowerCase() ?? null;
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(
        emailLower
          ? or(eq(usersTable.supabaseUserId, identity.supabaseUserId), sql`lower(${usersTable.email}) = ${emailLower}`)
          : eq(usersTable.supabaseUserId, identity.supabaseUserId),
      )
      .limit(1);

    if (!existing) {
      // Nessun account: serve scegliere nickname + CAP.
      res.json({ needsProfile: true, email: identity.email });
      return;
    }

    if (existing.isBlocked) {
      res.status(403).json({ error: "BLOCKED", message: "Account bloccato" });
      return;
    }

    // Collega/aggiorna l'identità Supabase se mancante (primo login social di un
    // account storico con stessa email, o link dell'uuid).
    if (existing.supabaseUserId !== identity.supabaseUserId || (emailLower && !existing.email)) {
      await db
        .update(usersTable)
        .set({
          supabaseUserId: identity.supabaseUserId,
          ...(emailLower && !existing.email ? { email: identity.email } : {}),
        })
        .where(eq(usersTable.id, existing.id));
    }

    res.json({
      user: await userPayload(existing),
      token: signToken({ userId: existing.id, isAdmin: existing.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Dati non validi" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// POST /api/auth/social/complete — crea l'account per un utente social al primo
// accesso: verifica di nuovo il token, valida nickname unico, salva CAP/area.
const socialComplete: RequestHandler = async (req, res) => {
  try {
    if (!isSupabaseAuthConfigured()) {
      res.status(503).json({ error: "SOCIAL_UNAVAILABLE", message: "Accesso social non disponibile" });
      return;
    }
    if (req.body?.acceptTerms !== true) {
      res.status(400).json({ error: "CONSENT_REQUIRED", message: "Devi accettare Privacy e Termini" });
      return;
    }
    const body = SocialCompleteBody.parse(req.body);

    const identity = await verifySupabaseToken(body.accessToken);
    if (!identity) {
      res.status(401).json({ error: "INVALID_TOKEN", message: "Accesso non valido" });
      return;
    }

    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, sql } = await import("drizzle-orm");

    // Se l'account esiste già (doppio invio), effettua login invece di duplicare.
    const [already] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.supabaseUserId, identity.supabaseUserId))
      .limit(1);
    if (already) {
      res.json({ user: await userPayload(already), token: signToken({ userId: already.id, isAdmin: already.isAdmin }) });
      return;
    }

    // Nickname unico (case-insensitive).
    const taken = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.nickname}) = ${body.nickname.toLowerCase()}`)
      .limit(1);
    if (taken.length > 0) {
      res.status(400).json({ error: "NICKNAME_TAKEN", message: "Nickname già in uso" });
      return;
    }

    const area = deriveArea(body.cap);
    let user;
    try {
      [user] = await db
        .insert(usersTable)
        .values({
          nickname: body.nickname,
          cap: body.cap,
          area,
          email: identity.email,
          authProvider: identity.provider === "google" ? "google" : "email",
          supabaseUserId: identity.supabaseUserId,
          isPremium: false,
          acceptedTermsAt: new Date(),
          // pinHash / securityQuestion / recoveryCode restano NULL (utente social).
        })
        .returning();
    } catch (e: any) {
      if (e?.code === "23505") {
        res.status(400).json({ error: "NICKNAME_TAKEN", message: "Nickname già in uso" });
        return;
      }
      throw e;
    }

    res.status(201).json({
      user: await userPayload(user),
      token: signToken({ userId: user.id, isAdmin: user.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Dati non validi" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

router.post("/login", login);
router.post("/social", social);
router.post("/social/complete", socialComplete);
router.post("/logout", logout);
router.post("/recover", recover);
router.post("/recover/lookup", recoverLookup);
router.post("/recover/answer", recoverAnswer);
router.get("/me", requireAuth, getMe);
router.get("/me/export", requireAuth, exportMe);
router.delete("/me", requireAuth, deleteMe);
router.patch("/me/location", requireAuth, changeLocation);
router.post("/recovery-code", requireAuth, getRecoveryCode);

export default router;
