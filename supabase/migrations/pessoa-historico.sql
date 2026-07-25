-- ════════════════════════════════════════════════════════════════
-- SIPEN — Histórico de Eventos por Pessoa
-- Cria tabela pessoa_eventos + triggers automáticos
-- Faz backfill dos dados históricos existentes
-- ════════════════════════════════════════════════════════════════

-- ── 1. Tabela ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pessoa_eventos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id       uuid        NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  evento_tipo     text        NOT NULL,
  -- tipos: ingresso | batismo | status_membro
  --        ministerio_entrada | ministerio_inativado | ministerio_reativado | ministerio_removido | ministerio_funcao
  --        sociedade_entrada  | sociedade_saida      | sociedade_cargo
  descricao       text        NOT NULL,
  referencia_id   uuid,
  referencia_tipo text,       -- 'membros' | 'ministerio_membros' | 'nomeados'
  data_evento     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid
);

CREATE INDEX IF NOT EXISTS idx_pev_pessoa      ON public.pessoa_eventos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pev_data        ON public.pessoa_eventos(data_evento DESC NULLS LAST);
-- impede duplicatas no backfill e nos triggers
CREATE UNIQUE INDEX IF NOT EXISTS idx_pev_ref
  ON public.pessoa_eventos(referencia_id, evento_tipo)
  WHERE referencia_id IS NOT NULL;

ALTER TABLE public.pessoa_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pev_sel" ON public.pessoa_eventos;
DROP POLICY IF EXISTS "pev_ins" ON public.pessoa_eventos;
DROP POLICY IF EXISTS "pev_del" ON public.pessoa_eventos;

CREATE POLICY "pev_sel" ON public.pessoa_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pev_ins" ON public.pessoa_eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pev_del" ON public.pessoa_eventos FOR DELETE TO authenticated USING (true);

