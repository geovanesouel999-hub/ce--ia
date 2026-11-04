import { config } from "./config.js";
import { normalizeResearchResults } from "./validation.js";

export async function searchWeb(query) {
  if (!config.tavilyApiKey) {
    const error = new Error("Pesquisa externa ainda não configurada.");
    error.code = "RESEARCH_DISABLED";
    throw error;
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query,
      search_depth: "basic",
      topic: "general",
      max_results: 5,
      include_answer: true,
      include_raw_content: false
    }),
    signal: AbortSignal.timeout(25000),
    redirect: "error"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("GEON: pesquisa externa respondeu com status", response.status);
    const error = new Error("O serviço de pesquisa não conseguiu concluir a solicitação.");
    error.code = "RESEARCH_UPSTREAM";
    throw error;
  }
  return normalizeResearchResults(data);
}
