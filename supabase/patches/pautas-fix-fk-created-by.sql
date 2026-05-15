-- ══════════════════════════════════════════════════════════════
-- SIPEN — Patch: corrige FK created_by nas tabelas de pautas
--
-- Causa: created_by foi criado com REFERENCES auth.users(id),
--        mas USUARIO_ATUAL.id retorna pessoas.id (tabela pública).
-- Solução: recriar as FKs apontando para public.pessoas(id).
-- ══════════════════════════════════════════════════════════════

-- ── conselho_reunioes ─────────────────────────────────────────
ALTER TABLE public.conselho_reunioes
  DROP CONSTRAINT IF EXISTS conselho_reunioes_created_by_fkey;

ALTER TABLE public.conselho_reunioes
  ADD CONSTRAINT conselho_reunioes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- ── conselho_pautas ───────────────────────────────────────────
ALTER TABLE public.conselho_pautas
  DROP CONSTRAINT IF EXISTS conselho_pautas_created_by_fkey;

ALTER TABLE public.conselho_pautas
  ADD CONSTRAINT conselho_pautas_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- ── conselho_pautas_historico ─────────────────────────────────
ALTER TABLE public.conselho_pautas_historico
  DROP CONSTRAINT IF EXISTS conselho_pautas_historico_alterado_por_fkey;

ALTER TABLE public.conselho_pautas_historico
  ADD CONSTRAINT conselho_pautas_historico_alterado_por_fkey
  FOREIGN KEY (alterado_por) REFERENCES public.pessoas(id) ON DELETE SET NULL;
