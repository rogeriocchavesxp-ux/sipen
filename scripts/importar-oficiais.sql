-- ══════════════════════════════════════════════════════════════════════
-- SIPEN — Importação Quadro de Oficiais IPPenha
-- Fonte: "Quadro de Oficiais da IPPenha – Vigência de Mandatos"
-- Atualização do documento: 5 de julho de 2024
-- Executar no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════════════════

-- Helper: obtém pessoa existente por nome (case-insensitive) ou cria nova
CREATE OR REPLACE FUNCTION public._tmp_oficial_pessoa(p_nome text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.pessoas
  WHERE unaccent(lower(nome)) = unaccent(lower(p_nome))
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.pessoas (nome) VALUES (p_nome) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- Helper: insere oficial se ainda não existe registro ativo/especial
CREATE OR REPLACE FUNCTION public._tmp_upsert_oficial(
  p_nome         text,
  p_cargo        text,
  p_status       text,
  p_posse        date,
  p_fim_mandato  date,
  p_ata          text,
  p_mandato_num  integer,
  p_emerencia    integer DEFAULT NULL,
  p_obs          text    DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_pid  uuid;
  v_oid  uuid;
BEGIN
  v_pid := public._tmp_oficial_pessoa(p_nome);

  -- Se já existe registro ativo/especial para este cargo, atualiza
  SELECT id INTO v_oid
  FROM public.oficiais
  WHERE pessoa_id = v_pid
    AND cargo::text = p_cargo
    AND deleted_at IS NULL
    AND status::text IN ('ativo','especial')
  LIMIT 1;

  IF v_oid IS NOT NULL THEN
    UPDATE public.oficiais SET
      posse          = p_posse,
      fim_mandato    = p_fim_mandato,
      ata            = p_ata,
      mandato_numero = p_mandato_num,
      emerencia_votos = COALESCE(p_emerencia, emerencia_votos),
      obs            = COALESCE(p_obs, obs),
      status         = p_status::public.status_oficial_t,
      updated_at     = now()
    WHERE id = v_oid;
  ELSE
    INSERT INTO public.oficiais
      (pessoa_id, cargo, status, posse, fim_mandato, ata, mandato_numero, emerencia_votos, obs)
    VALUES
      (v_pid, p_cargo::public.cargo_oficial_t, p_status::public.status_oficial_t,
       p_posse, p_fim_mandato, p_ata, p_mandato_num, p_emerencia, p_obs);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- PRESBÍTEROS (13 ativos)
-- ══════════════════════════════════════════════════════════════════════

SELECT public._tmp_upsert_oficial('Alberto Shiniti Noguti',       'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Euclides Portella da Rocha',   'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Hugo Alcântara Miguel',        'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Marcus Vinícius Barros de Novaes','presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Mauricio Tosta',               'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Laércio Ferreira Lima',        'presbitero','ativo','2022-05-15','2027-05-14','1218',   2);
SELECT public._tmp_upsert_oficial('Edson Luís Vieira',            'presbitero','ativo','2023-10-22','2028-10-21','1241',   2);
SELECT public._tmp_upsert_oficial('Eder Góis de Oliveira',        'presbitero','ativo','2023-10-22','2028-10-21','1237',   2);
SELECT public._tmp_upsert_oficial('Anízio Alves Borges',          'presbitero','ativo','2024-08-04','2029-08-03','1250',   2, 395);
SELECT public._tmp_upsert_oficial('Carlos Alberto R da Silva',    'presbitero','ativo','2024-08-04','2029-08-03','1250',   2);
SELECT public._tmp_upsert_oficial('Percílio Diório',              'presbitero','ativo','2024-08-04','2029-08-03','1250',   2, 411);
SELECT public._tmp_upsert_oficial('Anderson Lopes Portela Rocha', 'presbitero','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Max Filipe Silva Gonçalves',   'presbitero','ativo','2024-08-04','2029-08-03','1250',   1);


-- ══════════════════════════════════════════════════════════════════════
-- DIÁCONOS (38 ativos)
-- ══════════════════════════════════════════════════════════════════════

SELECT public._tmp_upsert_oficial('Osías Vasconcelos Júnior',        'diacono','ativo','2021-11-21','2026-11-20','1205/25',1,392);
SELECT public._tmp_upsert_oficial('Adilson Aparecido Villano',        'diacono','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Adriano Portella da Rocha',        'diacono','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Amauri Costa de Oliveira Junior',  'diacono','ativo','2021-11-21','2026-11-20','1205/25',1);
SELECT public._tmp_upsert_oficial('Carlos Eduardo Vieira de Oliveira','diacono','especial','2021-11-21','2026-11-20','1205/25',1,NULL,'Residindo no exterior');
SELECT public._tmp_upsert_oficial('Marcos Marcandali de Jesus',       'diacono','especial','2021-11-21','2026-11-20','1205/25',1,NULL,'Residindo no litoral');
SELECT public._tmp_upsert_oficial('Yarian Santana Tamoyo',            'diacono','ativo','2021-11-21','2026-11-20','1207/25',1);
SELECT public._tmp_upsert_oficial('Éber Costa Moreira Lopes',         'diacono','ativo','2022-05-15','2027-05-14','1218',   2);
SELECT public._tmp_upsert_oficial('José Antonio Bohorquez Romero',    'diacono','ativo','2022-05-15','2027-05-14','1218',   2);
SELECT public._tmp_upsert_oficial('Douglas Miguel',                   'diacono','ativo','2022-05-15','2027-05-14','1218',   2);
SELECT public._tmp_upsert_oficial('Márcio Dal Maso',                  'diacono','ativo','2022-05-15','2027-05-14','1218',   2);
SELECT public._tmp_upsert_oficial('Agilson Alves Oliveira',           'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('José Carlos Bento',                'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Daniel Pereira Aguiar',            'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Ely da Conceição Coelho',          'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Gabriel Dias Marinho',             'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Hermínio Estevão Ramos Rodrigues', 'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Ricardo Riul',                     'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Ronaldo Gomes da Silva',           'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Uelton Ramos de Oliveira',         'diacono','ativo','2022-05-15','2027-05-14','1218',   1);
SELECT public._tmp_upsert_oficial('Alexandre Carralero Martins',      'diacono','ativo','2023-10-22','2028-10-21','1237',   2);
SELECT public._tmp_upsert_oficial('Ismael Molina',                    'diacono','ativo','2023-10-22','2028-10-21','1237',   2);
SELECT public._tmp_upsert_oficial('Vitor Góis de Oliveira',           'diacono','ativo','2023-10-22','2028-10-21','1237',   2);
SELECT public._tmp_upsert_oficial('Flavio Gallani Silva',             'diacono','ativo','2023-10-22','2028-10-21','1237',   1);
SELECT public._tmp_upsert_oficial('Thiago de Paula Solino',           'diacono','ativo','2023-10-22','2028-10-21','1237',   1);
SELECT public._tmp_upsert_oficial('Fladimir Pessoa Martins',          'diacono','ativo','2024-08-04','2029-08-03','1250',   2);
SELECT public._tmp_upsert_oficial('Marcos Roberto Piacente',          'diacono','ativo','2024-08-04','2029-08-03','1250',   2);
SELECT public._tmp_upsert_oficial('Orlando Luiz Guedelha',            'diacono','ativo','2024-08-04','2029-08-03','1250',   2);
SELECT public._tmp_upsert_oficial('Thiago Caputo Cavalieri',          'diacono','ativo','2024-08-04','2029-08-03','1250',   2);
SELECT public._tmp_upsert_oficial('Ariel Choquetarqui',               'diacono','ativo','2024-08-04','2029-08-03','1250',   1,NULL,'Comunidade Hispanos');
SELECT public._tmp_upsert_oficial('Cícero Martins da Silva',          'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Daniel Felipe de Souza',           'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Edson Meneses Junior',             'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Gabriel Assis Brogim',             'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Moisés Florencio Mamani',          'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Sergio Paulo Crecchi',             'diacono','ativo','2024-08-04','2029-08-03','1250',   1);
SELECT public._tmp_upsert_oficial('Símon Roque Vides',                'diacono','ativo','2024-08-04','2029-08-03','1250',   1);


-- ══════════════════════════════════════════════════════════════════════
-- PASTOR
-- ══════════════════════════════════════════════════════════════════════

-- Pastores ativos
SELECT public._tmp_upsert_oficial('Rev. Amauri Costa de Oliveira','pastor','ativo',NULL,NULL,NULL,1,NULL,'Presidente do Conselho · Sede');
SELECT public._tmp_upsert_oficial('Rev. Fábio Carvalho',          'pastor','ativo',NULL,NULL,NULL,1,NULL,'Supervisor da Junta Diaconal');

-- Rogério de Castro Chaves — era diácono (ata 1163/22), ordenado pastor
-- Registra como pastor ativo; registro de diácono marcado encerrado
SELECT public._tmp_upsert_oficial('Rogério de Castro Chaves','pastor','ativo',NULL,NULL,'1163/22',1,NULL,'Ordenado pastor — era diácono (ata 1163/22, posse 28/10/2018)');

-- Encerrar mandato de diácono se existir
UPDATE public.oficiais SET
  status = 'encerrado',
  fim_mandato = '2023-10-27',
  updated_at  = now()
WHERE pessoa_id = (
  SELECT id FROM public.pessoas
  WHERE unaccent(lower(nome)) = unaccent(lower('Rogério de Castro Chaves'))
    AND deleted_at IS NULL LIMIT 1
)
AND cargo = 'diacono'
AND status IN ('ativo','especial')
AND deleted_at IS NULL;


-- ══════════════════════════════════════════════════════════════════════
-- MANDATOS ENCERRADOS (registros históricos)
-- ══════════════════════════════════════════════════════════════════════

-- Anderson Lopes Portela Rocha — era diácono, eleito presbítero em 28/04/2024
SELECT public._tmp_upsert_oficial('Anderson Lopes Portela Rocha','diacono','transferido','2022-05-15','2024-04-28','1218',1,NULL,'Eleito Presbítero em 28/04/2024 (Ata 1250)');

-- Ernesto Rodrigues Alves — mandato de diácono finalizado 05/2022
SELECT public._tmp_upsert_oficial('Ernesto Rodrigues Alves','diacono','encerrado','2017-05-21','2022-05-20','1140/22',1);

-- Sidnei Ferreira Lima — mandato de diácono vencido em 2024 (não reeleito)
SELECT public._tmp_upsert_oficial('Sidnei Ferreira Lima','diacono','encerrado','2019-08-04','2024-08-03','1176/24',1);


-- ══════════════════════════════════════════════════════════════════════
-- LIMPEZA DOS HELPERS
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public._tmp_upsert_oficial(text,text,text,date,date,text,integer,integer,text);
DROP FUNCTION IF EXISTS public._tmp_oficial_pessoa(text);


-- ══════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════════════

SELECT
  o.cargo::text AS cargo,
  p.nome,
  o.status::text AS status,
  o.posse,
  o.fim_mandato,
  o.ata,
  o.mandato_numero AS mandato,
  o.emerencia_votos AS emerencia
FROM public.oficiais o
JOIN public.pessoas p ON p.id = o.pessoa_id
WHERE o.deleted_at IS NULL
ORDER BY o.cargo, o.status, p.nome;