-- ── 2. Trigger: ministerio_membros ────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_ministerio_membros_evento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nome text;
BEGIN
  SELECT nome INTO v_nome FROM public.ministerios
  WHERE id = COALESCE(NEW.ministerio_id, OLD.ministerio_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pessoa_eventos
      (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
    VALUES
      (NEW.pessoa_id, 'ministerio_entrada',
       'Entrou no ministério: ' || COALESCE(v_nome, 'Ministério'),
       NEW.id, 'ministerio_membros', CURRENT_DATE)
    ON CONFLICT DO NOTHING;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'inativo' THEN
        INSERT INTO public.pessoa_eventos
          (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
        VALUES
          (OLD.pessoa_id, 'ministerio_inativado',
           'Desvinculado do ministério: ' || COALESCE(v_nome, 'Ministério'),
           OLD.id, 'ministerio_membros', CURRENT_DATE)
        ON CONFLICT DO NOTHING;
      ELSIF NEW.status = 'ativo' THEN
        INSERT INTO public.pessoa_eventos
          (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
        VALUES
          (NEW.pessoa_id, 'ministerio_reativado',
           'Reativado no ministério: ' || COALESCE(v_nome, 'Ministério'),
           NEW.id, 'ministerio_membros', CURRENT_DATE)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    IF NEW.funcao IS DISTINCT FROM OLD.funcao THEN
      INSERT INTO public.pessoa_eventos
        (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
      VALUES
        (NEW.pessoa_id, 'ministerio_funcao',
         'Função alterada em ' || COALESCE(v_nome, 'Ministério') || ': ' ||
         COALESCE(OLD.funcao,'—') || ' → ' || COALESCE(NEW.funcao,'—'),
         NULL, 'ministerio_membros', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.pessoa_eventos
      (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
    VALUES
      (OLD.pessoa_id, 'ministerio_removido',
       'Removido do ministério: ' || COALESCE(v_nome, 'Ministério'),
       NULL, 'ministerio_membros', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ministerio_membros_evento ON public.ministerio_membros;
CREATE TRIGGER trg_ministerio_membros_evento
  AFTER INSERT OR UPDATE OF status, funcao OR DELETE
  ON public.ministerio_membros
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_ministerio_membros_evento();

-- ── 3. Trigger: membros (status) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_membros_status_evento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.pessoa_eventos
      (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
    VALUES
      (NEW.pessoa_id, 'status_membro',
       'Status: ' || COALESCE(OLD.status,'—') || ' → ' || NEW.status,
       NEW.id, 'membros', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membros_status_evento ON public.membros;
CREATE TRIGGER trg_membros_status_evento
  AFTER UPDATE OF status ON public.membros
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_membros_status_evento();

-- ── 4. Trigger: nomeados (sociedades) ─────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_nomeados_sociedade_evento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.orgao_tipo <> 'sociedade' OR NEW.pessoa_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pessoa_eventos
      (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
    VALUES
      (NEW.pessoa_id, 'sociedade_entrada',
       'Entrou na sociedade: ' || NEW.orgao,
       NEW.id, 'nomeados', COALESCE(NEW.data_inicio, CURRENT_DATE))
    ON CONFLICT DO NOTHING;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO public.pessoa_eventos
        (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
      VALUES
        (NEW.pessoa_id, 'sociedade_saida',
         'Desligado da sociedade: ' || NEW.orgao,
         NEW.id, 'nomeados', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.cargo IS DISTINCT FROM OLD.cargo AND NEW.cargo IS NOT NULL AND OLD.deleted_at IS NULL THEN
      INSERT INTO public.pessoa_eventos
        (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento)
      VALUES
        (NEW.pessoa_id, 'sociedade_cargo',
         'Cargo em ' || NEW.orgao || ': ' || COALESCE(OLD.cargo,'—') || ' → ' || NEW.cargo,
         NULL, 'nomeados', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nomeados_sociedade_evento ON public.nomeados;
CREATE TRIGGER trg_nomeados_sociedade_evento
  AFTER INSERT OR UPDATE ON public.nomeados
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_nomeados_sociedade_evento();

-- ── 5. Backfill de dados históricos ───────────────────────────

-- Ingresso na Igreja
INSERT INTO public.pessoa_eventos
  (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento, created_at)
SELECT
  mb.pessoa_id,
  'ingresso',
  'Ingresso na Igreja' ||
    CASE mb.tipo_ingresso
      WHEN 'batismo'         THEN ' — Batismo'
      WHEN 'profissao_de_fe' THEN ' — Profissão de Fé'
      WHEN 'transferencia'   THEN ' — Transferência'
      WHEN 'restauracao'     THEN ' — Restauração'
      ELSE COALESCE(' — ' || mb.tipo_ingresso, '')
    END,
  mb.id, 'membros',
  mb.data_ingresso,
  COALESCE(mb.data_ingresso::timestamptz, now())
FROM public.membros mb
WHERE mb.data_ingresso IS NOT NULL
ON CONFLICT DO NOTHING;

-- Batismo (quando diferente da data de ingresso)
INSERT INTO public.pessoa_eventos
  (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento, created_at)
SELECT
  mb.pessoa_id,
  'batismo',
  'Batismo',
  mb.id, 'membros',
  mb.data_batismo,
  COALESCE(mb.data_batismo::timestamptz, now())
FROM public.membros mb
WHERE mb.data_batismo IS NOT NULL
  AND (mb.data_ingresso IS NULL OR mb.data_batismo <> mb.data_ingresso OR mb.tipo_ingresso <> 'batismo')
ON CONFLICT DO NOTHING;

-- Entrada em ministérios
INSERT INTO public.pessoa_eventos
  (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento, created_at)
SELECT
  mm.pessoa_id,
  'ministerio_entrada',
  'Entrou no ministério: ' || COALESCE(m.nome, 'Ministério'),
  mm.id, 'ministerio_membros',
  mm.created_at::date,
  mm.created_at
FROM public.ministerio_membros mm
JOIN public.ministerios m ON m.id = mm.ministerio_id
ON CONFLICT DO NOTHING;

-- Entrada em sociedades
INSERT INTO public.pessoa_eventos
  (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento, created_at)
SELECT
  n.pessoa_id,
  'sociedade_entrada',
  'Entrou na sociedade: ' || n.orgao,
  n.id, 'nomeados',
  COALESCE(n.data_inicio, n.criado_em::date),
  COALESCE(n.criado_em, now())
FROM public.nomeados n
WHERE n.orgao_tipo = 'sociedade' AND n.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Saída de sociedades já registradas
INSERT INTO public.pessoa_eventos
  (pessoa_id, evento_tipo, descricao, referencia_id, referencia_tipo, data_evento, created_at)
SELECT
  n.pessoa_id,
  'sociedade_saida',
  'Desligado da sociedade: ' || n.orgao,
  n.id, 'nomeados',
  COALESCE(n.data_fim, n.deleted_at::date),
  COALESCE(n.deleted_at, now())
FROM public.nomeados n
WHERE n.orgao_tipo = 'sociedade' AND n.pessoa_id IS NOT NULL AND n.deleted_at IS NOT NULL
ON CONFLICT DO NOTHING;
