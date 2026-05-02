/**
 * Supabase keep-alive mechanism.
 *
 * Supabase Free tier pauses projects after ~1 week of inactivity.
 * This module runs a lightweight SELECT query every 12 hours to keep
 * the connection and project alive without modifying any data.
 */

const INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function pingDatabase(): Promise<void> {
  try {
    const { pool } = await import("@workspace/db");
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      console.log("[keepalive] Supabase ping OK —", new Date().toISOString());
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("[keepalive] Supabase ping failed —", err instanceof Error ? err.message : err);
  }
}

export function startKeepAlive(): void {
  if (intervalHandle) return;
  pingDatabase();
  intervalHandle = setInterval(pingDatabase, INTERVAL_MS);
  console.log(`[keepalive] Started — pinging Supabase every ${INTERVAL_MS / 3600000}h`);
}

export function stopKeepAlive(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
