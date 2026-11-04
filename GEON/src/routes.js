import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  databaseIsHealthy,
  deleteAllConversations,
  deleteConversation,
  exportConversations,
  getConversation,
  listConversations,
  saveConversation
} from "./database.js";
import { createChatReply } from "./ai.js";
import { runAgentWorkflow } from "./agents.js";
import { searchWeb } from "./research.js";
import { conversationTitle, validateMessages } from "./validation.js";
import { isUuid, sameOrigin } from "./identity.js";
import { config } from "./config.js";

const router = Router();
const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite temporário atingido. Aguarde antes de tentar novamente." }
});

function memoryUnavailable(res) {
  return res.status(503).json({ error: "A memória em nuvem ainda não foi configurada pelo administrador." });
}

function aiError(res, error) {
  if (error instanceof TypeError) return res.status(400).json({ error: error.message });
  if (error.code === "AI_DISABLED") return res.status(503).json({ error: "O serviço de IA ainda não foi configurado pelo administrador." });
  if (error.name === "TimeoutError" || error.name === "AbortError") return res.status(504).json({ error: "O serviço de IA excedeu o tempo limite. Tente novamente." });
  const status = error.code === "AI_UPSTREAM" || error.code === "AI_EMPTY" ? 502 : 500;
  return res.status(status).json({ error: error.message || "Não foi possível concluir a solicitação." });
}

router.get("/health", async (_req, res) => {
  try {
    const database = await databaseIsHealthy();
    res.json({ ok: true, app: "GEON", version: "1.2.0", features: { memory: database, research: Boolean(config.tavilyApiKey), chat: Boolean(config.openAiApiKey), agents: Boolean(config.openAiApiKey) } });
  } catch {
    res.status(503).json({ ok: false, app: "GEON", error: "Banco de dados indisponível." });
  }
});

router.get("/config", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    app: "GEON",
    version: "1.2.0",
    features: {
      chat: Boolean(config.openAiApiKey),
      code: Boolean(config.openAiApiKey),
      research: Boolean(config.tavilyApiKey),
      memory: Boolean(config.databaseUrl),
      agents: Boolean(config.openAiApiKey)
    }
  });
});

router.post("/chat", sameOrigin, limiter(30), async (req, res) => {
  try {
    const messages = validateMessages(req.body?.messages, { maxItems: 20, maxChars: 12000, maxTotalChars: 60000 });
    const mode = req.body?.mode === "code" ? "code" : "chat";
    const reply = await createChatReply(messages, mode);
    res.json({ reply });
  } catch (error) {
    return aiError(res, error);
  }
});

router.post("/agents/run", sameOrigin, limiter(2), async (req, res) => {
  const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
  if (!task || task.length > 5000) {
    return res.status(400).json({ error: "A tarefa deve ter entre 1 e 5.000 caracteres." });
  }
  try {
    const workflow = await runAgentWorkflow(task);
    res.set("Cache-Control", "no-store").json(workflow);
  } catch (error) {
    return aiError(res, error);
  }
});

router.post("/research", sameOrigin, limiter(10), async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query || query.length > 500) return res.status(400).json({ error: "A consulta deve ter entre 1 e 500 caracteres." });
  try {
    const result = await searchWeb(query);
    return res.json(result);
  } catch (error) {
    if (error.code === "RESEARCH_DISABLED") return res.status(503).json({ error: "A pesquisa externa ainda não foi configurada pelo administrador." });
    if (error.name === "TimeoutError" || error.name === "AbortError") return res.status(504).json({ error: "A pesquisa excedeu o tempo limite." });
    return res.status(error.code === "RESEARCH_UPSTREAM" ? 502 : 500).json({ error: error.message || "Falha na pesquisa." });
  }
});

router.get("/memory/conversations", async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  try {
    res.set("Cache-Control", "no-store").json({ conversations: await listConversations(req.geonUserId) });
  } catch {
    res.status(503).json({ error: "Não foi possível acessar a memória em nuvem." });
  }
});

router.get("/memory/conversations/:id", async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Identificador de conversa inválido." });
  try {
    const conversation = await getConversation(req.geonUserId, req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversa não encontrada." });
    res.set("Cache-Control", "no-store").json({ conversation });
  } catch {
    res.status(503).json({ error: "Não foi possível acessar a conversa." });
  }
});

router.put("/memory/conversations/:id", sameOrigin, limiter(120), async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Identificador de conversa inválido." });
  try {
    const messages = validateMessages(req.body?.messages, { maxItems: 100, maxChars: 12000, maxTotalChars: 120000 });
    const conversation = await saveConversation(req.geonUserId, req.params.id, messages, conversationTitle(messages));
    return res.json({ conversation });
  } catch (error) {
    if (error instanceof TypeError) return res.status(400).json({ error: error.message });
    if (error.code === "CONVERSATION_CONFLICT") return res.status(409).json({ error: error.message });
    return res.status(503).json({ error: "Não foi possível salvar a conversa." });
  }
});

router.delete("/memory/conversations/:id", sameOrigin, limiter(120), async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Identificador de conversa inválido." });
  try {
    await deleteConversation(req.geonUserId, req.params.id);
    return res.json({ ok: true });
  } catch {
    return res.status(503).json({ error: "Não foi possível apagar a conversa." });
  }
});

router.get("/memory/export", async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  try {
    const conversations = await exportConversations(req.geonUserId);
    res.set("Cache-Control", "no-store").json({ app: "GEON", exportedAt: new Date().toISOString(), conversations });
  } catch {
    res.status(503).json({ error: "Não foi possível exportar a memória." });
  }
});

router.delete("/memory", sameOrigin, limiter(10), async (req, res) => {
  if (!config.databaseUrl) return memoryUnavailable(res);
  try {
    const deleted = await deleteAllConversations(req.geonUserId);
    return res.json({ ok: true, deleted });
  } catch {
    return res.status(503).json({ error: "Não foi possível apagar a memória." });
  }
});

router.use((error, _req, res, _next) => {
  console.error("GEON API error:", error.name || "Error");
  res.status(500).json({ error: "Erro interno ao processar a solicitação." });
});

export default router;
