-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Integração Eventos ↔ Agenda
-- Adiciona colunas de rastreamento de aprovação na Agenda e
-- back-reference agenda_id na tabela eventos.
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colunas de integração na tabela agenda ─────────────────
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS evento_id          UUID REFERENCES eventos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem             TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS aprovado_por_nome  TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao    TEXT;

CREATE INDEX IF NOT EXISTS idx_agenda_evento_id ON public.agenda(evento_id) WHERE evento_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_origem    ON public.agenda(origem);

-- ── 2. Back-reference agenda_id na tabela eventos ────────────
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS agenda_id UUID REFERENCES agenda(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_id ON public.eventos(agenda_id) WHERE agenda_id IS NOT NULL;

-- ── 3. Verificação ────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'agenda'
  AND column_name  IN ('evento_id','origem','aprovado_por_nome','aprovado_em','motivo_rejeicao');
