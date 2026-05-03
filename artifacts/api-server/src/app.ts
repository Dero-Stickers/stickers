import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { startKeepAlive } from "./keepalive";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust the first reverse proxy (Render, Replit) so req.ip resolves to the
// real client IP from x-forwarded-for. Required for the auth rate limiter to
// avoid bypass via header spoofing.
app.set("trust proxy", 1);

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
function buildAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];
  const env = process.env["CORS_ORIGINS"];
  if (env) {
    for (const o of env.split(",").map((s) => s.trim()).filter(Boolean)) {
      origins.push(o);
    }
  }
  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) {
    for (const d of replitDomains.split(",").map((s) => s.trim()).filter(Boolean)) {
      origins.push(`https://${d}`);
    }
  }
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) {
    origins.push(`https://${devDomain}`);
    origins.push(new RegExp(`^https://[a-z0-9-]+-\\d+\\.${devDomain.replace(/\./g, "\\.")}$`));
  }
  if (process.env["NODE_ENV"] !== "production") {
    origins.push(/^https?:\/\/localhost(:\d+)?$/);
    origins.push(/^https?:\/\/127\.0\.0\.1(:\d+)?$/);
    origins.push(/\.replit\.dev$/);
    origins.push(/\.repl\.co$/);
    origins.push(/\.janeway\.replit\.dev$/);
    origins.push(/\.kirk\.replit\.dev$/);
    origins.push(/\.picard\.replit\.dev$/);
    origins.push(/\.replit\.app$/);
  } else {
    origins.push(/\.replit\.app$/);
  }
  return origins;
}

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const ok = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      if (ok) return callback(null, true);
      logger.warn({ origin }, "CORS rejected origin");
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// Security headers. CSP is intentionally disabled here because the SPA is
// served by the same process and already ships its own meta CSP; enabling
// Helmet's default CSP would block the Vite-built bundle.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// gzip/br responses — big win for JSON list endpoints (albums, stickers).
app.use(compression());

// Body limits — we never accept large uploads on this API. A small ceiling
// stops a malicious client from exhausting memory on a single request.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

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
