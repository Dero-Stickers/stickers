import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import router from "./routes";
import { rateLimitGlobal } from "./middlewares/rateLimitGlobal";
import { logger } from "./lib/logger";
import { startKeepAlive } from "./keepalive";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust the first reverse proxy (Render) so req.ip resolves to the
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
  // Render expose automaticamente l'URL pubblico del servizio.
  const renderUrl = process.env["RENDER_EXTERNAL_URL"];
  if (renderUrl) {
    origins.push(renderUrl.replace(/\/$/, ""));
  }
  if (process.env["NODE_ENV"] !== "production") {
    origins.push(/^https?:\/\/localhost(:\d+)?$/);
    origins.push(/^https?:\/\/127\.0\.0\.1(:\d+)?$/);
  } else {
    // Domini pubblici ESATTI di questo deploy (non la regex jolly *.onrender.com,
    // che avrebbe ammesso qualsiasi altro sotto-dominio onrender). Teniamo ENTRAMBI
    // durante la transizione al dominio custom: onrender resta valido finché non
    // si spegne, stickers.deroarts.com è il dominio definitivo (vedi DNA/19).
    origins.push("https://stickers-matchbox.onrender.com");
    origins.push("https://stickers.deroarts.com");
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
// Security headers + Content-Security-Policy. Partiamo dai default sicuri di
// Helmet (script-src 'self', object-src 'none', base-uri 'self', form-action
// 'self', upgrade-insecure-requests, ecc.) e sovrascriviamo SOLO ciò che serve
// a questa app (lo stesso processo serve SPA + API):
//  - lo splash bootstrap è uno script ESTERNO (/splash-gate.js) → script-src 'self' resta stretto;
//  - lo splash usa un <style> inline → 'unsafe-inline' SOLO sugli stili (rischio basso);
//  - connect-src aggiunge Supabase (Realtime https/wss) oltre alla stessa origine (API);
//  - frame-ancestors 'none' contro il clickjacking.
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
        imgSrc: ["'self'", "data:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

// gzip/br responses — big win for JSON list endpoints (albums, stickers).
app.use(compression());

// Body limits — we never accept large uploads on this API. A small ceiling
// stops a malicious client from exhausting memory on a single request.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// Freno anti-flood globale per IP (sopra ai limiti mirati su login/ecc.).
app.use("/api", rateLimitGlobal);
app.use("/api", router);

// Keep Supabase Free tier alive with a lightweight ping every 12 hours
startKeepAlive();

// In production (Render), serve the built React frontend as static files
if (process.env.NODE_ENV === "production") {
  // Path: from dist/index.mjs → up to repo root → stickers-app/dist/public
  const staticDir = path.resolve(__dirname, "../../stickers-app/dist/public");
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));

    // Doppia icona Home (User/Admin) — path-based PWA manifest switching.
    // L'index.html sorgente dichiara icona+manifest dell'area User. iOS/Safari e
    // Android/desktop leggono apple-touch-icon e manifest DALL'HTML servito al
    // momento di "Aggiungi a Home": non li rileggono da JS. Perciò la scelta va
    // fatta QUI, lato server: su una rotta /admin serviamo lo stesso HTML con i
    // due tag riscritti verso l'icona e il manifest dedicati all'Admin, così
    // /admin diventa un'app installabile distinta (id/start_url propri).
    const indexPath = path.join(staticDir, "index.html");
    const indexHtml = readFileSync(indexPath, "utf8");
    // Riscrittura mirata dei due soli tag icona+manifest. Se il markup cambiasse
    // e un replace non trovasse match, restiamo sull'HTML originale (fail-safe:
    // mai servire un HTML corrotto; al più l'Admin mostrerebbe l'icona User).
    const adminHtml = indexHtml
      .replace(
        '<link rel="manifest" href="/manifest.webmanifest" />',
        '<link rel="manifest" href="/manifest-admin.webmanifest" />',
      )
      .replace(
        '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
        '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-admin.png" />',
      )
      .replace(
        '<meta name="apple-mobile-web-app-title" content="Stickers" />',
        '<meta name="apple-mobile-web-app-title" content="Admin" />',
      );

    // SPA fallback — all non-API routes return index.html (Admin variant on /admin)
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
      const html = req.path === "/admin" || req.path.startsWith("/admin/")
        ? adminHtml
        : indexHtml;
      res.type("html").send(html);
    });
    logger.info({ staticDir }, "Serving static frontend files");
  } else {
    logger.warn({ staticDir }, "Static dir not found — frontend build may be missing");
  }
}

export default app;
