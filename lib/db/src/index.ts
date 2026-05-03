import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "").trim();

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL?.trim();

// Pool sizing tuned for a multi-tenant prod app (5K-10K users) running on a
// single Render instance against the Supabase transaction pooler (port 6543).
//   • max:                hard ceiling per process — small enough that 2 web
//                         workers + 1 keep-alive job fit well under Supabase's
//                         60 conn limit on the Free/Pro pooler.
//   • idleTimeoutMillis:  recycle idle conns so the pool doesn't keep the full
//                         max open during quiet periods.
//   • connectionTimeoutMillis: fail fast under saturation instead of holding
//                         requests forever — the API responds 503 from upstream
//                         retries rather than hanging.
//   • allowExitOnIdle:    false — don't let an empty pool kill the process.
const poolMax = Number(process.env.DB_POOL_MAX ?? "10");
const poolIdleMs = Number(process.env.DB_POOL_IDLE_MS ?? "30000");
const poolConnectTimeoutMs = Number(process.env.DB_POOL_CONNECT_TIMEOUT_MS ?? "10000");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: poolMax,
  idleTimeoutMillis: poolIdleMs,
  connectionTimeoutMillis: poolConnectTimeoutMs,
  allowExitOnIdle: false,
});

// pg surfaces unexpected errors on idle clients via 'error'. Without a handler
// the process crashes. Log and let the pool replace the client.
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

if (isSupabase) {
  // Supabase connections sometimes have a search_path that omits "public".
  pool.on("connect", (client) => {
    client.query("SET search_path TO public").catch((err: Error) => {
      console.error("[db] failed to set search_path:", err.message);
    });
  });
}

export const db = drizzle(pool, { schema });

/**
 * Gracefully close the pool. Call from SIGTERM/SIGINT handlers so in-flight
 * queries finish and connections are returned to Supabase cleanly.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export * from "./schema";
