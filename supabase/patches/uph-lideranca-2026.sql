-- UPH — Liderança 2026
-- Limpa entradas existentes e recria a diretoria na ordem correta.
-- Executar APÓS nomeados-delete-policy.sql

DO $$
DECLARE v_orgao text;
BEGIN
  SELECT orgao INTO v_orgao
  FROM public.sociedades WHERE sigla = 'UPH' LIMIT 1;

  IF v_orgao IS NULL THEN
    RAISE EXCEPTION 'Sociedade UPH não encontrada na tabela sociedades';
  END IF;

  -- Remove todas as entradas atuais da UPH (soft-delete)
  UPDATE public.nomeados
  SET deleted_at = now()
  WHERE orgao_tipo = 'sociedade'
    AND orgao = v_orgao
    AND deleted_at IS NULL;

  -- 1. Presidente
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Presidente', 'presidente', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Carlos Alberto Santos%' AND p.deleted_at IS NULL LIMIT 1;

  -- 2. Vice Presidente
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Vice Presidente', 'coordenador', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Ronaldo Gomes%' AND p.deleted_at IS NULL LIMIT 1;

  -- 3. 1º Secretário
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '1º Secretário', 'lider_area', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Gabriel Dias%' AND p.deleted_at IS NULL LIMIT 1;

  -- 4. 2º Secretário
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '2º Secretário', 'lider_area', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Flávio Coelho Gomes%' AND p.deleted_at IS NULL LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.nomeados
      (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
    SELECT 'sociedade', v_orgao, p.nome, '2º Secretário', 'lider_area', 'lider', 'ativo', p.id, '2026-01-01'
    FROM public.pessoas p
    WHERE unaccent(p.nome) ILIKE '%Flavio Coelho Gomes%' AND p.deleted_at IS NULL LIMIT 1;
  END IF;

  -- 5. 1º Tesoureiro
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '1º Tesoureiro', 'tesoureiro', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Yamane%' AND p.deleted_at IS NULL LIMIT 1;

  -- 6. 2º Tesoureiro
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '2º Tesoureiro', 'tesoureiro', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Sérgio Paulo%' AND p.deleted_at IS NULL LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.nomeados
      (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
    SELECT 'sociedade', v_orgao, p.nome, '2º Tesoureiro', 'tesoureiro', 'lider', 'ativo', p.id, '2026-01-01'
    FROM public.pessoas p
    WHERE unaccent(p.nome) ILIKE '%Sergio Paulo%' AND p.deleted_at IS NULL LIMIT 1;
  END IF;

  RAISE NOTICE 'UPH liderança 2026 importada. Orgao: %', v_orgao;
END $$;

-- Verificar resultado
SELECT nome, cargo, funcao_lider
FROM public.nomeados
WHERE orgao_tipo = 'sociedade'
  AND orgao = (SELECT orgao FROM public.sociedades WHERE sigla = 'UPH' LIMIT 1)
  AND deleted_at IS NULL
ORDER BY cargo;
