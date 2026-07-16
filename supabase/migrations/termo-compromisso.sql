-- ════════════════════════════════════════════════════════════════════
-- SIPEN — Termo de Compromisso e Responsabilidade para Uso de Espaços
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Tabela de versões do termo ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_termos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao     TEXT        NOT NULL,
  hash       TEXT        NOT NULL,
  ativo      BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.agenda_termos (versao, hash, ativo)
VALUES ('2026-07', 'sipen-tcr-v1-2026-07', true)
ON CONFLICT DO NOTHING;

-- ── 2. Tabela de aceites ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_termo_aceites (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id        UUID        NOT NULL REFERENCES public.agenda(id) ON DELETE CASCADE,
  termo_id         UUID        NOT NULL REFERENCES public.agenda_termos(id),
  nome_responsavel TEXT,
  token_acesso     TEXT        UNIQUE NOT NULL,
  ip_origem        TEXT,
  user_agent       TEXT,
  aceito_em        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_termo_aceites_agenda  ON public.agenda_termo_aceites(agenda_id);
CREATE INDEX IF NOT EXISTS idx_termo_aceites_token   ON public.agenda_termo_aceites(token_acesso);

-- ── 3. Colunas em agenda ──────────────────────────────────────────
ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS token_termo  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS status_termo TEXT DEFAULT 'aguardando';

-- ── 4. RLS simples ────────────────────────────────────────────────
ALTER TABLE public.agenda_termos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_termo_aceites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_termos"  ON public.agenda_termos;
DROP POLICY IF EXISTS "auth_read_aceites" ON public.agenda_termo_aceites;

CREATE POLICY "anon_read_termos"  ON public.agenda_termos        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_read_aceites" ON public.agenda_termo_aceites  FOR SELECT TO authenticated       USING (true);

-- ── 5. aprovar_agendamento — gera token e registro pendente ───────
CREATE OR REPLACE FUNCTION public.aprovar_agendamento(
  p_agenda_id UUID,
  p_aprovador TEXT DEFAULT 'Administrador',
  p_obs       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   public.agenda%ROWTYPE;
  v_token TEXT;
  v_termo UUID;
BEGIN
  SELECT * INTO v_row FROM public.agenda WHERE id = p_agenda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Agendamento não encontrado.');
  END IF;

  v_token := replace(gen_random_uuid()::TEXT,'-','') || replace(gen_random_uuid()::TEXT,'-','');

  SELECT id INTO v_termo FROM public.agenda_termos WHERE ativo = true ORDER BY created_at DESC LIMIT 1;

  UPDATE public.agenda SET
    status               = 'confirmado',
    visibilidade_publica = true,
    aprovado_por_nome    = p_aprovador,
    aprovado_em          = NOW(),
    obs                  = COALESCE(p_obs, obs),
    token_termo          = v_token,
    status_termo         = 'aguardando',
    notif_historico      = COALESCE(notif_historico, '[]'::jsonb) || jsonb_build_object(
      'evento', 'aprovado', 'em', NOW()::TEXT, 'por', p_aprovador
    )
  WHERE id = p_agenda_id;

  IF v_termo IS NOT NULL THEN
    INSERT INTO public.agenda_termo_aceites (agenda_id, termo_id, nome_responsavel, token_acesso)
    VALUES (p_agenda_id, v_termo, v_row.solicitante_txt, v_token);
  END IF;

  RETURN jsonb_build_object(
    'ok',                true,
    'protocolo',         v_row.protocolo,
    'titulo',            v_row.titulo,
    'telefone',          v_row.solicitante_tel,
    'solicitante',       v_row.solicitante_txt,
    'data',              v_row.data::TEXT,
    'data_encerramento', v_row.data_encerramento::TEXT,
    'hora_inicio',       v_row.hora_inicio,
    'hora_fim',          v_row.hora_fim,
    'espaco',            v_row.espaco,
    'token_termo',       v_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_agendamento TO authenticated;

-- ── 6. carregar_termo (público — via token) ───────────────────────
CREATE OR REPLACE FUNCTION public.carregar_termo(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aceite public.agenda_termo_aceites%ROWTYPE;
  v_agenda public.agenda%ROWTYPE;
  v_termo  public.agenda_termos%ROWTYPE;
BEGIN
  SELECT * INTO v_aceite FROM public.agenda_termo_aceites WHERE token_acesso = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Link inválido ou expirado.');
  END IF;

  SELECT * INTO v_agenda FROM public.agenda WHERE id = v_aceite.agenda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Agendamento não encontrado.');
  END IF;

  SELECT * INTO v_termo FROM public.agenda_termos WHERE id = v_aceite.termo_id;

  RETURN jsonb_build_object(
    'ok',           true,
    'protocolo',    v_agenda.protocolo,
    'titulo',       v_agenda.titulo,
    'data',         v_agenda.data::TEXT,
    'data_enc',     v_agenda.data_encerramento::TEXT,
    'hora_inicio',  v_agenda.hora_inicio,
    'hora_fim',     v_agenda.hora_fim,
    'espaco',       v_agenda.espaco,
    'solicitante',  v_agenda.solicitante_txt,
    'status_termo', v_agenda.status_termo,
    'versao_termo', v_termo.versao,
    'ja_aceito',    (v_aceite.aceito_em IS NOT NULL),
    'aceito_em',    v_aceite.aceito_em
  );
END;
$$;

REVOKE ALL ON FUNCTION public.carregar_termo FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.carregar_termo(TEXT) TO anon, authenticated;

-- ── 7. aceitar_termo (público — via token) ────────────────────────
CREATE OR REPLACE FUNCTION public.aceitar_termo(
  p_token      TEXT,
  p_ip         TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aceite public.agenda_termo_aceites%ROWTYPE;
  v_agenda public.agenda%ROWTYPE;
BEGIN
  SELECT * INTO v_aceite FROM public.agenda_termo_aceites WHERE token_acesso = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Link inválido ou expirado.');
  END IF;

  IF v_aceite.aceito_em IS NOT NULL THEN
    SELECT protocolo, titulo, data INTO v_agenda.protocolo, v_agenda.titulo, v_agenda.data
    FROM public.agenda WHERE id = v_aceite.agenda_id;
    RETURN jsonb_build_object('ok', true, 'ja_aceito', true, 'aceito_em', v_aceite.aceito_em);
  END IF;

  UPDATE public.agenda_termo_aceites SET
    aceito_em  = NOW(),
    ip_origem  = p_ip,
    user_agent = p_user_agent
  WHERE token_acesso = p_token;

  UPDATE public.agenda SET
    status_termo    = 'aceito',
    notif_historico = COALESCE(notif_historico, '[]'::jsonb) || jsonb_build_object(
      'evento', 'termo_aceito', 'em', NOW()::TEXT
    )
  WHERE id = v_aceite.agenda_id;

  SELECT * INTO v_agenda FROM public.agenda WHERE id = v_aceite.agenda_id;

  RETURN jsonb_build_object(
    'ok',        true,
    'protocolo', v_agenda.protocolo,
    'titulo',    v_agenda.titulo,
    'data',      v_agenda.data::TEXT,
    'espaco',    v_agenda.espaco,
    'aceito_em', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.aceitar_termo FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aceitar_termo(TEXT,TEXT,TEXT) TO anon, authenticated;
