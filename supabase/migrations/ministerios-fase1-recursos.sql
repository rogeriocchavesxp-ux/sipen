-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios Fase 1: coluna recursos + tipo ACOLHIMENTO
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Adicionar coluna recursos (jsonb) ──────────────────────
ALTER TABLE public.ministerios
  ADD COLUMN IF NOT EXISTS recursos jsonb;

-- ── 2. Adicionar tipo ACOLHIMENTO (remover e recriar constraint)
DO $$ BEGIN
  ALTER TABLE public.ministerios
    DROP CONSTRAINT IF EXISTS ministerios_tipo_check;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ministerios
    ADD CONSTRAINT ministerios_tipo_check CHECK (
      tipo IN (
        'MUSICA','JOVENS','INFANTIL','INTERCESSAO',
        'EVANGELISMO','DIACONIA','COMUNICACAO','ACOLHIMENTO','OUTRO'
      )
    );
EXCEPTION WHEN others THEN NULL; END $$;

-- ── 3. Popula recursos padrão por tipo ────────────────────────
UPDATE public.ministerios
SET recursos = '{"escalas":true,"programacoes":true,"reunioes":true,"documentos":false,"whatsapp":false,"modulo":"repertorio"}'
WHERE tipo = 'MUSICA' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":true,"reunioes":true,"documentos":false,"whatsapp":false,"modulo":"turmas"}'
WHERE tipo = 'INFANTIL' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":true,"reunioes":true,"documentos":false,"whatsapp":false,"modulo":"projetos"}'
WHERE tipo = 'JOVENS' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":false,"reunioes":true,"documentos":false,"whatsapp":false,"modulo":"projetos_missionarios"}'
WHERE tipo = 'EVANGELISMO' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":false,"reunioes":true,"documentos":true,"whatsapp":false,"modulo":"producoes"}'
WHERE tipo = 'COMUNICACAO' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":false,"reunioes":true,"documentos":false,"whatsapp":false,"modulo":"integracao"}'
WHERE tipo = 'ACOLHIMENTO' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":true,"programacoes":false,"reunioes":true,"documentos":false,"whatsapp":false}'
WHERE tipo = 'DIACONIA' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":true,"reunioes":true,"documentos":false,"whatsapp":false}'
WHERE tipo = 'INTERCESSAO' AND recursos IS NULL;

UPDATE public.ministerios
SET recursos = '{"escalas":false,"programacoes":false,"reunioes":false,"documentos":false,"whatsapp":false}'
WHERE (tipo = 'OUTRO' OR tipo IS NULL) AND recursos IS NULL;
