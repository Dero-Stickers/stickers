import { Router } from "express";
import { LoginBody } from "@workspace/api-zod";
import type { RequestHandler } from "express";
import {
  signToken,
  verifyPin,
  hashPin,
  checkRateLimit,
  resetRateLimit,
} from "../lib/auth";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { invalidateUser } from "../lib/matchCache";
import { verifySupabaseToken, isSupabaseAuthConfigured } from "../lib/supabase-auth";
import { provinceFromCap } from "../lib/cap-provinces";

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

// Cambio zona di ricerca: il CAP è ora solo geografia, modificabile a piacere
// (es. quando l'utente è in un'altra città). 5 cifre numeriche.
const CAP_REGEX = /^\d{5}$/;
const ChangeLocationBody = z.object({
  cap: z.string().regex(CAP_REGEX, "Il CAP deve essere di 5 cifre"),
});

// Deriva l'area leggibile dal CAP. Unica fonte, riusata da registrazione e
// cambio zona, così CAP e area non vanno mai fuori sincrono.
// 1) zone note precise (macro-quartieri di grandi città); 2) provincia dal
// prefisso CAP (copre tutti i CAP italiani, vedi lib/cap-provinces.ts);
// 3) generico se davvero sconosciuto. NB: solo etichetta — il match usa il CAP.
const AREA_MAP: Record<string, string> = {
  "20100": "Milano Nord", "20121": "Milano Centro", "20135": "Milano Sud",
  "20151": "Milano Ovest", "20137": "Milano Est", "00100": "Roma Centro",
  "00118": "Roma Nord", "10100": "Torino Centro", "40100": "Bologna",
};
function deriveArea(cap: string): string {
  return AREA_MAP[cap] || provinceFromCap(cap) || `Area ${cap.slice(0, 2)}XXX`;
}

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const DELETE_MAX_ATTEMPTS = 5;
const DELETE_WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: { ip?: string }): string {
  return req.ip || "unknown";
}

const router = Router();

