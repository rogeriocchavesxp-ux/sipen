-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Eleições de Diretoria
-- Adiciona suporte ao tipo 'diretoria' nos processos eleitorais,
-- com cargos livres (Vice-presidente, Secretário etc.)
-- Execute no Supabase SQL Editor do projeto SIPEN
-- ═══════════════════════════════════════════════════════════════

-- 1. Adicionar 'diretoria' ao CHECK de eleicao_processos.tipo
ALTER TABLE public.eleicao_processos
  DROP CONSTRAINT IF EXISTS eleicao_processos_tipo_check;
ALTER TABLE public.eleicao_processos
  ADD CONSTRAINT eleicao_processos_tipo_check
  CHECK (tipo IN ('presbiteros','diaconos','ambos','diretoria'));

-- 2. Coluna para lista de cargos da eleição de diretoria
ALTER TABLE public.eleicao_processos
  ADD COLUMN IF NOT EXISTS cargos_diretoria JSONB;

-- 3. Coluna de cargo específico no candidato (para diretoria)
ALTER TABLE public.eleicao_candidatos
  ADD COLUMN IF NOT EXISTS cargo TEXT;

-- 4. Coluna de limite de votos por cargo para diretoria
ALTER TABLE public.eleicao_votacao_config
  ADD COLUMN IF NOT EXISTS max_votos_diretoria INTEGER DEFAULT 1;
