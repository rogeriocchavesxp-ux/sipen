-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Comunicação: upgrade de status
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Atualizar o CHECK constraint para aceitar os novos status
ALTER TABLE public.com_solicitacoes_arte
  DROP CONSTRAINT IF EXISTS com_solicitacoes_arte_status_check;

ALTER TABLE public.com_solicitacoes_arte
  ADD CONSTRAINT com_solicitacoes_arte_status_check
  CHECK (status IN (
    'Recebida',
    'Em análise',
    'Em produção',
    'Aguardando aprovação',
    'Aguardando aprovação da Administração',
    'Aprovada para produção',
    'Programação não aprovada',
    'Concluída',
    'Cancelada'
  ));

-- 2. Migrar registros existentes

-- Solicitações vinculadas a programações ainda pendentes de aprovação
UPDATE public.com_solicitacoes_arte c
SET    status        = 'Aguardando aprovação da Administração',
       atualizado_em = now()
FROM   public.agenda a
WHERE  c.agenda_id = a.id
  AND  c.status    = 'Recebida'
  AND  a.status    IN ('aguardando_aprovacao', 'em_analise', 'ajuste_solicitado');

-- Solicitações vinculadas a programações já aprovadas (confirmado)
UPDATE public.com_solicitacoes_arte c
SET    status        = 'Aprovada para produção',
       atualizado_em = now()
FROM   public.agenda a
WHERE  c.agenda_id = a.id
  AND  c.status    = 'Recebida'
  AND  a.status    = 'confirmado';

-- Solicitações vinculadas a programações recusadas
UPDATE public.com_solicitacoes_arte c
SET    status        = 'Programação não aprovada',
       atualizado_em = now()
FROM   public.agenda a
WHERE  c.agenda_id = a.id
  AND  c.status    = 'Recebida'
  AND  a.status    IN ('recusado', 'cancelado');
