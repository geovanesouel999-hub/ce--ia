import { randomBytes } from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";
const configuredSecret = process.env.SESSION_SECRET || "";

if (isProduction && configuredSecret.length < 32) {
  throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

if (!isProduction && configuredSecret.length < 32) {
  console.warn("GEON: SESSION_SECRET temporário em desenvolvimento; sessões serão invalidadas ao reiniciar.");
}

const baseUrl = new URL(process.env.AI_BASE_URL || "https://api.openai.com/v1");
if (!["https:", "http:"].includes(baseUrl.protocol)) {
  throw new Error("AI_BASE_URL precisa usar HTTP ou HTTPS.");
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 3000),
  sessionSecret: configuredSecret.length >= 32 ? configuredSecret : randomBytes(32).toString("hex"),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  aiBaseUrl: baseUrl.toString().replace(/\/+$/, ""),
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
  tavilyApiKey: process.env.TAVILY_API_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: process.env.DATABASE_SSL === "true",
  trustProxy: process.env.TRUST_PROXY === "1"
});
