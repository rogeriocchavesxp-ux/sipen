-- SAF — Liderança 2026
-- Limpa entradas existentes e recria os 7 líderes na ordem correta.
-- Executar APÓS nomeados-delete-policy.sql e nomeados-upd-policy-with-check.sql

DO $$
DECLARE v_orgao text;
BEGIN
  SELECT orgao INTO v_orgao
  FROM public.sociedades WHERE sigla = 'SAF' LIMIT 1;

  IF v_orgao IS NULL THEN
    RAISE EXCEPTION 'Sociedade SAF não encontrada na tabela sociedades';
  END IF;

  -- Remove todas as entradas atuais da SAF (soft-delete)
  UPDATE public.nomeados
  SET deleted_at = now()
  WHERE orgao_tipo = 'sociedade'
    AND orgao = v_orgao
    AND deleted_at IS NULL;

  -- 1. Pastor
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Pastor', 'supervisor', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Fábio Carvalho%' AND p.deleted_at IS NULL LIMIT 1;

  -- 2. Conselheiro
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Conselheiro', 'conselheiro', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Hugo Alcântara Miguel%' AND p.deleted_at IS NULL LIMIT 1;

  -- 3. Presidente
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Presidente', 'presidente', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Edneusa Lino%' AND p.deleted_at IS NULL LIMIT 1;

  -- 4. Vice Presidente
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Vice Presidente', 'coordenador', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Alba Suely%' AND p.deleted_at IS NULL LIMIT 1;

  -- 5. 1ª Secretária
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '1ª Secretária', 'lider_area', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Silvia Dias%' AND p.deleted_at IS NULL LIMIT 1;

  -- 6. 2ª Secretária
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, '2ª Secretária', 'lider_area', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Joseneide Dantas%' AND p.deleted_at IS NULL LIMIT 1;

  -- 7. Tesoureira
  INSERT INTO public.nomeados
    (orgao_tipo, orgao, nome, cargo, funcao_lider, tipo_nomeacao, status, pessoa_id, data_inicio)
  SELECT 'sociedade', v_orgao, p.nome, 'Tesoureira', 'tesoureiro', 'lider', 'ativo', p.id, '2026-01-01'
  FROM public.pessoas p
  WHERE p.nome ILIKE '%Silvana Aparecida Sales%' AND p.deleted_at IS NULL LIMIT 1;

  RAISE NOTICE 'SAF liderança 2026 importada. Orgao: %', v_orgao;
END $$;

-- Verificar resultado
SELECT nome, cargo, funcao_lider, data_inicio
FROM public.nomeados
WHERE orgao_tipo = 'sociedade'
  AND orgao = (SELECT orgao FROM public.sociedades WHERE sigla = 'SAF' LIMIT 1)
  AND deleted_at IS NULL
ORDER BY cargo;
