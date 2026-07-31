-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Phase 3: migrar dept_membros → nomeados
-- dept-membros-to-nomeados.sql
-- ═══════════════════════════════════════════════════════════════
-- Princípio da Integridade Sistêmica: nomeados é a única fonte
-- de verdade para vínculos funcionais. dept_membros é legado.
--
-- Execute ANTES de usar a nova versão de departamentos/admin.js.
-- Após executar, dept_membros pode ser mantida (não é mais lida).

INSERT INTO nomeados (
  pessoa_id,
  nome,
  dept_id,
  nivel,
  cargo,
  orgao,
  orgao_tipo,
  status,
  data_inicio,
  obs,
  origem,
  ano
)
SELECT
  dm.pessoa_id,
  p.nome,
  dm.departamento_id,
  CASE dm.funcao
    WHEN 'supervisor'     THEN 'supervisor'
    WHEN 'coordenador'    THEN 'coordenador'
    WHEN 'lider_setorial' THEN 'lider_area'
    WHEN 'membro'         THEN 'membro'
    ELSE 'membro'
  END                         AS nivel,
  dm.funcao                   AS cargo,
  d.nome                      AS orgao,
  'comissao'                  AS orgao_tipo,
  COALESCE(dm.status,'ativo') AS status,
  dm.data_inicio,
  dm.observacoes              AS obs,
  'lideranca'                 AS origem,
  EXTRACT(YEAR FROM COALESCE(dm.data_inicio, NOW()))::int AS ano
FROM dept_membros dm
JOIN dept_administrativos d ON d.id = dm.departamento_id
JOIN pessoas p               ON p.id = dm.pessoa_id
WHERE dm.status = 'ativo'
  -- Não duplicar se já existe vínculo ativo para essa pessoa nesse dept
  AND NOT EXISTS (
    SELECT 1 FROM nomeados n
    WHERE n.pessoa_id  = dm.pessoa_id
      AND n.dept_id    = dm.departamento_id
      AND n.status     = 'ativo'
      AND n.deleted_at IS NULL
  );

-- Relatório pós-migração
SELECT
  d.nome                          AS departamento,
  COUNT(*)                        AS migrados
FROM nomeados n
JOIN dept_administrativos d ON d.id = n.dept_id
WHERE n.origem = 'lideranca'
  AND n.status = 'ativo'
GROUP BY d.nome
ORDER BY d.nome;
