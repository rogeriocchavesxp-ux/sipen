-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo de Oficiais: Pastores, Presbíteros, Diáconos,
--         Seminaristas e Contratados
-- Quadro oficial IPPenha · Atualização: 05/07/2024
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1. TABELA: oficiais
--    Unifica pastores, presbíteros e diáconos num único quadro.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oficiais (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  cargo            text NOT NULL CHECK (cargo IN ('pastor','presbitero','diacono')),
  posse            date,
  fim_mandato      date,
  ata              text,
  mandato_numero   int  DEFAULT 1,
  emerencia_votos  int,
  area             text,
  obs              text,
  status           text NOT NULL DEFAULT 'ativo'
                   CHECK (status IN ('ativo','especial','encerrado','transferido')),
  criado_em        timestamptz DEFAULT now(),
  atualizado_em    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oficiais_cargo      ON oficiais(cargo);
CREATE INDEX IF NOT EXISTS idx_oficiais_status     ON oficiais(status);
CREATE INDEX IF NOT EXISTS idx_oficiais_fim_mandato ON oficiais(fim_mandato);

CREATE OR REPLACE FUNCTION update_atualizado_em_oficiais()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_oficiais_atualizado_em
  BEFORE UPDATE ON oficiais
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_oficiais();


-- ────────────────────────────────────────────────────────────────
-- 2. TABELA: seminaristas
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seminaristas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  seminario       text,
  curso           text DEFAULT 'Teologia',
  ano_curso       text,
  supervisor      text,
  tem_estagio     boolean DEFAULT false,
  area_estagio    text,
  status          text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','concluido','afastado')),
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now()
);

CREATE TRIGGER trg_seminaristas_atualizado_em
  BEFORE UPDATE ON seminaristas
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_oficiais();


-- ────────────────────────────────────────────────────────────────
-- 3. TABELA: contratados
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  tipo_vinculo    text NOT NULL CHECK (tipo_vinculo IN ('terceirizado','direto')),
  empresa         text,
  funcao          text,
  categoria       text,
  area_atendida   text,
  contrato_desde  text,
  status          text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo','suspenso')),
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now()
);

CREATE TRIGGER trg_contratados_atualizado_em
  BEFORE UPDATE ON contratados
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_oficiais();


-- ════════════════════════════════════════════════════════════════
-- DADOS: PASTORES (3)
-- ════════════════════════════════════════════════════════════════
INSERT INTO oficiais (nome, cargo, area, status) VALUES
  ('Rev. Amauri Costa',   'pastor', 'Presidente do Conselho · Sede',  'ativo'),
  ('Rev. Filipe Checon',  'pastor', 'Supervisor Ministerial',          'ativo'),
  ('Rev. Rogério Chaves', 'pastor', 'Missões e Plantio',               'ativo');


-- ════════════════════════════════════════════════════════════════
-- DADOS: PRESBÍTEROS (13)
-- Quadro oficial · AGE 28/04/2024 · Atualização 05/07/2024
-- ════════════════════════════════════════════════════════════════
INSERT INTO oficiais (nome, cargo, posse, fim_mandato, ata, mandato_numero, emerencia_votos, obs, status) VALUES
  -- Mandato até 20/11/2026 · Ata 1205/25
  ('Alberto Shiniti Noguti',        'presbitero', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                            'ativo'),
  ('Euclides Portella da Rocha',    'presbitero', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                            'ativo'),
  ('Hugo Alcântara Miguel',         'presbitero', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                            'ativo'),
  ('Marcus V. Barros de Novaes',    'presbitero', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                            'ativo'),
  ('Mauricio Tosta',                'presbitero', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                            'ativo'),
  -- Mandato até 14/05/2027 · Ata 1218
  ('Laércio Ferreira Lima',         'presbitero', '2022-05-15', '2027-05-14', '1218',    2, NULL, '2º mandato',                    'ativo'),
  -- Mandato até 21/10/2028 · Ata 1237/1241
  ('Edson Luís Vieira',             'presbitero', '2023-10-22', '2028-10-21', '1241',    2, NULL, '2º mandato',                    'ativo'),
  ('Eder Góis de Oliveira',         'presbitero', '2023-10-22', '2028-10-21', '1237',    2, NULL, '2º mandato',                    'ativo'),
  -- Mandato até 03/08/2029 · Ata 1250 · AGE 28/04/2024 · Posse 04/08/2024
  ('Anízio Alves Borges',           'presbitero', '2024-08-04', '2029-08-03', '1250',    2, 395,  'Emerência · 2º mandato',        'ativo'),
  ('Carlos Alberto R. da Silva',    'presbitero', '2024-08-04', '2029-08-03', '1250',    2, NULL, '2º mandato',                    'ativo'),
  ('Percílio Diório',               'presbitero', '2024-08-04', '2029-08-03', '1250',    2, 411,  'Emerência · 2º mandato',        'ativo'),
  ('Anderson Lopes Portela Rocha',  'presbitero', '2024-08-04', '2029-08-03', '1250',    1, NULL, 'Ex-Diácono · eleito AGE 2024',  'ativo'),
  ('Max Filipe Silva Gonçalves',    'presbitero', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                            'ativo');