async function userPayload(user: any, underReview = false) {
  // App 100% gratuita: nessun campo a pagamento nel profilo. underReview è
  // calcolato solo in getMe (non a ogni login) per il banner "sotto revisione".
  return {
    id: user.id,
    nickname: user.nickname,
    cap: user.cap,
    area: user.area,
    exchangesCompleted: user.exchangesCompleted,
    isAdmin: user.isAdmin,
    underReview,
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
    // Validazione formato PIN anche in INGRESSO al login (oltre a changeCredentials):
    // il PIN è solo numerico 4-6 cifre. Rifiuta subito input anomali prima di
    // arrivare a scrypt (uniforma le regole, riduce input malformati).
    if (!/^\d{4,6}$/.test(body.pin)) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Nickname o PIN non corretti." });
      return;
    }

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

    // Blocco: sia il flag sulla riga sia la lista nera email (a prova di
    // aggiramento). Stesso codice ACCOUNT_BLOCKED → il frontend mostra la
    // schermata "Account bloccato" con il contatto di supporto.
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (user.isBlocked || (await isEmailBlocked(user.email))) {
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

// GET /api/auth/me
const getMe: RequestHandler = async (req, res) => {
  try {
    const session = req.session!;

    const { db } = await import("@workspace/db");
    const { usersTable, reportsTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "USER_NOT_FOUND", message: "Utente non trovato" });
      return;
    }

    // Avviso generico "sotto revisione": vero se esiste almeno una segnalazione
    // pendente a carico dell'utente. Non rivela chi ha segnalato né quale chat.
    const [pending] = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(and(eq(reportsTable.reportedUserId, user.id), eq(reportsTable.status, "pending")))
      .limit(1);

    res.json(await userPayload(user, Boolean(pending)));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
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

    // Route sotto /auth (fuori dal gate globale): blocca anche qui. Il diritto
    // GDPR all'esportazione resta esercitabile via supporto (contatto in-app).
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (user.isBlocked || (await isEmailBlocked(user.email))) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }

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
    const { confirm } = req.body ?? {};
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

    // Un utente bloccato NON può auto-eliminarsi: chiuderebbe la scappatoia
    // "mi cancello e mi re-iscrivo pulito". Deve restare bloccato e contattare
    // il supporto. La lista nera email sopravvive comunque alla cancellazione,
    // ma qui evitiamo del tutto la cancellazione di un account sotto blocco.
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (user.isBlocked || (await isEmailBlocked(user.email))) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }

    if (user.isAdmin) {
      res.status(403).json({ error: "ADMIN_CANNOT_SELF_DELETE", message: "Un account admin non può essere eliminato in autonomia." });
      return;
    }

    // Identità già garantita dal token di sessione (requireAuth) + conferma
    // "ELIMINA" digitata. Nessun secondo fattore PIN: gli account social non ne
    // hanno, e per gli storici la conferma esplicita è sufficiente.
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

    // Route sotto /auth (non passa dal gate globale): controlla il blocco qui.
    const [me] = await db
      .select({ isBlocked: usersTable.isBlocked, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (me && (me.isBlocked || (await isEmailBlocked(me.email)))) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato. Contatta il supporto." });
      return;
    }

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

// PATCH /api/auth/me/credentials — cambia nickname e/o PIN dell'account
// corrente (usato dall'admin da Impostazioni). Richiede il PIN ATTUALE come
// conferma (l'account deve avere un PIN: utenti social non ne hanno). Almeno
// uno tra newNickname / newPin dev'essere presente.
const ChangeCredentialsBody = z
  .object({
    currentPin: z.string().min(4).max(6),
    newNickname: z.string().trim().min(3).max(15).optional(),
    // Nuovi PIN: 6 cifre esatte (regola corrente). La VERIFICA di PIN esistenti
    // (currentPin sopra, login) resta 4-6 per non escludere account storici.
    newPin: z.string().regex(/^\d{6}$/, "Il PIN deve avere 6 cifre").optional(),
  })
  .refine((b) => b.newNickname || b.newPin, {
    message: "Indica un nuovo nickname o un nuovo PIN",
  });

const changeCredentials: RequestHandler = async (req, res) => {
  try {
    const body = ChangeCredentialsBody.parse(req.body);
    const session = req.session!;
    const { db } = await import("@workspace/db");
    const { usersTable } = await import("@workspace/db");
    const { eq, and, ne, sql } = await import("drizzle-orm");

    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!me) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }
    // Serve un PIN esistente da verificare (gli account social non l'hanno).
    if (!me.pinHash || !(await verifyPin(body.currentPin, me.pinHash))) {
      res.status(403).json({ error: "WRONG_PIN", message: "PIN attuale errato" });
      return;
    }

    const updates: { nickname?: string; pinHash?: string; pinPlain?: string } = {};
    if (body.newNickname) {
      // Unicità nickname case-insensitive (esclude sé stesso).
      const [dup] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(sql`lower(${usersTable.nickname}) = lower(${body.newNickname})`, ne(usersTable.id, me.id)))
        .limit(1);
      if (dup) { res.status(409).json({ error: "NICKNAME_TAKEN", message: "Nickname già in uso" }); return; }
      updates.nickname = body.newNickname;
    }
    if (body.newPin) {
      updates.pinHash = await hashPin(body.newPin);
      // pin_plain: copia leggibile per la sola visualizzazione admin (cfr. 0013).
      updates.pinPlain = body.newPin;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, me.id)).returning();
    // Nuovo token (il payload non cambia, ma restituirlo è comodo lato client).
    res.json({
      user: await userPayload(updated),
      token: signToken({ userId: updated.id, isAdmin: updated.isAdmin }),
    });
  } catch (err) {
    if ((err as any)?.name === "ZodError" || (err as any)?.issues) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: (err as any)?.issues?.[0]?.message ?? "Dati non validi" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Errore del server" });
  }
};

// GET /api/auth/me/pin — restituisce il PIN in chiaro dell'admin loggato, per
// mostrarlo nel pannello (scelta dell'owner; cfr. migrazione 0013). Protetto da
// requireAuth + requireAdmin: solo l'admin autenticato vede il proprio PIN.
// Ritorna null se non impostato (account senza PIN o PIN mai reimpostato dopo 0013).
const getMyPin: RequestHandler = async (req, res) => {
  try {
    const session = req.session!;
    const { db, usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [me] = await db
      .select({ pinPlain: usersTable.pinPlain })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!me) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }
    res.json({ pin: me.pinPlain ?? null });
  } catch (err) {
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

    // Lista nera email: blocca PRIMA di offrire la creazione profilo, così un
    // utente bloccato che ha eliminato l'account non può re-iscriversi con la
    // stessa email. Vale sia che l'account esista ancora sia che sia sparito.
    const { isEmailBlocked } = await import("../lib/blocklist");
    if ((existing?.isBlocked) || (await isEmailBlocked(identity.email))) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato" });
      return;
    }

    if (!existing) {
      // Nessun account: serve scegliere nickname + CAP.
      res.json({ needsProfile: true, email: identity.email });
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

    // Lista nera email: impedisce la re-iscrizione con una email bandita
    // (aggiramento del blocco tramite elimina-account + nuovo signup).
    const { isEmailBlocked } = await import("../lib/blocklist");
    if (await isEmailBlocked(identity.email)) {
      res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account bloccato" });
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
router.get("/me", requireAuth, getMe);
router.get("/me/export", requireAuth, exportMe);
router.delete("/me", requireAuth, deleteMe);
router.patch("/me/location", requireAuth, changeLocation);
router.patch("/me/credentials", requireAuth, changeCredentials);
router.get("/me/pin", requireAuth, requireAdmin, getMyPin);

export default router;
