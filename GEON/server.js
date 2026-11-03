import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
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
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "64kb" }));
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite temporário atingido. Tente novamente em alguns minutos." }
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "GEON", version: "1.0.0" });
});

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "O serviço de IA ainda não foi configurado. O administrador precisa adicionar a chave no servidor."
    });
  }

  const incoming = req.body?.messages;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 20) {
    return res.status(400).json({ error: "Envie entre 1 e 20 mensagens válidas." });
  }

  const messages = [];
  for (const item of incoming) {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      return res.status(400).json({ error: "Formato de mensagem inválido." });
    }
    const content = item.content.trim();
    if (!content || content.length > 8000) {
      return res.status(400).json({ error: "Cada mensagem deve ter entre 1 e 8.000 caracteres." });
    }
    messages.push({ role: item.role, content });
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Você é GEON, uma inteligência artificial útil, precisa e profissional. Responda no idioma do usuário. Seja transparente sobre incertezas e nunca invente fontes ou ações realizadas."
          },
          ...messages
        ],
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Provedor de IA respondeu com status:", upstream.status);
      return res.status(502).json({ error: "O provedor de IA não conseguiu concluir a solicitação. Verifique a configuração do serviço." });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "O provedor retornou uma resposta vazia." });
    }
    return res.json({ reply: answer });
  } catch (error) {
    console.error("Falha na chamada ao provedor de IA:", error.name || "Error");
    return res.status(504).json({ error: "Não foi possível conectar ao serviço de IA. Tente novamente." });
  }
});

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`GEON disponível na porta ${PORT}`);
});
