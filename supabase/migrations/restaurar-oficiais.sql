-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Restaurar oficiais da IPPenha
-- Quadro oficial · AGE 28/04/2024 · Atualização 05/07/2024
-- Execute no Supabase SQL Editor do projeto SIPEN (erhwryfzpycahgsohhbh)
--
-- Idempotente: verifica existência pelo nome antes de inserir.
-- Não duplica se a pessoa ou o registro de oficial já existe.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Procedure auxiliar (criada como objeto de banco temporário) ──
CREATE OR REPLACE PROCEDURE public._sipen_upsert_oficial(
  p_nome          text,
  p_cargo         text,
  p_status        text,
  p_posse         date    DEFAULT NULL,
  p_fim_mandato   date    DEFAULT NULL,
  p_ata           text    DEFAULT NULL,
  p_mandato_num   integer DEFAULT 1,
  p_emerencia     integer DEFAULT NULL,
  p_area          text    DEFAULT NULL,
  p_obs           text    DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
  v_pid uuid;
BEGIN
  -- 1. Encontra ou cria a pessoa
  SELECT id INTO v_pid
  FROM public.pessoas
  WHERE nome = p_nome AND deleted_at IS NULL
  LIMIT 1;

  IF v_pid IS NULL THEN
    INSERT INTO public.pessoas (nome, genero)
    VALUES (p_nome, 'M')
    RETURNING id INTO v_pid;
  END IF;

  -- 2. Cria o registro de oficial se não existir para esse cargo
  IF NOT EXISTS (
    SELECT 1 FROM public.oficiais
    WHERE pessoa_id = v_pid
      AND cargo = p_cargo::public.cargo_oficial_t
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO public.oficiais
      (pessoa_id, cargo, status, posse, fim_mandato, ata, mandato_numero, emerencia_votos, area, obs)
    VALUES
      (v_pid, p_cargo::public.cargo_oficial_t, p_status::public.status_oficial_t,
       p_posse, p_fim_mandato, p_ata, p_mandato_num, p_emerencia, p_area, p_obs);
  END IF;
END;
$$;

-- ── 2. Inserção dos oficiais ──────────────────────────────────

-- ════════════════════════════════════════════════════════════════
-- PASTORES (3)
-- ════════════════════════════════════════════════════════════════
CALL public._sipen_upsert_oficial('Rev. Amauri Costa',   'pastor', 'ativo', p_area => 'Presidente do Conselho · Sede');
CALL public._sipen_upsert_oficial('Rev. Filipe Checon',  'pastor', 'ativo', p_area => 'Supervisor Ministerial');
CALL public._sipen_upsert_oficial('Rev. Rogério Chaves', 'pastor', 'ativo', p_area => 'Missões e Plantio');


-- ════════════════════════════════════════════════════════════════
-- PRESBÍTEROS (13)
-- ════════════════════════════════════════════════════════════════

-- Mandato até 20/11/2026 · Ata 1205/25
CALL public._sipen_upsert_oficial('Alberto Shiniti Noguti',     'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Euclides Portella da Rocha', 'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Hugo Alcântara Miguel',      'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Marcus V. Barros de Novaes', 'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Mauricio Tosta',             'presbitero','ativo','2021-11-21','2026-11-20','1205/25',1);

-- Mandato até 14/05/2027 · Ata 1218
CALL public._sipen_upsert_oficial('Laércio Ferreira Lima',      'presbitero','ativo','2022-05-15','2027-05-14','1218',2, p_obs => '2º mandato');

-- Mandato até 21/10/2028 · Ata 1237/1241
CALL public._sipen_upsert_oficial('Edson Luís Vieira',          'presbitero','ativo','2023-10-22','2028-10-21','1241',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Eder Góis de Oliveira',      'presbitero','ativo','2023-10-22','2028-10-21','1237',2, p_obs => '2º mandato');

-- Mandato até 03/08/2029 · Ata 1250 · AGE 28/04/2024 · Posse 04/08/2024
CALL public._sipen_upsert_oficial('Anízio Alves Borges',          'presbitero','ativo','2024-08-04','2029-08-03','1250',2, p_emerencia => 395, p_obs => 'Emerência · 2º mandato');
CALL public._sipen_upsert_oficial('Carlos Alberto R. da Silva',   'presbitero','ativo','2024-08-04','2029-08-03','1250',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Percílio Diório',              'presbitero','ativo','2024-08-04','2029-08-03','1250',2, p_emerencia => 411, p_obs => 'Emerência · 2º mandato');
CALL public._sipen_upsert_oficial('Anderson Lopes Portela Rocha', 'presbitero','ativo','2024-08-04','2029-08-03','1250',1, p_obs => 'Ex-Diácono · eleito AGE 2024');
CALL public._sipen_upsert_oficial('Max Filipe Silva Gonçalves',   'presbitero','ativo','2024-08-04','2029-08-03','1250',1);


-- ════════════════════════════════════════════════════════════════
-- DIÁCONOS — 37 ativos + 4 situações especiais
-- ════════════════════════════════════════════════════════════════

-- Mandato até 20/11/2026 · Ata 1205/25
CALL public._sipen_upsert_oficial('Osías Vasconcelos Júnior',     'diacono','ativo',   '2021-11-21','2026-11-20','1205/25',1, p_emerencia => 392, p_obs => 'Emerência · 392 votos');
CALL public._sipen_upsert_oficial('Adilson Aparecido Villano',    'diacono','ativo',   '2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Adriano Portella da Rocha',    'diacono','ativo',   '2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Amauri Costa de O. Junior',    'diacono','ativo',   '2021-11-21','2026-11-20','1205/25',1);
CALL public._sipen_upsert_oficial('Carlos Eduardo V. de Oliveira','diacono','especial','2021-11-21','2026-11-20','1205/25',1, p_obs => 'Residindo no exterior');
CALL public._sipen_upsert_oficial('Marcos Marcandali de Jesus',   'diacono','especial','2021-11-21','2026-11-20','1205/25',1, p_obs => 'Residindo no litoral');
CALL public._sipen_upsert_oficial('Yarian Santana Tamoyo',        'diacono','ativo',   '2021-11-21','2026-11-20','1207/25',1);

-- Mandato até 14/05/2027 · Ata 1218
CALL public._sipen_upsert_oficial('Éber Costa Moreira Lopes',         'diacono','ativo','2022-05-15','2027-05-14','1218',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('José Antonio Bohorquez Romero',    'diacono','ativo','2022-05-15','2027-05-14','1218',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Douglas Miguel',                   'diacono','ativo','2022-05-15','2027-05-14','1218',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Márcio Dal Maso',                  'diacono','ativo','2022-05-15','2027-05-14','1218',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Agilson Alves Oliveira',           'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('José Carlos Bento',                'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Daniel Pereira Aguiar',            'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Ely da Conceição Coelho',          'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Gabriel Dias Marinho',             'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Hermínio Estevão Ramos Rodrigues', 'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Ricardo Riul',                     'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Ronaldo Gomes da Silva',           'diacono','ativo','2022-05-15','2027-05-14','1218',1);
CALL public._sipen_upsert_oficial('Uelton Ramos de Oliveira',         'diacono','ativo','2022-05-15','2027-05-14','1218',1);

-- Mandato até 21/10/2028 · Ata 1237
CALL public._sipen_upsert_oficial('Alexandre Carralero Martins', 'diacono','ativo','2023-10-22','2028-10-21','1237',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Ismael Molina',               'diacono','ativo','2023-10-22','2028-10-21','1237',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Vitor Góis de Oliveira',      'diacono','ativo','2023-10-22','2028-10-21','1237',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Flavio Gallani Silva',        'diacono','ativo','2023-10-22','2028-10-21','1237',1);
CALL public._sipen_upsert_oficial('Thiago de Paula Solino',      'diacono','ativo','2023-10-22','2028-10-21','1237',1);

-- Mandato até 03/08/2029 · Ata 1250 · AGE 28/04/2024 · Posse 04/08/2024
CALL public._sipen_upsert_oficial('Fladimir Pessoa Martins', 'diacono','ativo','2024-08-04','2029-08-03','1250',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Marcos Roberto Piacente', 'diacono','ativo','2024-08-04','2029-08-03','1250',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Orlando Luiz Guedelha',   'diacono','ativo','2024-08-04','2029-08-03','1250',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Thiago Caputo Cavalieri', 'diacono','ativo','2024-08-04','2029-08-03','1250',2, p_obs => '2º mandato');
CALL public._sipen_upsert_oficial('Ariel Choquetarqui',      'diacono','ativo','2024-08-04','2029-08-03','1250',1, p_obs => 'Comunidade Hispanos');
CALL public._sipen_upsert_oficial('Cícero Martins da Silva', 'diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Daniel Felipe de Souza',  'diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Edson Meneses Junior',    'diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Gabriel Assis Brogim',   'diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Moisés Florencio Mamani','diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Sergio Paulo Crecchi',   'diacono','ativo','2024-08-04','2029-08-03','1250',1);
CALL public._sipen_upsert_oficial('Símon Roque Vides',      'diacono','ativo','2024-08-04','2029-08-03','1250',1);

-- Situações especiais / encerrados / transferidos
CALL public._sipen_upsert_oficial('Ernesto Rodrigues Alves',      'diacono','encerrado',  '2017-05-21','2022-05-20','1140/22',1, p_obs => 'Mandato finalizado 05/2022');
CALL public._sipen_upsert_oficial('Sidnei Ferreira Lima',         'diacono','encerrado',  '2019-08-04','2024-08-03','1176/24',1, p_obs => 'Mandato vencido 2024');
CALL public._sipen_upsert_oficial('Anderson Lopes Portela Rocha', 'diacono','transferido','2022-05-15','2027-05-14','1218',   1, p_obs => 'Eleito Presbítero AGE 28/04/2024');
CALL public._sipen_upsert_oficial('Rogério de Castro Chaves',     'diacono','transferido','2018-10-28','2023-10-27','1163/22',1, p_obs => 'Ordenado Pastor');

-- ── 3. Remove o procedure auxiliar (limpeza) ─────────────────
DROP PROCEDURE IF EXISTS public._sipen_upsert_oficial(text,text,text,date,date,text,integer,integer,text,text);
