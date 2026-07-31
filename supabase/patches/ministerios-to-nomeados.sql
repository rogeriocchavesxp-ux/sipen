-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Ministérios → Nomeados: fonte única definitiva
-- ministerios-to-nomeados.sql
-- ═══════════════════════════════════════════════════════════════
-- Migra supervisor/conselheiro/coordenador de ministerios e
-- todos os membros de ministerio_membros para nomeados.
-- Após execução, nomeados é a única fonte de verdade para
-- vínculos funcionais de qualquer natureza.

-- 1. Adicionar 'conselheiro' ao CHECK constraint de nivel
ALTER TABLE nomeados DROP CONSTRAINT IF EXISTS nomeados_nivel_check;
ALTER TABLE nomeados ADD CONSTRAINT nomeados_nivel_check
  CHECK (nivel IN (
    'presidente','vice_presidente','secretario','tesoureiro',
    'supervisor','conselheiro','coordenador','lider_area','membro'
  ));

-- 2. Migrar líderes: ministerios.supervisor → nomeados
INSERT INTO nomeados (pessoa_id, nome, ministerio_id, nivel, cargo, orgao, orgao_tipo, status, origem, ano)
SELECT
  m.supervisor,
  p.nome,
  m.id,
  'supervisor',
  'Supervisor',
  m.nome,
  'ministerio',
  'ativo',
  'lideranca',
  EXTRACT(YEAR FROM NOW())::int
FROM ministerios m
JOIN pessoas p ON p.id = m.supervisor
WHERE m.supervisor IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM nomeados n
    WHERE n.pessoa_id    = m.supervisor
      AND n.ministerio_id = m.id
      AND n.nivel         = 'supervisor'
      AND n.status        = 'ativo'
      AND n.deleted_at    IS NULL
  );

-- 3. Migrar líderes: ministerios.conselheiro → nomeados
INSERT INTO nomeados (pessoa_id, nome, ministerio_id, nivel, cargo, orgao, orgao_tipo, status, origem, ano)
SELECT
  m.conselheiro,
  p.nome,
  m.id,
  'conselheiro',
  'Conselheiro',
  m.nome,
  'ministerio',
  'ativo',
  'lideranca',
  EXTRACT(YEAR FROM NOW())::int
FROM ministerios m
JOIN pessoas p ON p.id = m.conselheiro
WHERE m.conselheiro IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM nomeados n
    WHERE n.pessoa_id    = m.conselheiro
      AND n.ministerio_id = m.id
      AND n.nivel         = 'conselheiro'
      AND n.status        = 'ativo'
      AND n.deleted_at    IS NULL
  );

-- 4. Migrar líderes: ministerios.coordenador → nomeados
INSERT INTO nomeados (pessoa_id, nome, ministerio_id, nivel, cargo, orgao, orgao_tipo, status, origem, ano)
SELECT
  m.coordenador,
  p.nome,
  m.id,
  'coordenador',
  'Coordenador',
  m.nome,
  'ministerio',
  'ativo',
  'lideranca',
  EXTRACT(YEAR FROM NOW())::int
FROM ministerios m
JOIN pessoas p ON p.id = m.coordenador
WHERE m.coordenador IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM nomeados n
    WHERE n.pessoa_id    = m.coordenador
      AND n.ministerio_id = m.id
      AND n.nivel         = 'coordenador'
      AND n.status        = 'ativo'
      AND n.deleted_at    IS NULL
  );

-- 5. Migrar membros: ministerio_membros → nomeados (nivel='membro')
INSERT INTO nomeados (pessoa_id, nome, ministerio_id, nivel, cargo, orgao, orgao_tipo, status, origem, ano)
SELECT
  mm.pessoa_id,
  p.nome,
  mm.ministerio_id,
  'membro',
  COALESCE(mm.funcao, 'Membro'),
  min.nome,
  'ministerio',
  COALESCE(mm.status, 'ativo'),
  'lideranca',
  EXTRACT(YEAR FROM COALESCE(mm.criado_em, NOW()))::int
FROM ministerio_membros mm
JOIN ministerios min ON min.id = mm.ministerio_id
JOIN pessoas p       ON p.id   = mm.pessoa_id
WHERE (mm.status IS NULL OR mm.status != 'inativo')
  AND NOT EXISTS (
    SELECT 1 FROM nomeados n
    WHERE n.pessoa_id     = mm.pessoa_id
      AND n.ministerio_id = mm.ministerio_id
      AND n.nivel         = 'membro'
      AND n.status        = 'ativo'
      AND n.deleted_at    IS NULL
  );

-- Relatório pós-migração
SELECT
  COALESCE(min.nome, '(sem ministério)') AS ministerio,
  n.nivel,
  COUNT(*)                               AS total
FROM nomeados n
LEFT JOIN ministerios min ON min.id = n.ministerio_id
WHERE n.ministerio_id IS NOT NULL
  AND n.status = 'ativo'
GROUP BY min.nome, n.nivel
ORDER BY min.nome, n.nivel;

NOTIFY pgrst, 'reload schema';
