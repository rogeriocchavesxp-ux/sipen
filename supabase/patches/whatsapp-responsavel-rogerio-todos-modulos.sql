-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Adiciona Rogério como responsável em todos os módulos WA
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_pessoa_id uuid;
BEGIN
  -- Busca Rogério pelo nome (ajuste se necessário)
  SELECT id INTO v_pessoa_id
  FROM public.pessoas
  WHERE nome ILIKE '%Rogério%Castro%'
     OR nome ILIKE '%Rogerio%Castro%'
  ORDER BY nome
  LIMIT 1;

  IF v_pessoa_id IS NULL THEN
    RAISE EXCEPTION 'Pessoa não encontrada. Verifique o nome no banco.';
  END IF;

  RAISE NOTICE 'Usando pessoa_id: %', v_pessoa_id;

  -- Insere em todos os módulos (ignora duplicatas)
  INSERT INTO public.whatsapp_modulo_responsaveis (modulo, pessoa_id, ativo)
  SELECT m.modulo, v_pessoa_id, true
  FROM (VALUES
    ('AGENDA'),
    ('DEMANDAS'),
    ('FINANCEIRO'),
    ('PASTORAL'),
    ('MINISTERIAL'),
    ('MEMBRESIA'),
    ('CONSELHO'),
    ('JUNTA_DIACONAL'),
    ('INFRAESTRUTURA'),
    ('JURIDICO')
  ) AS m(modulo)
  ON CONFLICT (modulo, pessoa_id) DO UPDATE SET ativo = true;

  RAISE NOTICE 'Rogério adicionado como responsável em todos os módulos.';
END $$;
