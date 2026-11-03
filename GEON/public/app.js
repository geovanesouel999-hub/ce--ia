const $ = (selector) => document.querySelector(selector);
const promptInput = $("#prompt");
const messagesEl = $("#messages");
const welcomeEl = $("#welcome");
const sendButton = $("#sendButton");
const form = $("#chatForm");
const STORAGE_KEY = "geon.conversations.v1";
let messages = [];
let busy = false;

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function saveHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const id = Date.now();
    const entry = { id, title: messages.find(m => m.role === "user")?.content.slice(0, 54) || "Nova conversa", messages };
    const updated = [entry, ...history.filter(item => item.id !== currentHistoryId)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    currentHistoryId = id;
    renderHistory();
  } catch {
    showToast("Não foi possível salvar o histórico neste dispositivo.");
  }
}
let currentHistoryId = null;

function renderHistory() {
  const host = $("#history");
  host.replaceChildren();
  let history = [];
  try { history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch {}
  for (const item of history.slice(0, 15)) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.textContent = item.title || "Conversa";
    button.addEventListener("click", () => {
      messages = Array.isArray(item.messages) ? item.messages : [];
      currentHistoryId = item.id;
      renderMessages();
      $("#sidebar").classList.remove("open");
    });
    host.append(button);
  }
}

function addMessage(role, content) {
  const row = document.createElement("article");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "VOCÊ" : "G";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.append(avatar, bubble);
  messagesEl.append(row);
  $("#conversation").scrollTop = $("#conversation").scrollHeight;
}

function renderMessages() {
  messagesEl.replaceChildren();
  welcomeEl.hidden = messages.length > 0;
  for (const message of messages) addMessage(message.role, message.content);
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  sendButton.querySelector("span").textContent = value ? "Aguarde" : "Enviar";
}

async function sendMessage(text) {
  const content = (text ?? promptInput.value).trim();
  if (!content || busy) return;
  if (content.length > 8000) return showToast("A mensagem ultrapassa 8.000 caracteres.");

  welcomeEl.hidden = true;
  messages.push({ role: "user", content });
  addMessage("user", content);
  promptInput.value = "";
  promptInput.style.height = "auto";
  setBusy(true);

  const typing = document.createElement("article");
  typing.className = "message";
  typing.id = "typingIndicator";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "G";
  const dots = document.createElement("div");
  dots.className = "bubble typing";
  dots.setAttribute("aria-label", "GEON está respondendo");
  for (let i = 0; i < 3; i++) dots.append(document.createElement("i"));
  typing.append(avatar, dots);
  messagesEl.append(typing);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-20) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível obter uma resposta.");
    if (typeof data.reply !== "string") throw new Error("Resposta inválida do serviço.");
    messages.push({ role: "assistant", content: data.reply });
    $("#typingIndicator")?.remove();
    addMessage("assistant", data.reply);
    saveHistory();
  } catch (error) {
    $("#typingIndicator")?.remove();
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    addMessage("assistant", `Não consegui concluir agora. ${message}`);
    showToast(message);
  } finally {
    setBusy(false);
    promptInput.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage();
});
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
});
promptInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
$("#newChat").addEventListener("click", () => {
  messages = [];
  currentHistoryId = null;
  renderMessages();
  promptInput.focus();
  $("#sidebar").classList.remove("open");
});
$("#clearChat").addEventListener("click", () => {
  messages = [];
  currentHistoryId = null;
  renderMessages();
  showToast("Conversa atual limpa.");
});
$("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
renderHistory();
