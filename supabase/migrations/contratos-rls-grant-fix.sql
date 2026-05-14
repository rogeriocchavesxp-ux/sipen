-- ═══════════════════════════════════════════════════════
-- SIPEN — Fix: RLS + GRANT + v_contratos para contratos
-- Problema: schema v2 criou políticas apenas para 'authenticated'.
-- Se o frontend usar a anon key (fallback), POST retorna [] vazio.
-- ═══════════════════════════════════════════════════════

-- 1. GRANT explícito para as roles que o frontend usa
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;

-- 2. Política SELECT para anon (schema v2 só criou para authenticated)
DO $$ BEGIN
  CREATE POLICY "anon_select_contratos"
    ON public.contratos FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Garante que a coluna 'responsavel' (text) existe
--    (adicionada por import-generall-contratos.sql para compat. com schema legado)
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS responsavel text;

-- 4. Recria v_contratos incluindo custos, responsavel text e responsavel_txt
-- (CREATE OR REPLACE não aceita mudança de posição de colunas existentes)
DROP VIEW IF EXISTS public.v_contratos CASCADE;
CREATE VIEW public.v_contratos AS
SELECT
  c.id,
  c.tipo::text                                     AS tipo,
  c.titulo,
  c.descricao,
  c.fornecedor,
  c.contato_fornecedor,
  c.proprietario,
  c.produto,
  c.valor,
  c.periodicidade,
  c.valor_segurado,
  c.forma_pagamento,
  c.data_inicio,
  c.data_vencimento,
  c.renovacao_automatica,
  c.status::text                                    AS status,
  c.num_licencas,
  c.tipo_licenca,
  c.endereco,
  c.indice_reajuste,
  c.perc_reajuste,
  c.num_apolice,
  c.tipo_seguro,
  COALESCE(p.nome, c.responsavel_txt, c.responsavel) AS responsavel,
  c.responsavel_txt,
  c.responsavel_id,
  c.observacoes,
  c.custos,
  c.deleted_at,
  c.created_at  AS criado_em,
  c.updated_at  AS atualizado_em
FROM public.contratos c
LEFT JOIN public.pessoas p ON p.id = c.responsavel_id
WHERE c.deleted_at IS NULL;

GRANT SELECT ON public.v_contratos TO anon, authenticated;

-- 5. Força PostgREST a recarregar o schema (sem precisar reiniciar)
NOTIFY pgrst, 'reload schema';
