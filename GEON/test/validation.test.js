import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, conversationTitle, normalizeResearchResults, validateMessages } from "../src/validation.js";
import { createIdentityToken, verifyIdentityToken, isUuid } from "../src/identity.js";

const userId = "d9a1cfa5-2a0b-4a0d-9f9e-34d3e9d3f0a1";
const secret = "test-secret-with-at-least-thirty-two-characters";

test("validateMessages normaliza mensagens válidas", () => {
  const result = validateMessages([{ role: "user", content: "  Olá GEON  " }]);
  assert.deepEqual(result, [{ role: "user", content: "Olá GEON" }]);
});

test("validateMessages rejeita papéis e tamanhos inválidos", () => {
  assert.throws(() => validateMessages([{ role: "system", content: "injetar" }]), /Formato/);
  assert.throws(() => validateMessages([{ role: "user", content: "   " }]), /caracteres/);
  assert.throws(() => validateMessages([{ role: "user", content: "x".repeat(12001) }]), /caracteres/);
});

test("modo de programação tem limites explícitos de execução", () => {
  const prompt = buildSystemPrompt("code");
  assert.match(prompt, /não executa código/);
  assert.match(prompt, /GEON/);
});

test("título da conversa é derivado da primeira mensagem do usuário", () => {
  assert.equal(conversationTitle([{ role: "assistant", content: "Oi" }, { role: "user", content: "  Projeto GEON  " }]), "Projeto GEON");
});

test("pesquisa mantém somente fontes HTTPS e limita o conteúdo", () => {
  const result = normalizeResearchResults({
    answer: "Resumo",
    results: [
      { title: "Fonte segura", url: "https://example.com", content: "x".repeat(2000) },
      { title: "Fonte insegura", url: "http://example.com", content: "não" },
      { title: "URL inválida", url: "javascript:alert(1)", content: "não" }
    ]
  });
  assert.equal(result.answer, "Resumo");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].content.length, 1400);
});

test("identidade anônima assinada valida e rejeita adulteração", () => {
  const token = createIdentityToken(userId, secret);
  assert.equal(verifyIdentityToken(token, secret), userId);
  assert.equal(verifyIdentityToken(`${userId}.assinatura-falsa`, secret), null);
  assert.equal(isUuid(userId), true);
  assert.equal(isUuid("not-a-uuid"), false);
});
