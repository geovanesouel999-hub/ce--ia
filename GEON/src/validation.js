export function validateMessages(input, { maxItems = 20, maxChars = 12000, maxTotalChars = 60000 } = {}) {
  if (!Array.isArray(input) || input.length < 1 || input.length > maxItems) {
    throw new TypeError(`Envie entre 1 e ${maxItems} mensagens.`);
  }

  let total = 0;
  const messages = input.map((item) => {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      throw new TypeError("Formato de mensagem inválido.");
    }
    const content = item.content.trim();
    if (!content || content.length > maxChars) {
      throw new TypeError(`Cada mensagem deve ter entre 1 e ${maxChars.toLocaleString("pt-BR")} caracteres.`);
    }
    total += content.length;
    return { role: item.role, content };
  });

  if (total > maxTotalChars) throw new TypeError("A conversa ultrapassa o limite de conteúdo permitido.");
  return messages;
}

export function buildSystemPrompt(mode = "chat") {
  const base = "Você é GEON, uma inteligência artificial útil, precisa e profissional. Responda no idioma do usuário. Diferencie fatos de hipóteses, informe incertezas e não invente fontes, resultados de ferramentas ou ações realizadas.";
  if (mode === "code") {
    return `${base} Você está no modo Programação. Produza código legível, modular e testável; explique como executar e validar. Considere entradas não confiáveis, valide dados, evite segredos no cliente e destaque riscos. Não afirme que executou código: a plataforma não executa código fornecido pelo usuário. Recuse instruções que facilitem malware, roubo de credenciais, invasão ou abuso.`;
  }
  return base;
}

export function normalizeResearchResults(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const sources = results.slice(0, 5).flatMap((item) => {
    if (!item || typeof item.title !== "string" || typeof item.url !== "string") return [];
    try {
      const url = new URL(item.url);
      if (url.protocol !== "https:") return [];
      return [{
        title: item.title.slice(0, 240),
        url: url.toString(),
        content: typeof item.content === "string" ? item.content.slice(0, 1400) : ""
      }];
    } catch {
      return [];
    }
  });
  return {
    answer: typeof payload?.answer === "string" ? payload.answer.slice(0, 5000) : "",
    sources
  };
}

export function conversationTitle(messages) {
  const firstUser = messages.find((message) => message.role === "user");
  return (firstUser?.content || "Nova conversa").trim().replace(/\s+/g, " ").slice(0, 80);
}
