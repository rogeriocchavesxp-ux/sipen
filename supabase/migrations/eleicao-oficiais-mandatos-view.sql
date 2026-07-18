-- ══════════════════════════════════════════════════════════════
-- SIPEN — View pública: oficiais com mandatos
-- Usada na página pública eleicoes.html para exibir
-- quais oficiais têm mandato vencendo no ano do processo.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_eleicao_oficiais_mandatos
WITH (security_invoker = false)
AS
SELECT
  o.id,
  p.nome,
  o.cargo,
  o.fim_mandato,
  o.posse,
  o.mandato_numero
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
WHERE o.status    = 'ativo'
  AND o.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY o.cargo, p.nome;

GRANT SELECT ON public.v_eleicao_oficiais_mandatos TO anon;
GRANT SELECT ON public.v_eleicao_oficiais_mandatos TO authenticated;
