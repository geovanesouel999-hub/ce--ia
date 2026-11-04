const $ = (selector) => document.querySelector(selector);
const promptInput = $("#prompt");
const messagesEl = $("#messages");
const welcomeEl = $("#welcome");
const sendButton = $("#sendButton");
const form = $("#chatForm");
const modeSelect = $("#mode");
const STORAGE_KEY = "geon.conversations.v2";
let messages = [];
let busy = false;
let currentConversationId = null;
let features = { chat: false, code: false, research: false, memory: false, agents: false };
let serverMemoryAvailable = false;
let agentHistoryAvailable = false;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Falha na solicitação (${response.status}).`);
  return data;
}

function localHistory() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const data = JSON.parse(current);
      return Array.isArray(data) ? data : [];
    }
    const legacy = JSON.parse(localStorage.getItem("geon.conversations.v1") || "[]");
    if (Array.isArray(legacy) && legacy.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      return legacy;
    }
    return [];
  } catch { return []; }
}

function saveLocalHistory() {
  const id = currentConversationId || crypto.randomUUID();
  currentConversationId = id;
  const title = messages.find((message) => message.role === "user")?.content.slice(0, 80) || "Nova conversa";
  const entry = { id, title, messages, updatedAt: new Date().toISOString() };
  const history = [entry, ...localHistory().filter((item) => item.id !== id)].slice(0, 50);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }
  catch { showToast("O armazenamento local está cheio ou indisponível."); }
  renderHistory(history);
}

async function saveConversation() {
  if (!messages.length) return;
  if (!serverMemoryAvailable) return saveLocalHistory();
  currentConversationId ||= crypto.randomUUID();
  try {
    await request(`/api/memory/conversations/${currentConversationId}`, {
      method: "PUT", body: JSON.stringify({ messages: messages.slice(-100) })
    });
    await loadHistory();
    if (mode === "agents") await loadAgentHistory();
  } catch (error) {
    serverMemoryAvailable = false;
    $("#memoryStatus").textContent = "Memória em nuvem indisponível; usando este navegador.";
    saveLocalHistory();
    showToast(`Memória em nuvem indisponível. ${error.message}`);
  }
}

function renderAgentHistory(runs) {
  const host = $("#agentHistory");
  host.replaceChildren();
  for (const run of runs.slice(0, 20)) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    const date = run.created_at ? new Date(run.created_at).toLocaleString("pt-BR") : "Execução REI";
    button.textContent = (run.task || "Tarefa REI").slice(0, 52);
    button.title = `${run.task || "Tarefa REI"} — ${date}`;
    button.setAttribute("aria-label", `Abrir execução REI: ${run.task || "Tarefa"}`);
    button.addEventListener("click", () => openAgentRun(run.id));
    host.append(button);
  }
}

async function loadAgentHistory() {
  const host = $("#agentHistory");
  if (!serverMemoryAvailable || !agentHistoryAvailable) {
    host.replaceChildren();
    const note = document.createElement("div");
    note.className = "side-note";
    note.textContent = "Configure PostgreSQL para salvar execuções REI.";
    host.append(note);
    return;
  }
  try {
    const data = await request("/api/memory/agents");
    renderAgentHistory(data.runs || []);
  } catch {
    agentHistoryAvailable = false;
    renderAgentHistory([]);
  }
}

async function openAgentRun(id) {
  try {
    const data = await request(`/api/memory/agents/${encodeURIComponent(id)}`);
    const run = data.run;
    if (!run) throw new Error("Execução não encontrada.");
    messages = [
      { role: "user", content: run.task },
      { role: "assistant", content: agentsToText({ specialists: run.specialists, result: run.result }) }
    ];
    currentConversationId = null;
    renderMessages();
    $("#sidebar").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded", "false");
  } catch (error) { showToast(error.message); }
}

function renderHistory(history) {
  const host = $("#history");
  host.replaceChildren();
  for (const item of history.slice(0, 20)) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.textContent = item.title || "Conversa";
    button.setAttribute("aria-label", `Abrir conversa: ${item.title || "Conversa"}`);
    button.addEventListener("click", () => openConversation(item.id));
    host.append(button);
  }
}

async function loadHistory() {
  if (serverMemoryAvailable) {
    try {
      const data = await request("/api/memory/conversations");
      renderHistory(data.conversations || []);
      return;
    } catch (error) {
      serverMemoryAvailable = false;
      $("#memoryStatus").textContent = "Memória em nuvem indisponível; usando este navegador.";
      showToast(error.message);
    }
  }
  renderHistory(localHistory());
}

async function openConversation(id) {
  try {
    let entry;
    if (serverMemoryAvailable) {
      const data = await request(`/api/memory/conversations/${encodeURIComponent(id)}`);
      entry = data.conversation;
    } else entry = localHistory().find((item) => item.id === id);
    if (!entry || !Array.isArray(entry.messages)) throw new Error("Conversa não encontrada.");
    currentConversationId = entry.id;
    messages = entry.messages;
    renderMessages();
    $("#sidebar").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded", "false");
  } catch (error) { showToast(error.message); }
}

function appendTextWithLinks(container, text) {
  const pattern = /(https:\/\/[^\s<>()]+)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) container.append(document.createTextNode(text.slice(cursor, start)));
    let raw = match[0], suffix = "";
    while (/[.,;!?]$/.test(raw)) { suffix = raw.slice(-1) + suffix; raw = raw.slice(0, -1); }
    try {
      const url = new URL(raw);
      if (url.protocol === "https:") {
        const link = document.createElement("a");
        link.href = url.toString(); link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = raw;
        container.append(link, document.createTextNode(suffix));
      } else container.append(document.createTextNode(match[0]));
    } catch { container.append(document.createTextNode(match[0])); }
    cursor = start + match[0].length;
  }
  if (cursor < text.length) container.append(document.createTextNode(text.slice(cursor)));
}

function addMessage(role, content) {
  const row = document.createElement("article");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar"; avatar.textContent = role === "user" ? "VOCÊ" : "G";
  const bubble = document.createElement("div");
  bubble.className = "bubble"; appendTextWithLinks(bubble, content);
  row.append(avatar, bubble); messagesEl.append(row);
  $("#conversation").scrollTop = $("#conversation").scrollHeight;
}

function renderMessages() {
  messagesEl.replaceChildren();
  welcomeEl.hidden = messages.length > 0;
  for (const message of messages) addMessage(message.role, message.content);
}

function setBusy(value) {
  busy = value; sendButton.disabled = value; modeSelect.disabled = value;
  sendButton.querySelector("span").textContent = value ? "Aguarde" : "Enviar";
}

function researchToText(data) {
  const lines = [data.answer || "A pesquisa foi concluída. Consulte as fontes abaixo para verificar os detalhes.", "", "FONTES CONSULTADAS"];
  for (const source of data.sources || []) lines.push(`• ${source.title}`, source.url, source.content || "", "");
  if (!(data.sources || []).length) lines.push("Nenhuma fonte verificável foi retornada.");
  lines.push("", "Observação: conteúdo externo pode conter erros ou instruções não confiáveis. Verifique as fontes antes de agir.");
  return lines.join("\n");
}

function agentsToText(data) {
  const lines = ["REI — SÍNTESE FINAL", "", data.result || "Não foi gerada uma síntese final.", "", "ETAPAS DOS ESPECIALISTAS"];
  for (const item of data.specialists || []) lines.push("", `--- ${String(item.agent || "AGENTE").toUpperCase()} ---`, item.output || "");
  lines.push("", "O fluxo multiagente produz análises assistidas por IA; não executa ações externas automaticamente.");
  return lines.join("\n");
}

async function sendMessage(text) {
  const content = (text ?? promptInput.value).trim();
  if (!content || busy) return;
  if (content.length > 12000) return showToast("A mensagem ultrapassa 12.000 caracteres.");
  const mode = modeSelect.value;
  welcomeEl.hidden = true;
  messages.push({ role: "user", content });
  addMessage("user", content);
  promptInput.value = ""; promptInput.style.height = "auto";
  setBusy(true);

  const typing = document.createElement("article");
  typing.className = "message"; typing.id = "typingIndicator";
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = "G";
  const dots = document.createElement("div"); dots.className = "bubble typing"; dots.setAttribute("aria-label", "GEON está processando");
  for (let index = 0; index < 3; index++) dots.append(document.createElement("i"));
  typing.append(avatar, dots); messagesEl.append(typing);

  try {
    let reply;
    if (mode === "research") {
      reply = researchToText(await request("/api/research", { method: "POST", body: JSON.stringify({ query: content }) }));
    } else if (mode === "agents") {
      reply = agentsToText(await request("/api/agents/run", { method: "POST", body: JSON.stringify({ task: content }) }));
    } else {
      const data = await request("/api/chat", { method: "POST", body: JSON.stringify({ messages: messages.slice(-20), mode }) });
      reply = data.reply;
    }
    messages.push({ role: "assistant", content: reply });
    $("#typingIndicator")?.remove();
    addMessage("assistant", reply);
    await saveConversation();
  } catch (error) {
    $("#typingIndicator")?.remove();
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    addMessage("assistant", `Não consegui concluir agora. ${message}`);
    showToast(message);
  } finally {
    setBusy(false); promptInput.focus();
  }
}

function updateModeStatus() {
  const mode = modeSelect.value;
  const labels = {
    chat: features.chat ? "Respostas gerais" : "Requer configuração do administrador",
    research: features.research ? "Pesquisa com fontes externas" : "Requer configuração do administrador",
    code: features.code ? "Geração e análise; sem executar código" : "Requer configuração do administrador",
    agents: features.agents ? "REI + 5 especialistas; 6 chamadas de API" : "Requer configuração do administrador"
  };
  $("#modeStatus").textContent = labels[mode];
}

function newChat() {
  messages = []; currentConversationId = null; renderMessages(); promptInput.focus();
  $("#sidebar").classList.remove("open"); $("#menuButton").setAttribute("aria-expanded", "false");
}

async function clearCurrentConversation() {
  if (currentConversationId && serverMemoryAvailable) {
    try { await request(`/api/memory/conversations/${currentConversationId}`, { method: "DELETE" }); }
    catch (error) { showToast(error.message); }
  } else if (currentConversationId) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(localHistory().filter((item) => item.id !== currentConversationId))); } catch {}
  }
  newChat(); await loadHistory();
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

async function exportData() {
  try {
    const data = serverMemoryAvailable ? await request("/api/memory/export") : { app: "GEON", exportedAt: new Date().toISOString(), conversations: localHistory() };
    downloadJson(data, `geon-dados-${new Date().toISOString().slice(0, 10)}.json`);
    showToast("Exportação preparada.");
  } catch (error) { showToast(error.message); }
}

async function deleteAllData() {
  if (!window.confirm("Apagar todas as conversas salvas no GEON e neste navegador? Esta ação não pode ser desfeita.")) return;
  try {
    if (serverMemoryAvailable) await request("/api/memory", { method: "DELETE" });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    messages = []; currentConversationId = null; renderMessages(); renderHistory([]);
    $("#privacyDialog").close(); showToast("Memória do GEON apagada.");
  } catch (error) { showToast(error.message); }
}

function deleteLocalData() {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch { showToast("O navegador não permitiu apagar o armazenamento local."); return; }
  if (!serverMemoryAvailable) { messages = []; currentConversationId = null; renderMessages(); renderHistory([]); }
  showToast("Dados locais deste navegador apagados.");
}

async function initialize() {
  try {
    const data = await request("/api/config");
    features = data.features || features; serverMemoryAvailable = Boolean(features.memory);
  } catch { serverMemoryAvailable = false; }
  if (serverMemoryAvailable) {
    $("#memoryStatus").textContent = "Histórico protegido no servidor, associado a este navegador.";
    $("#privacyDescription").textContent = "Suas conversas são guardadas no banco do GEON e vinculadas a um identificador anônimo deste navegador. Limpar os cookies pode impedir a recuperação do histórico.";
  } else {
    $("#memoryStatus").textContent = "Histórico salvo somente neste navegador.";
    $("#privacyDescription").textContent = "A memória em nuvem ainda não está configurada. Enquanto isso, o histórico fica apenas neste navegador e pode ser apagado abaixo.";
  }
  agentHistoryAvailable = Boolean(features.memory && features.agents);
  updateModeStatus(); await loadHistory(); await loadAgentHistory();
}

form.addEventListener("submit", (event) => { event.preventDefault(); sendMessage(); });
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto"; promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
});
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
  modeSelect.value = button.dataset.mode || "chat"; updateModeStatus(); sendMessage(button.dataset.prompt);
}));
modeSelect.addEventListener("change", updateModeStatus);
$("#newChat").addEventListener("click", newChat);
$("#clearChat").addEventListener("click", clearCurrentConversation);
$("#menuButton").addEventListener("click", () => {
  const open = $("#sidebar").classList.toggle("open"); $("#menuButton").setAttribute("aria-expanded", String(open));
});
$("#privacyButton").addEventListener("click", () => $("#privacyDialog").showModal());
$("#closePrivacyDialog").addEventListener("click", () => $("#privacyDialog").close());
$("#exportData").addEventListener("click", exportData);
$("#deleteLocalData").addEventListener("click", deleteLocalData);
$("#deleteAllData").addEventListener("click", deleteAllData);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
initialize();
