-- ══════════════════════════════════════════════════════════════
-- SIPEN — Visualização pública do estacionamento (sem login)
-- Execute no SQL Editor do Supabase Dashboard.
-- ══════════════════════════════════════════════════════════════

-- View pública que une controles + nome do membro
CREATE OR REPLACE VIEW public.v_estacionamento_publico AS
SELECT
  c.id,
  c.codigo_controle,
  c.marca,
  c.status,
  c.status_pagamento,
  c.data_entrega,
  c.observacoes,
  c.updated_at,
  p.nome AS membro_nome
FROM public.controle_estacionamento_controles c
LEFT JOIN public.membros m ON m.id = c.membro_id AND m.deleted_at IS NULL
LEFT JOIN public.pessoas p ON p.id = m.pessoa_id AND p.deleted_at IS NULL
ORDER BY
  CASE c.status WHEN 'entregue' THEN 0 WHEN 'disponivel' THEN 1 ELSE 2 END,
  p.nome ASC NULLS LAST,
  c.codigo_controle ASC;

-- Permite anon ler a view pública
GRANT SELECT ON public.v_estacionamento_publico TO anon;

-- Policy SELECT para anon na tabela base (necessário para a view funcionar)
DROP POLICY IF EXISTS "ce_controles_select_anon" ON public.controle_estacionamento_controles;
CREATE POLICY "ce_controles_select_anon"
  ON public.controle_estacionamento_controles
  FOR SELECT TO anon
  USING (true);

-- Verificação
SELECT COUNT(*) FROM public.v_estacionamento_publico;
