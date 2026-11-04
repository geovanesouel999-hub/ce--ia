import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;
export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 15000
    })
  : null;

export async function initializeDatabase() {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geon_conversations (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      title VARCHAR(80) NOT NULL,
      messages JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS geon_conversations_user_updated_idx ON geon_conversations (user_id, updated_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geon_agent_runs (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      task VARCHAR(5000) NOT NULL,
      specialists JSONB NOT NULL,
      result TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS geon_agent_runs_user_created_idx ON geon_agent_runs (user_id, created_at DESC)`);
  return true;
}

function requirePool() {
  if (!pool) {
    const error = new Error("Memória em nuvem não configurada.");
    error.code = "MEMORY_DISABLED";
    throw error;
  }
}

export async function listConversations(userId) {
  requirePool();
  const { rows } = await pool.query(
    "SELECT id, title, created_at, updated_at, jsonb_array_length(messages) AS message_count FROM geon_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50",
    [userId]
  );
  return rows;
}

export async function getConversation(userId, id) {
  requirePool();
  const { rows } = await pool.query(
    "SELECT id, title, messages, created_at, updated_at FROM geon_conversations WHERE user_id = $1 AND id = $2 LIMIT 1",
    [userId, id]
  );
  return rows[0] || null;
}

export async function saveConversation(userId, id, messages, title) {
  requirePool();
  const { rows } = await pool.query(
    `INSERT INTO geon_conversations (id, user_id, title, messages)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, messages = EXCLUDED.messages, updated_at = NOW()
     WHERE geon_conversations.user_id = EXCLUDED.user_id
     RETURNING id, title, created_at, updated_at`,
    [id, userId, title, JSON.stringify(messages)]
  );
  if (!rows[0]) {
    const error = new Error("Conversa não encontrada para este usuário.");
    error.code = "CONVERSATION_CONFLICT";
    throw error;
  }
  return rows[0];
}

export async function deleteConversation(userId, id) {
  requirePool();
  const result = await pool.query("DELETE FROM geon_conversations WHERE user_id = $1 AND id = $2", [userId, id]);
  return result.rowCount > 0;
}

export async function deleteAllConversations(userId) {
  requirePool();
  const result = await pool.query("DELETE FROM geon_conversations WHERE user_id = $1", [userId]);
  return result.rowCount;
}

export async function exportConversations(userId) {
  requirePool();
  const { rows } = await pool.query(
    "SELECT id, title, messages, created_at, updated_at FROM geon_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50",
    [userId]
  );
  return rows;
}

export async function databaseIsHealthy() {
  if (!pool) return false;
  await pool.query("SELECT 1");
  return true;
}


export async function saveAgentRun(userId, id, task, workflow) {
  requirePool();
  const specialists = Array.isArray(workflow?.specialists) ? workflow.specialists : [];
  const result = typeof workflow?.result === "string" ? workflow.result : "";
  const { rows } = await pool.query(
    `INSERT INTO geon_agent_runs (id, user_id, task, specialists, result)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, task, created_at`,
    [id, userId, task, JSON.stringify(specialists), result]
  );
  if (!rows[0]) {
    const error = new Error("Não foi possível registrar a execução multiagente.");
    error.code = "AGENT_RUN_CONFLICT";
    throw error;
  }
  await pool.query(
    `DELETE FROM geon_agent_runs
     WHERE user_id = $1 AND id NOT IN (
       SELECT id FROM geon_agent_runs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50
     )`,
    [userId]
  );
  return rows[0];
}

export async function listAgentRuns(userId) {
  requirePool();
  const { rows } = await pool.query(
    "SELECT id, task, created_at, jsonb_array_length(specialists) AS specialist_count FROM geon_agent_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId]
  );
  return rows;
}

export async function getAgentRun(userId, id) {
  requirePool();
  const { rows } = await pool.query(
    "SELECT id, task, specialists, result, created_at FROM geon_agent_runs WHERE user_id = $1 AND id = $2 LIMIT 1",
    [userId, id]
  );
  return rows[0] || null;
}

export async function deleteAgentRun(userId, id) {
  requirePool();
  const result = await pool.query(
    "DELETE FROM geon_agent_runs WHERE user_id = $1 AND id = $2",
    [userId, id]
  );
  return result.rowCount > 0;
}
