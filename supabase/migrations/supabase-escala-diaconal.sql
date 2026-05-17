-- ═══════════════════════════════════════════════════════════════════
-- SIPEN — Escala da Junta Diaconal
-- v6.30.57 | Criado em 2026-05-17
-- ═══════════════════════════════════════════════════════════════════

-- ── Tabela principal ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escala_diaconal (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_ref         text        NOT NULL,           -- YYYY-MM  ex: 2026-05
  data            date        NOT NULL,
  programacao     text        NOT NULL,
  posto           text        NOT NULL,
  diacono_id      uuid        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  diacono_nome    text        NOT NULL DEFAULT '', -- nome livre / fallback p/ quando não vinculado
  horario_chegada time,
  troca_obs       text,                           -- troca, pagamento ou substituição
  obs             text,
  ordem           integer     NOT NULL DEFAULT 0,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_escala_diaconal_mes    ON public.escala_diaconal(mes_ref)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_escala_diaconal_data   ON public.escala_diaconal(data)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_escala_diaconal_diaco  ON public.escala_diaconal(diacono_id) WHERE deleted_at IS NULL;

CALL public.apply_updated_at('escala_diaconal');

-- ── View de consulta ─────────────────────────────────────────────────
-- Resolve o nome do diácono via JOIN com pessoas; usa diacono_nome como fallback.
CREATE OR REPLACE VIEW public.v_escala_diaconal AS
SELECT
  e.id,
  e.mes_ref,
  e.data,
  e.programacao,
  e.posto,
  e.diacono_id,
  COALESCE(NULLIF(p.nome, ''), e.diacono_nome) AS diacono,
  e.diacono_nome                               AS diacono_nome_livre,
  e.horario_chegada,
  e.troca_obs,
  e.obs,
  e.ordem,
  e.created_by,
  e.created_at,
  e.updated_at
FROM  public.escala_diaconal e
LEFT  JOIN public.pessoas p ON p.id = e.diacono_id AND p.deleted_at IS NULL
WHERE e.deleted_at IS NULL;

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.escala_diaconal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escala_diaconal_read"   ON public.escala_diaconal;
DROP POLICY IF EXISTS "escala_diaconal_insert" ON public.escala_diaconal;
DROP POLICY IF EXISTS "escala_diaconal_update" ON public.escala_diaconal;
DROP POLICY IF EXISTS "escala_diaconal_delete" ON public.escala_diaconal;

-- Leitura: qualquer autenticado
CREATE POLICY "escala_diaconal_read"
  ON public.escala_diaconal FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Escrita controlada no app (permissão JUNTA_DIACONAL verificada no JS)
CREATE POLICY "escala_diaconal_insert"
  ON public.escala_diaconal FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "escala_diaconal_update"
  ON public.escala_diaconal FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "escala_diaconal_delete"
  ON public.escala_diaconal FOR DELETE
  USING (auth.role() = 'authenticated');

-- ── Grants ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_diaconal   TO authenticated;
GRANT SELECT                         ON public.v_escala_diaconal TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- SEED — Escala de Maio/2026  (preencher após vincular diáconos)
-- ═══════════════════════════════════════════════════════════════════
--
-- Fluxo recomendado:
-- 1. Execute este script no SQL Editor do Supabase para criar as tabelas.
-- 2. No SIPEN, acesse Junta Diaconal → Escalas.
-- 3. Use o botão "+ Lançamento" para inserir os dados do PDF.
-- 4. Os diáconos serão vinculados automaticamente via o cadastro de Oficiais.
--
-- Alternativamente, para inserção em lote, use o modelo abaixo após
-- localizar os UUIDs dos diáconos em public.pessoas:
--
-- INSERT INTO public.escala_diaconal
--   (mes_ref, data, programacao, posto, diacono_id, diacono_nome, horario_chegada)
-- VALUES
--   ('2026-05', '2026-05-04', 'Culto Matinal',    'Hall / Templo',            '<uuid-pessoa>', 'Nome do Diácono', '08:30'),
--   ('2026-05', '2026-05-04', 'Culto Matinal',    'Galeria / Ronda',          '<uuid-pessoa>', 'Nome do Diácono', '08:30'),
--   ('2026-05', '2026-05-04', 'Culto Matinal',    'Estacionamento (Igreja)',  '<uuid-pessoa>', 'Nome do Diácono', '08:15'),
--   ('2026-05', '2026-05-04', 'Culto Vespertino', 'Hall / Templo',            '<uuid-pessoa>', 'Nome do Diácono', '17:30'),
--   -- ... demais linhas do PDF
-- ;
--
-- Para consultar os UUIDs dos diáconos ativos:
--   SELECT pessoa_id, nome FROM public.v_oficiais
--   WHERE cargo = 'diacono' AND status IN ('ativo','especial')
--   ORDER BY nome;
