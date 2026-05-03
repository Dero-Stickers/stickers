import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// DB keep-alive endpoint. Hit by the GitHub Actions cron once per day to
// prevent the Supabase free instance from auto-pausing after 7 days of
// inactivity (also wakes the Render free web service).
router.get("/healthz/db", async (_req, res) => {
  try {
    const { pool } = await import("@workspace/db");
    const start = Date.now();
    const r = await pool.query("SELECT 1 AS ok");
    res.json({
      status: "ok",
      db: r.rows?.[0]?.ok === 1 ? "ok" : "unexpected",
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err?.message ?? "db error" });
  }
});

export default router;
