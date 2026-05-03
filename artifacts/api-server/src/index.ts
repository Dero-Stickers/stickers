import app from "./app";
import { logger } from "./lib/logger";
import { closePool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Graceful shutdown — Render sends SIGTERM ~30s before killing the process on
// every deploy. Stop accepting new connections, let in-flight requests finish,
// then close the DB pool so Supabase doesn't see torn TCP connections.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutdown signal received, draining…");

  // Hard timeout in case something hangs (e.g. long-running query).
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 25_000);
  forceExit.unref();

  server.close(async (closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, "Error closing HTTP server");
    }
    try {
      await closePool();
      logger.info("DB pool closed, bye");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error closing DB pool");
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Last-resort safety nets — never let a single rejected promise kill an
// otherwise healthy server. Just log and keep serving.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});
