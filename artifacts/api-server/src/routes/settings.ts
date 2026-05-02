import { Router } from "express";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/auth";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<{ userId: number; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  const session = verifyToken(authHeader.slice(7).trim());
  if (!session) { res.status(401).json({ error: "UNAUTHORIZED" }); return null; }
  if (!session.isAdmin) { res.status(403).json({ error: "FORBIDDEN" }); return null; }
  return session;
}

const SETTING_KEYS = ["support_email", "demo_hours", "privacy_policy", "terms", "cookie_policy", "app_name"];

// GET /api/settings
const getSettings: RequestHandler = async (req, res) => {
  try {
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");
    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });

    res.json({
      supportEmail: map["support_email"] ?? "dero975@gmail.com",
      appName: map["app_name"] ?? "STICKERs matchbox",
      demoHours: parseInt(map["demo_hours"] ?? "24", 10),
      privacyPolicyText: map["privacy_policy"] ?? "",
      termsText: map["terms"] ?? "",
      cookiePolicyText: map["cookie_policy"] ?? "",
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/settings
const updateSettings: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");

    const updates: { key: string; value: string }[] = [];
    if (req.body.supportEmail !== undefined) updates.push({ key: "support_email", value: req.body.supportEmail });
    if (req.body.appName !== undefined) updates.push({ key: "app_name", value: req.body.appName });
    if (req.body.demoHours !== undefined) updates.push({ key: "demo_hours", value: String(req.body.demoHours) });
    if (req.body.privacyPolicyText !== undefined) updates.push({ key: "privacy_policy", value: req.body.privacyPolicyText });
    if (req.body.termsText !== undefined) updates.push({ key: "terms", value: req.body.termsText });
    if (req.body.cookiePolicyText !== undefined) updates.push({ key: "cookie_policy", value: req.body.cookiePolicyText });

    for (const update of updates) {
      const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, update.key)).limit(1);
      if (existing.length) {
        await db.update(appSettingsTable).set({ value: update.value, updatedAt: new Date() }).where(eq(appSettingsTable.key, update.key));
      } else {
        await db.insert(appSettingsTable).values({ key: update.key, value: update.value });
      }
    }

    res.json({ success: true, message: "Impostazioni salvate" });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /api/settings/demo
const getDemoConfig: RequestHandler = async (req, res) => {
  try {
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");
    const [hours] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "demo_hours")).limit(1);
    const [enabled] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "demo_enabled")).limit(1);
    res.json({
      demoHours: parseInt(hours?.value ?? "24", 10),
      demoEnabled: enabled?.value !== "false",
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PUT /api/settings/demo
const updateDemoConfig: RequestHandler = async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { db } = await import("@workspace/db");
    const { appSettingsTable } = await import("@workspace/db");

    const upsert = async (key: string, value: string) => {
      const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key)).limit(1);
      if (existing.length) {
        await db.update(appSettingsTable).set({ value, updatedAt: new Date() }).where(eq(appSettingsTable.key, key));
      } else {
        await db.insert(appSettingsTable).values({ key, value });
      }
    };

    if (req.body.demoHours !== undefined) await upsert("demo_hours", String(req.body.demoHours));
    if (req.body.demoEnabled !== undefined) await upsert("demo_enabled", String(req.body.demoEnabled));

    res.json({ success: true, message: "Configurazione demo aggiornata" });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

router.get("/", getSettings);
router.put("/", updateSettings);
router.get("/demo", getDemoConfig);
router.put("/demo", updateDemoConfig);

export default router;