-- ════════════════════════════════════════════════════════════════
-- DADOS: DIÁCONOS — 37 ativos + 4 situações especiais
-- Quadro oficial · AGE 28/04/2024 · Posse 04/08/2024
-- ════════════════════════════════════════════════════════════════
INSERT INTO oficiais (nome, cargo, posse, fim_mandato, ata, mandato_numero, emerencia_votos, obs, status) VALUES

  -- ── Mandato até 20/11/2026 · Ata 1205/25 ──────────────────
  ('Osías Vasconcelos Júnior',          'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, 392,  'Emerência · 392 votos',        'ativo'),
  ('Adilson Aparecido Villano',          'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                           'ativo'),
  ('Adriano Portella da Rocha',          'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                           'ativo'),
  ('Amauri Costa de O. Junior',          'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, NULL,                           'ativo'),
  ('Carlos Eduardo V. de Oliveira',      'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, 'Residindo no exterior',        'especial'),
  ('Marcos Marcandali de Jesus',         'diacono', '2021-11-21', '2026-11-20', '1205/25', 1, NULL, 'Residindo no litoral',         'especial'),
  ('Yarian Santana Tamoyo',              'diacono', '2021-11-21', '2026-11-20', '1207/25', 1, NULL, NULL,                           'ativo'),

  -- ── Mandato até 14/05/2027 · Ata 1218 ────────────────────
  ('Éber Costa Moreira Lopes',           'diacono', '2022-05-15', '2027-05-14', '1218',    2, NULL, '2º mandato',                   'ativo'),
  ('José Antonio Bohorquez Romero',      'diacono', '2022-05-15', '2027-05-14', '1218',    2, NULL, '2º mandato',                   'ativo'),
  ('Douglas Miguel',                     'diacono', '2022-05-15', '2027-05-14', '1218',    2, NULL, '2º mandato',                   'ativo'),
  ('Márcio Dal Maso',                    'diacono', '2022-05-15', '2027-05-14', '1218',    2, NULL, '2º mandato',                   'ativo'),
  ('Agilson Alves Oliveira',             'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('José Carlos Bento',                  'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Daniel Pereira Aguiar',              'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Ely da Conceição Coelho',            'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Gabriel Dias Marinho',               'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Hermínio Estevão Ramos Rodrigues',   'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Ricardo Riul',                       'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Ronaldo Gomes da Silva',             'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),
  ('Uelton Ramos de Oliveira',           'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, NULL,                           'ativo'),

  -- ── Mandato até 21/10/2028 · Ata 1237 ────────────────────
  ('Alexandre Carralero Martins',        'diacono', '2023-10-22', '2028-10-21', '1237',    2, NULL, '2º mandato',                   'ativo'),
  ('Ismael Molina',                      'diacono', '2023-10-22', '2028-10-21', '1237',    2, NULL, '2º mandato',                   'ativo'),
  ('Vitor Góis de Oliveira',             'diacono', '2023-10-22', '2028-10-21', '1237',    2, NULL, '2º mandato',                   'ativo'),
  ('Flavio Gallani Silva',               'diacono', '2023-10-22', '2028-10-21', '1237',    1, NULL, NULL,                           'ativo'),
  ('Thiago de Paula Solino',             'diacono', '2023-10-22', '2028-10-21', '1237',    1, NULL, NULL,                           'ativo'),

  -- ── Mandato até 03/08/2029 · Ata 1250 · AGE 28/04/2024 ──
  ('Fladimir Pessoa Martins',            'diacono', '2024-08-04', '2029-08-03', '1250',    2, NULL, '2º mandato',                   'ativo'),
  ('Marcos Roberto Piacente',            'diacono', '2024-08-04', '2029-08-03', '1250',    2, NULL, '2º mandato',                   'ativo'),
  ('Orlando Luiz Guedelha',              'diacono', '2024-08-04', '2029-08-03', '1250',    2, NULL, '2º mandato',                   'ativo'),
  ('Thiago Caputo Cavalieri',            'diacono', '2024-08-04', '2029-08-03', '1250',    2, NULL, '2º mandato',                   'ativo'),
  ('Ariel Choquetarqui',                 'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, 'Comunidade Hispanos',          'ativo'),
  ('Cícero Martins da Silva',            'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Daniel Felipe de Souza',             'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Edson Meneses Junior',               'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Gabriel Assis Brogim',               'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Moisés Florencio Mamani',            'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Sergio Paulo Crecchi',               'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),
  ('Símon Roque Vides',                  'diacono', '2024-08-04', '2029-08-03', '1250',    1, NULL, NULL,                           'ativo'),

  -- ── Situações especiais / encerrados ──────────────────────
  ('Ernesto Rodrigues Alves',            'diacono', '2017-05-21', '2022-05-20', '1140/22', 1, NULL, 'Mandato finalizado 05/2022',   'encerrado'),
  ('Sidnei Ferreira Lima',               'diacono', '2019-08-04', '2024-08-03', '1176/24', 1, NULL, 'Mandato vencido 2024',         'encerrado'),
  ('Anderson Lopes Portela Rocha',       'diacono', '2022-05-15', '2027-05-14', '1218',    1, NULL, 'Eleito Presbítero AGE 28/04/2024', 'transferido'),
  ('Rogério de Castro Chaves',           'diacono', '2018-10-28', '2023-10-27', '1163/22', 1, NULL, 'Ordenado Pastor',              'transferido');


-- ════════════════════════════════════════════════════════════════
-- DADOS: SEMINARISTAS (4)
-- ════════════════════════════════════════════════════════════════
INSERT INTO seminaristas (nome, seminario, curso, ano_curso, supervisor, tem_estagio, area_estagio, status) VALUES
  ('Elias Martins',  'STB',   'Teologia', '3º ano', 'Rev. Amauri Costa',   true,  'Louvor',    'ativo'),
  ('Rafael Souza',   'STB',   'Teologia', '1º ano', 'Rev. Filipe Checon',  false, NULL,        'ativo'),
  ('Bruno Almeida',  'STBNB', 'Teologia', '2º ano', 'Rev. Rogério Chaves', true,  'PGs',       'ativo'),
  ('Daniel Ferreira','STB',   'Teologia', '4º ano', 'Rev. Amauri Costa',   true,  'Pregação',  'concluido');


-- ════════════════════════════════════════════════════════════════
-- DADOS: CONTRATADOS (3 registros / 1 empresa + 2 diretos)
-- ════════════════════════════════════════════════════════════════
INSERT INTO contratados (nome, tipo_vinculo, empresa, funcao, categoria, area_atendida, contrato_desde, status) VALUES
  ('Generall (equipe)',  'terceirizado', 'Generall', 'Limpeza e Portaria',     'Segurança / Limpeza', 'Sede · todas as unidades', '01/2024', 'ativo'),
  ('Jhonatan Diego',     'direto',       NULL,       'Auxiliar Administrativo', 'Administrativo',      'Secretaria · Administração', NULL,      'ativo'),
  ('Davi',               'direto',       NULL,       'Manutenção',              'Manutenção',          'Infraestrutura · todas as unidades', NULL, 'ativo');


-- ════════════════════════════════════════════════════════════════
-- VIEWS ÚTEIS (opcional — para consultas rápidas no dashboard)
-- ════════════════════════════════════════════════════════════════

-- Mandatos a vencer em 12 meses
CREATE OR REPLACE VIEW vw_mandatos_a_vencer AS
SELECT nome, cargo, fim_mandato,
       (fim_mandato - CURRENT_DATE) AS dias_restantes
FROM   oficiais
WHERE  status IN ('ativo','especial')
  AND  fim_mandato IS NOT NULL
  AND  fim_mandato <= CURRENT_DATE + INTERVAL '12 months'
ORDER  BY fim_mandato;

-- Quadro resumido por cargo e status
CREATE OR REPLACE VIEW vw_quadro_resumo AS
SELECT cargo,
       status,
       COUNT(*) AS total
FROM   oficiais
GROUP  BY cargo, status
ORDER  BY cargo, status;


-- ════════════════════════════════════════════════════════════════
-- RLS (habilitar se necessário)
-- ════════════════════════════════════════════════════════════════
-- ALTER TABLE oficiais     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seminaristas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contratados  ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Acesso autenticado" ON oficiais     FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Acesso autenticado" ON seminaristas FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Acesso autenticado" ON contratados  FOR ALL USING (auth.role() = 'authenticated');
