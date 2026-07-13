-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Comunicação: upgrade de status
-- Migra solicitações "Recebida" vinculadas a programações pendentes
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

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
