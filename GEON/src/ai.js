import { config } from "./config.js";
import { buildSystemPrompt } from "./validation.js";

export async function createChatReply(messages, mode = "chat", systemInstructions = "") {
  if (!config.openAiApiKey) {
    const error = new Error("O serviço de IA ainda não foi configurado.");
    error.code = "AI_DISABLED";
    throw error;
  }

  const systemPrompt = [buildSystemPrompt(mode), systemInstructions].filter(Boolean).join("\n\n");
  const response = await fetch(`${config.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.aiModel,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.5,
      max_tokens: 1800
    }),
    signal: AbortSignal.timeout(60000),
    redirect: "error"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("GEON: provedor de IA respondeu com status", response.status);
    const error = new Error("O provedor de IA não conseguiu concluir a solicitação.");
    error.code = "AI_UPSTREAM";
    throw error;
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    const error = new Error("O provedor retornou uma resposta vazia.");
    error.code = "AI_EMPTY";
    throw error;
  }
  return reply.trim();
}
