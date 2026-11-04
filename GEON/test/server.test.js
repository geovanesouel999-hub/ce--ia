import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../server.js";

async function withServer(run) {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health informa a identidade GEON e as capacidades configuradas", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.app, "GEON");
    assert.equal(data.ok, true);
    assert.equal(typeof data.features, "object");
  });
});

test("configuração pública não expõe segredos", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/config`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.equal(body.includes("OPENAI_API_KEY"), false);
    assert.equal(body.includes("TAVILY_API_KEY"), false);
    assert.equal(body.includes("SESSION_SECRET"), false);
  });
});

test("API bloqueia requisições mutáveis de outra origem", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://origem-maliciosa.example" },
      body: JSON.stringify({ messages: [{ role: "user", content: "teste" }] })
    });
    assert.equal(response.status, 403);
  });
});
