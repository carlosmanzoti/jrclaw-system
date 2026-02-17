-- Migration: AI / Confecção module
-- Creates chat_messages and ai_usage_logs tables

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  "caseId" TEXT REFERENCES cases(id),
  "projectId" TEXT REFERENCES projects(id),
  "userId" TEXT NOT NULL REFERENCES users(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages("sessionId");
CREATE INDEX idx_chat_messages_case ON chat_messages("caseId");
CREATE INDEX idx_chat_messages_user ON chat_messages("userId");

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "actionType" TEXT NOT NULL,
  "docType" TEXT,
  "tokensIn" INTEGER NOT NULL DEFAULT 0,
  "tokensOut" INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "costEstimated" DECIMAL(10,6) NOT NULL DEFAULT 0,
  "caseId" TEXT,
  "projectId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs("userId");
CREATE INDEX idx_ai_usage_logs_created ON ai_usage_logs("createdAt");
