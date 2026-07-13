-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Integração Agenda × Comunicação
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Novas colunas em com_solicitacoes_arte ─────────────────
ALTER TABLE public.com_solicitacoes_arte
  ADD COLUMN IF NOT EXISTS agenda_id        UUID REFERENCES public.agenda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agenda_protocolo TEXT,
  ADD COLUMN IF NOT EXISTS origem_vinculo   TEXT; -- 'formulario_publico' | 'admin' | 'manual'

CREATE INDEX IF NOT EXISTS idx_com_arte_agenda_id
  ON public.com_solicitacoes_arte(agenda_id)
  WHERE agenda_id IS NOT NULL;

-- ── 2. Nova coluna em agenda ──────────────────────────────────
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS precisa_arte BOOLEAN NOT NULL DEFAULT false;

-- ── 3. RPC pública: criar solicitação de arte vinculada ───────
-- Acessível por anon via SECURITY DEFINER.
-- Valida duplicidade, cria o registro, atualiza agenda.precisa_arte,
-- registra andamento automático.
DROP FUNCTION IF EXISTS public.criar_sol_comunicacao_publica(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT[],DATE,TEXT);

CREATE OR REPLACE FUNCTION public.criar_sol_comunicacao_publica(
  p_agenda_id         UUID,
  p_agenda_protocolo  TEXT,
  p_responsavel       TEXT    DEFAULT NULL,
  p_telefone          TEXT    DEFAULT NULL,
  p_descricao         TEXT    DEFAULT NULL,
  p_ministerio        TEXT    DEFAULT NULL,
  p_formatos          TEXT[]  DEFAULT NULL,
  p_prazo             DATE    DEFAULT NULL,
  p_informacoes       TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol_id    UUID;
  v_titulo    TEXT;
  v_min       TEXT;
  v_resp      TEXT;
  v_desc      TEXT;
BEGIN
  -- busca título do agendamento para textos automáticos
  SELECT titulo INTO v_titulo FROM public.agenda WHERE id = p_agenda_id LIMIT 1;

  -- verifica duplicidade (ignora canceladas)
  IF EXISTS (
    SELECT 1 FROM public.com_solicitacoes_arte
    WHERE agenda_id = p_agenda_id
      AND status NOT IN ('Cancelada')
  ) THEN
    -- retorna o id existente para o front redirecionar
    SELECT id INTO v_sol_id FROM public.com_solicitacoes_arte
    WHERE agenda_id = p_agenda_id AND status NOT IN ('Cancelada') LIMIT 1;
    RETURN jsonb_build_object(
      'ok',        false,
      'duplicado', true,
      'sol_id',    v_sol_id,
      'erro',      'Já existe uma solicitação de arte para esta programação.'
    );
  END IF;

  -- normaliza campos obrigatórios
  v_min  := COALESCE(NULLIF(TRIM(p_ministerio),''), 'Solicitação pública');
  v_resp := COALESCE(NULLIF(TRIM(p_responsavel),''), 'Solicitante');
  v_desc := COALESCE(
    NULLIF(TRIM(p_descricao),''),
    'Arte digital para a programação "' || COALESCE(v_titulo, p_agenda_protocolo) || '".'
  );

  INSERT INTO public.com_solicitacoes_arte (
    agenda_id, agenda_protocolo, origem_vinculo,
    ministerio_solicitante, responsavel_nome, telefone_whatsapp,
    descricao_demanda, formatos_divulgacao,
    prazo_entrega, informacoes_adicionais,
    areas_comunicacao, publico_alvo, anexos,
    status, criado_em, atualizado_em
  ) VALUES (
    p_agenda_id, p_agenda_protocolo, 'formulario_publico',
    v_min, v_resp, p_telefone,
    v_desc, COALESCE(p_formatos, ARRAY[]::TEXT[]),
    p_prazo, p_informacoes,
    ARRAY[]::TEXT[], ARRAY[]::TEXT[], '[]'::JSONB,
    'Recebida', now(), now()
  )
  RETURNING id INTO v_sol_id;

  -- sinaliza na agenda que há demanda de comunicação
  UPDATE public.agenda SET precisa_arte = true WHERE id = p_agenda_id;

  -- andamento automático
  INSERT INTO public.com_andamentos (sol_id, texto, automatico, criado_em)
  VALUES (
    v_sol_id,
    'Solicitação criada pelo formulário público de agendamentos.'
      || CASE WHEN p_agenda_protocolo IS NOT NULL
              THEN ' Protocolo: ' || p_agenda_protocolo || '.'
              ELSE '' END,
    true,
    now()
  );

  RETURN jsonb_build_object('ok', true, 'sol_id', v_sol_id);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_sol_comunicacao_publica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_sol_comunicacao_publica TO anon, authenticated;


-- ── 4. Política RLS: anon pode ler agenda pública (somente agenda) ──
-- (já existe política autenticada; adicionamos leitura de titulo/status
--  pela RPC via SECURITY DEFINER — não precisa expor tabela a anon)


-- ── 5. Verificação ────────────────────────────────────────────
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'com_solicitacoes_arte'
  AND column_name IN ('agenda_id','agenda_protocolo','origem_vinculo');
