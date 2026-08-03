-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Importação de Fornecedores do módulo Financeiro
-- importar-fornecedores-financeiro.sql  |  Idempotente
-- ═══════════════════════════════════════════════════════════════
-- Vasculha: contratos, estoque_itens, financeiro_solicitacoes,
-- contratados (PJ/terceirizado) e cria pessoas + nomeados no
-- departamento "Fornecedores" de dept_administrativos.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_dept_id   UUID;
  v_pessoa_id UUID;
  r           RECORD;
BEGIN

  -- ── Localizar dept Fornecedores ───────────────────────────────
  SELECT id INTO v_dept_id
  FROM dept_administrativos
  WHERE LOWER(TRIM(nome)) = 'fornecedores'
  LIMIT 1;

  IF v_dept_id IS NULL THEN
    RAISE EXCEPTION 'Departamento "Fornecedores" não encontrado. Crie-o primeiro em Departamentos.';
  END IF;

  -- ── Tabela temporária com todas as fontes ─────────────────────
  CREATE TEMP TABLE _tmp_forn (
    nome     TEXT,
    email    TEXT,
    telefone TEXT,
    cargo    TEXT
  ) ON COMMIT DROP;

  -- Fonte 1: contratos (fornecedor + parse do contato_fornecedor)
  INSERT INTO _tmp_forn (nome, email, telefone, cargo)
  SELECT DISTINCT ON (LOWER(TRIM(c.fornecedor)))
    TRIM(c.fornecedor),
    (regexp_match(COALESCE(c.contato_fornecedor,''), '[\w.+\-]+@[\w\-]+\.[\w.]+'))[1],
    (regexp_match(COALESCE(c.contato_fornecedor,''), '\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4}'))[1],
    c.tipo
  FROM contratos c
  WHERE c.fornecedor IS NOT NULL AND TRIM(c.fornecedor) <> ''
  ORDER BY LOWER(TRIM(c.fornecedor)), c.contato_fornecedor NULLS LAST;

  -- Fonte 2: estoque_itens (só nome)
  INSERT INTO _tmp_forn (nome, cargo)
  SELECT DISTINCT TRIM(ei.fornecedor), 'Fornecimento de Materiais'
  FROM estoque_itens ei
  WHERE ei.fornecedor IS NOT NULL AND TRIM(ei.fornecedor) <> '';

  -- Fonte 3: financeiro_solicitacoes (só nome)
  INSERT INTO _tmp_forn (nome, cargo)
  SELECT DISTINCT TRIM(fs.fornecedor), 'Prestador de Serviço'
  FROM financeiro_solicitacoes fs
  WHERE fs.fornecedor IS NOT NULL AND TRIM(fs.fornecedor) <> '';

  -- ── Processar cada nome único ─────────────────────────────────
  FOR r IN
    SELECT DISTINCT ON (LOWER(TRIM(nome)))
      nome,
      email,
      telefone,
      cargo
    FROM _tmp_forn
    WHERE nome IS NOT NULL AND TRIM(nome) <> ''
    ORDER BY LOWER(TRIM(nome)), email NULLS LAST
  LOOP

    -- Já existe no dept? Pula.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM nomeados n
      WHERE n.dept_id = v_dept_id
        AND LOWER(TRIM(n.nome)) = LOWER(TRIM(r.nome))
        AND n.status = 'ativo'
    );

    -- Tentar encontrar pessoa existente pelo e-mail
    v_pessoa_id := NULL;
    IF r.email IS NOT NULL AND TRIM(r.email) <> '' THEN
      SELECT p.id INTO v_pessoa_id
      FROM pessoas p
      WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(r.email))
        AND p.deleted_at IS NULL
      LIMIT 1;
    END IF;

    -- Se não achou, criar nova pessoa
    IF v_pessoa_id IS NULL THEN
      INSERT INTO pessoas (nome, email, telefone)
      VALUES (r.nome, NULLIF(TRIM(COALESCE(r.email,'')), ''), NULLIF(TRIM(COALESCE(r.telefone,'')), ''))
      RETURNING id INTO v_pessoa_id;
    ELSE
      -- Enriquecer pessoa existente com telefone se não tiver
      UPDATE pessoas
      SET telefone = COALESCE(telefone, NULLIF(TRIM(COALESCE(r.telefone,'')), ''))
      WHERE id = v_pessoa_id AND telefone IS NULL AND r.telefone IS NOT NULL;
    END IF;

    -- Criar nomeado
    INSERT INTO nomeados (nome, pessoa_id, dept_id, cargo, orgao, orgao_tipo, status)
    VALUES (
      r.nome,
      v_pessoa_id,
      v_dept_id,
      COALESCE(NULLIF(TRIM(r.cargo),''), 'Fornecedor'),
      'Fornecedores',
      'comissao',
      'ativo'
    );

  END LOOP;

  -- ── Fonte 4: contratados PJ/terceirizado (já têm pessoa_id) ──
  FOR r IN
    SELECT
      ct.nome,
      ct.pessoa_id,
      COALESCE(NULLIF(TRIM(ct.funcao),''), ct.empresa, 'Prestador de Serviço') AS cargo
    FROM contratados ct
    WHERE ct.tipo_vinculo IN ('pj','terceirizado')
      AND ct.status = 'ativo'
      AND ct.pessoa_id IS NOT NULL
      AND ct.deleted_at IS NULL
  LOOP
    -- Já está no dept? Pula.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM nomeados n
      WHERE n.dept_id = v_dept_id
        AND n.pessoa_id = r.pessoa_id
        AND n.status = 'ativo'
    );

    INSERT INTO nomeados (nome, pessoa_id, dept_id, cargo, orgao, orgao_tipo, status)
    VALUES (r.nome, r.pessoa_id, v_dept_id, r.cargo, 'Fornecedores', 'comissao', 'ativo');
  END LOOP;

  RAISE NOTICE 'Importação concluída para dept_id = %', v_dept_id;

END $$;

-- ── Relatório final ───────────────────────────────────────────
SELECT
  n.nome,
  n.cargo    AS servico,
  p.telefone,
  p.email
FROM nomeados n
LEFT JOIN pessoas p ON p.id = n.pessoa_id
WHERE n.dept_id = (SELECT id FROM dept_administrativos WHERE LOWER(nome) = 'fornecedores' LIMIT 1)
  AND n.status = 'ativo'
ORDER BY n.nome;
