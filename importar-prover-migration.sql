-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Migration para importação Base Prover
-- Execute este script UMA VEZ antes de rodar o ETL
-- Gerado em 2026-04-22
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. COLUNAS ADICIONAIS EM pessoas ─────────────────────────────────
-- Campos que existem na Base Prover mas não estavam no schema v2

ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS apelido              text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS nome_mae             text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS nome_pai             text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS naturalidade         text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS profissao            text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS empresa              text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS escolaridade         text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS procedencia_religiosa text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS dizimista            boolean NOT NULL DEFAULT false;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS tipo_sanguineo       text;

-- ID original do sistema Prover (para auditoria e re-importação idempotente)
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS prover_id            text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_prover_id
  ON public.pessoas(prover_id) WHERE prover_id IS NOT NULL AND deleted_at IS NULL;


-- ── 2. COLUNAS ADICIONAIS EM membros ──────────────────────────────────

ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS numero_rol            text;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS data_profissao_fe     date;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS data_reuniao_conselho date;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS data_visita_conselho  date;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS curso_novos_membros   date;
ALTER TABLE public.membros ADD COLUMN IF NOT EXISTS tipo_pessoa_prover    text;


-- ── 3. COLUNAS ADICIONAIS EM visitantes ───────────────────────────────

ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS data_visita_prover date;


-- ── 4. TABELA pessoa_congregacoes (N:N) ───────────────────────────────
-- Resolve o campo multivalorado "Congregações" do Prover

CREATE TABLE IF NOT EXISTS public.pessoa_congregacoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid        NOT NULL REFERENCES public.pessoas(id)       ON DELETE CASCADE,
  congregacao_id  uuid        NOT NULL REFERENCES public.congregacoes(id)  ON DELETE CASCADE,
  tipo_vinculo    text        NOT NULL DEFAULT 'membro'
                              CHECK (tipo_vinculo IN ('membro','visitante','lider','pastor','funcionario')),
  principal       boolean     NOT NULL DEFAULT false,
  ativo           boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, congregacao_id)
);

CREATE INDEX IF NOT EXISTS idx_pcong_pessoa     ON public.pessoa_congregacoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pcong_congregacao ON public.pessoa_congregacoes(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_pcong_principal  ON public.pessoa_congregacoes(congregacao_id) WHERE principal = true;


-- ── 5. TABELA pessoa_ministerios (N:N) ────────────────────────────────
-- Resolve o campo multivalorado "Ministérios" do Prover

CREATE TABLE IF NOT EXISTS public.pessoa_ministerios (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   uuid        NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  ministerio  text        NOT NULL,
  funcao      text,
  status      text        NOT NULL DEFAULT 'ativo'
              CHECK (status IN ('ativo','inativo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, ministerio)
);

CREATE INDEX IF NOT EXISTS idx_pmin_pessoa    ON public.pessoa_ministerios(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pmin_ministerio ON public.pessoa_ministerios(ministerio);


-- ── 6. RLS nas novas tabelas ──────────────────────────────────────────

ALTER TABLE public.pessoa_congregacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoa_ministerios  ENABLE ROW LEVEL SECURITY;

DO $pol$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pessoa_congregacoes','pessoa_ministerios'] LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "auth_select_%I"  ON public.%I FOR SELECT  TO authenticated USING (true);
       CREATE POLICY IF NOT EXISTS "auth_insert_%I"  ON public.%I FOR INSERT  TO authenticated WITH CHECK (true);
       CREATE POLICY IF NOT EXISTS "auth_update_%I"  ON public.%I FOR UPDATE  TO authenticated USING (true) WITH CHECK (true);
       CREATE POLICY IF NOT EXISTS "auth_delete_%I"  ON public.%I FOR DELETE  TO authenticated USING (true);
       CREATE POLICY IF NOT EXISTS "service_all_%I"  ON public.%I FOR ALL     TO service_role  USING (true) WITH CHECK (true);',
      t,t, t,t, t,t, t,t, t,t);
  END LOOP;
END $pol$;


-- ── 7. VIEW para consulta completa de pessoa + vínculos ───────────────

CREATE OR REPLACE VIEW public.v_pessoas_completo AS
SELECT
  p.id,
  p.nome,
  p.apelido,
  p.cpf,
  p.rg,
  p.data_nascimento,
  p.genero::text        AS genero,
  p.estado_civil::text  AS estado_civil,
  p.telefone,
  p.celular,
  p.email,
  p.endereco,
  p.numero,
  p.complemento,
  p.bairro,
  p.cidade,
  p.estado,
  p.cep,
  p.profissao,
  p.empresa,
  p.escolaridade,
  p.procedencia_religiosa,
  p.dizimista,
  p.naturalidade,
  p.nome_mae,
  p.nome_pai,
  p.foto_url,
  p.observacoes,
  p.prover_id,
  -- Vínculo principal
  CASE
    WHEN o.id  IS NOT NULL THEN o.cargo::text
    WHEN m.id  IS NOT NULL AND m.tipo_pessoa_prover = 'PASTOR'  THEN 'pastor'
    WHEN m.id  IS NOT NULL THEN 'membro'
    WHEN s.id  IS NOT NULL THEN 'seminarista'
    WHEN ct.id IS NOT NULL THEN 'contratado'
    WHEN v.id  IS NOT NULL THEN 'visitante'
    ELSE 'pessoa'
  END AS vinculo,
  m.status::text        AS status_membro,
  m.data_ingresso,
  m.tipo_ingresso,
  m.data_batismo,
  m.numero_rol,
  -- Congregação principal
  (SELECT c.nome FROM public.pessoa_congregacoes pc
   JOIN public.congregacoes c ON c.id = pc.congregacao_id
   WHERE pc.pessoa_id = p.id AND pc.principal = true AND pc.ativo = true
   LIMIT 1) AS congregacao_principal,
  -- Ministérios (array)
  (SELECT array_agg(ministerio ORDER BY ministerio)
   FROM public.pessoa_ministerios
   WHERE pessoa_id = p.id AND status = 'ativo') AS ministerios,
  p.created_at,
  p.updated_at
FROM public.pessoas p
LEFT JOIN public.oficiais     o  ON o.pessoa_id  = p.id AND o.status IN ('ativo','especial') AND o.deleted_at IS NULL
LEFT JOIN public.membros      m  ON m.pessoa_id  = p.id AND m.status  = 'ativo'              AND m.deleted_at IS NULL
LEFT JOIN public.seminaristas s  ON s.pessoa_id  = p.id AND s.status  = 'ativo'              AND s.deleted_at IS NULL
LEFT JOIN public.contratados  ct ON ct.pessoa_id = p.id AND ct.status = 'ativo'              AND ct.deleted_at IS NULL
LEFT JOIN public.visitantes   v  ON v.pessoa_id  = p.id                                       AND v.deleted_at IS NULL
WHERE p.deleted_at IS NULL
ORDER BY p.nome;


-- ══════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- Após executar, rode: python3 importar-prover.py
-- ══════════════════════════════════════════════════════════════════════
