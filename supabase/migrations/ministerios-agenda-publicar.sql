-- Integração: Programações de Ministérios → Agenda da Igreja
-- Adiciona colunas para rastrear solicitação de publicação na agenda

ALTER TABLE ministerio_programacoes
  ADD COLUMN IF NOT EXISTS agenda_id     uuid REFERENCES agenda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agenda_status text;

-- Índice para consultas por agenda_id
CREATE INDEX IF NOT EXISTS idx_min_prog_agenda_id ON ministerio_programacoes(agenda_id);
