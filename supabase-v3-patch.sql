-- ══════════════════════════════════════════════════════════════════════
-- SIPEN V3 — PATCH COMPLEMENTAR
-- Executar APÓS supabase-v3-incremental.sql ter rodado com sucesso
-- Gerado em: 2026-04-21
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 1: TRIGGER DE SINCRONIZAÇÃO
-- congregacoes.pastor_id/presbitero_id ficam desatualizados quando
-- oficiais é alterado. Agora que oficiais tem congregacao_id,
-- este trigger mantém os dois em sincronia automaticamente.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_sync_congregacao_lideranca()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Ao ativar um oficial com congregacao, atualiza o campo na congregação
  IF NEW.congregacao_id IS NOT NULL AND NEW.deleted_at IS NULL
     AND NEW.status IN ('ativo','especial') THEN
    IF NEW.cargo = 'pastor' THEN
      UPDATE public.congregacoes SET pastor_id = NEW.pessoa_id WHERE id = NEW.congregacao_id;
    ELSIF NEW.cargo = 'presbitero' THEN
      UPDATE public.congregacoes SET presbitero_id = NEW.pessoa_id WHERE id = NEW.congregacao_id;
    END IF;
  END IF;

  -- Ao encerrar/transferir um oficial, remove o vínculo (apenas em UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.congregacao_id IS NOT NULL
     AND (NEW.status IN ('encerrado','transferido') OR NEW.deleted_at IS NOT NULL) THEN
    IF OLD.cargo = 'pastor' THEN
      UPDATE public.congregacoes
      SET pastor_id = NULL
      WHERE id = OLD.congregacao_id AND pastor_id = OLD.pessoa_id;
    ELSIF OLD.cargo = 'presbitero' THEN
      UPDATE public.congregacoes
      SET presbitero_id = NULL
      WHERE id = OLD.congregacao_id AND presbitero_id = OLD.pessoa_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_sync_congregacao_lideranca
    AFTER INSERT OR UPDATE ON public.oficiais
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_congregacao_lideranca()';
EXCEPTION WHEN duplicate_object THEN NULL;
END $trg$;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 2: VIEW DE CONTRATADOS (inexistente — único perfil sem view)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_contratados AS
SELECT
  ct.id,
  ct.pessoa_id,
  p.nome,
  p.telefone,
  p.email,
  ct.tipo_vinculo,
  ct.empresa,
  ct.funcao,
  ct.categoria,
  ct.area_atendida,
  ct.contrato_desde,
  ct.contrato_ate,
  ct.status,
  ct.observacoes,
  ct.created_at AS criado_em
FROM public.contratados ct
JOIN public.pessoas p ON p.id = ct.pessoa_id
WHERE ct.deleted_at IS NULL AND p.deleted_at IS NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 3: VIEW DE SEMINARISTAS (também inexistente)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_seminaristas AS
SELECT
  s.id,
  s.pessoa_id,
  p.nome,
  p.telefone,
  p.email,
  s.seminario,
  s.curso,
  s.ano_curso,
  s.status,
  s.data_inicio,
  s.data_conclusao,
  s.tem_estagio,
  s.area_estagio,
  s.congregacao_estagio_id,
  c.nome AS congregacao_estagio,
  sup.nome AS supervisor,
  s.obs,
  s.created_at AS criado_em
FROM public.seminaristas s
JOIN public.pessoas p ON p.id = s.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = s.congregacao_estagio_id
LEFT JOIN public.pessoas sup ON sup.id = s.supervisor_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 4: VIEW ATUALIZADA DE MEMBROS (versão atual não mostra cpf/rg
-- que foram movidos para pessoas — acrescentar ao final para não quebrar)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_membros AS
SELECT
  m.id, m.pessoa_id, p.nome, p.telefone, p.celular, p.email, p.data_nascimento,
  p.genero::text AS genero, p.estado_civil::text AS estado_civil,
  p.endereco, p.bairro, p.cidade, p.estado, p.cep,
  m.status::text AS status, m.data_ingresso, m.tipo_ingresso, m.data_saida, m.motivo_saida,
  m.batizado, m.data_batismo, m.casado_na_igreja, m.data_casamento,
  m.funcao, m.ministerios, m.numero_registro,
  c.nome AS congregacao, m.congregacao_id, p.foto_url, p.observacoes,
  m.created_at AS criado_em, m.updated_at AS atualizado_em,
  p.cpf, p.rg
FROM public.membros m
JOIN public.pessoas p ON p.id = m.pessoa_id
LEFT JOIN public.congregacoes c ON c.id = m.congregacao_id
WHERE m.deleted_at IS NULL AND p.deleted_at IS NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 5: CONSTRAINT — garantir que pessoa não seja membro e visitante
-- ativo ao mesmo tempo (inconsistência silenciosa possível)
-- ══════════════════════════════════════════════════════════════════════

-- Função que valida o estado cruzado
CREATE OR REPLACE FUNCTION public.fn_check_membro_visitante()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.membros
    WHERE pessoa_id = NEW.pessoa_id
      AND status = 'ativo'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pessoa % já é membro ativo. Não pode ser cadastrada como visitante.', NEW.pessoa_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $trg$ BEGIN
  EXECUTE 'CREATE TRIGGER trg_check_membro_visitante
    BEFORE INSERT OR UPDATE ON public.visitantes
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_membro_visitante()';
EXCEPTION WHEN duplicate_object THEN NULL;
END $trg$;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 6: FUNÇÃO para setar app.pessoa_id automaticamente via auth
-- Necessário para fn_audit() registrar quem fez a operação.
-- Criar via Supabase Dashboard → Auth → Hooks (ou como migration separada)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_set_app_pessoa_id()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pessoa_id uuid;
BEGIN
  SELECT p.id INTO v_pessoa_id
  FROM public.pessoas p
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_pessoa_id IS NOT NULL THEN
    PERFORM set_config('app.pessoa_id', v_pessoa_id::text, true);
  END IF;
END;
$$;

-- Usar no frontend antes de writes:
-- await supabase.rpc('fn_set_app_pessoa_id')
-- Ou configurar como hook pós-autenticação no Supabase


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 7: ÍNDICE FALTANTE — busca de visitantes por nome (via pessoas)
-- Busca em visitantes hoje exige JOIN em pessoas sem índice dedicado
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_visitantes_deleted ON public.visitantes(deleted_at) WHERE deleted_at IS NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PATCH 8: LIMPEZA DAS TABELAS _v1 (executar apenas após validar dados V2)
-- Descomente quando tiver certeza que a migração está OK
-- ══════════════════════════════════════════════════════════════════════

/*
DROP TABLE IF EXISTS
  membros_v1, visitantes_v1, oficiais_v1, nomeados_v1,
  seminaristas_v1, contratados_v1, congregacoes_v1, pessoas_v1,
  demandas_v1, contratos_v1, financeiro_v1, agenda_v1,
  pgs_v1, pg_participantes_v1, estoque_itens_v1,
  estoque_movimentacoes_v1, logs_sistema_v1,
  congregacao_cultos_v1, estudos_pgs_v1
CASCADE;
*/


-- ══════════════════════════════════════════════════════════════════════
-- FIM DO PATCH
-- ══════════════════════════════════════════════════════════════════════
