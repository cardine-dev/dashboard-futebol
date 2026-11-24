-- Índices de performance (listagem/filtros de transferências, chat e relatórios).
-- Busca "contains insensitive" vira ILIKE '%q%': só índice GIN trigram ajuda.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Transferencia
CREATE INDEX "Transferencia_dataTransferencia_atletaNome_idx" ON "Transferencia"("dataTransferencia" DESC, "atletaNome");
CREATE INDEX "Transferencia_clubeOrigem_idx" ON "Transferencia"("clubeOrigem");
CREATE INDEX "Transferencia_clubeDestino_idx" ON "Transferencia"("clubeDestino");
CREATE INDEX "Transferencia_atletaNome_trgm_idx" ON "Transferencia" USING GIN ("atletaNome" gin_trgm_ops);
CREATE INDEX "Transferencia_clubeOrigem_trgm_idx" ON "Transferencia" USING GIN ("clubeOrigem" gin_trgm_ops);
CREATE INDEX "Transferencia_clubeDestino_trgm_idx" ON "Transferencia" USING GIN ("clubeDestino" gin_trgm_ops);
CREATE INDEX "Transferencia_clubeFormador_trgm_idx" ON "Transferencia" USING GIN ("clubeFormador" gin_trgm_ops);

-- ChatConversation: (userId) → (userId, updatedAt DESC)
DROP INDEX IF EXISTS "ChatConversation_userId_idx";
CREATE INDEX "ChatConversation_userId_updatedAt_idx" ON "ChatConversation"("userId", "updatedAt" DESC);

-- ChatMessage: (conversationId) → (conversationId, createdAt)
DROP INDEX IF EXISTS "ChatMessage_conversationId_idx";
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- Report: (userId) → (userId, createdAt DESC) + FK conversationId
DROP INDEX IF EXISTS "Report_userId_idx";
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt" DESC);
CREATE INDEX "Report_conversationId_idx" ON "Report"("conversationId");
