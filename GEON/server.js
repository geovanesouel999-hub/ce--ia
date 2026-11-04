import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./src/config.js";
import { identityMiddleware } from "./src/identity.js";
import { initializeDatabase, pool } from "./src/database.js";
import apiRouter from "./src/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));
  app.use(express.json({ limit: "128kb", strict: true }));
  app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Limite temporário de solicitações atingido." }
  }));
  app.use("/api", identityMiddleware(config.sessionSecret, config.isProduction));
  app.use("/api", apiRouter);

  app.use(express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    maxAge: config.isProduction ? "1h" : 0,
    etag: true
  }));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
  app.use((error, _req, res, _next) => {
    console.error("GEON request error:", error.name || "Error");
    res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? "Solicitação muito grande." : "Solicitação inválida." });
  });
  return app;
}

export async function start() {
  await initializeDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`GEON disponível na porta ${config.port}`);
    console.log(`GEON: memória em nuvem ${pool ? "configurada" : "desativada até configurar DATABASE_URL"}.`);
  });
  const shutdown = async () => {
    server.close(async () => {
      if (pool) await pool.end().catch(() => {});
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    console.error("GEON não conseguiu iniciar:", error.message);
    process.exit(1);
  });
}
