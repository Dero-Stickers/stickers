import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { startKeepAlive } from "./keepalive";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Keep Supabase Free tier alive with a lightweight ping every 12 hours
startKeepAlive();

// In production (Render), serve the built React frontend as static files
if (process.env.NODE_ENV === "production") {
  // Path: from dist/index.mjs → up to repo root → stickers-app/dist/public
  const staticDir = path.resolve(__dirname, "../../stickers-app/dist/public");
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // SPA fallback — all non-API routes return index.html
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
    logger.info({ staticDir }, "Serving static frontend files");
  } else {
    logger.warn({ staticDir }, "Static dir not found — frontend build may be missing");
  }
}

export default app;
