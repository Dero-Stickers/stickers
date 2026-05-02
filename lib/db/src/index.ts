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

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

// Supabase connections sometimes have a search_path that omits "public".
// Setting it explicitly on every new connection ensures unqualified table
// names (e.g. "users") always resolve correctly.
if (isSupabase) {
  pool.on("connect", (client) => {
    client.query("SET search_path TO public").catch((err: Error) => {
      console.error("[db] failed to set search_path:", err.message);
    });
  });
}

export const db = drizzle(pool, { schema });

export * from "./schema";
