-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Módulo de Nomeados: Cargos e Funções Designadas
-- Estrutura organizacional completa da IPPenha
-- Executar APÓS supabase-oficiais.sql
-- ═══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- TABELA: nomeados
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nomeados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  orgao_tipo    text NOT NULL
                CHECK (orgao_tipo IN ('governo','comissao','ministerio','sociedade','grupo','congregacao')),
  orgao         text NOT NULL,
  suborgao      text,
  cargo         text,
  obs           text,
  status        text NOT NULL DEFAULT 'ativo'
                CHECK (status IN ('ativo','inativo')),
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nomeados_orgao_tipo ON nomeados(orgao_tipo);
CREATE INDEX IF NOT EXISTS idx_nomeados_orgao      ON nomeados(orgao);
CREATE INDEX IF NOT EXISTS idx_nomeados_nome       ON nomeados(nome);

CREATE OR REPLACE FUNCTION update_atualizado_em_nomeados()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nomeados_atualizado_em
  BEFORE UPDATE ON nomeados
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_nomeados();


-- ════════════════════════════════════════════════════════════════
-- 1. ÓRGÃOS DE GOVERNO
-- ════════════════════════════════════════════════════════════════

-- 1.1 Conselho da Igreja
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Amauri Costa de Oliveira',      'governo', 'Conselho da Igreja', NULL, 'Presidente'),
  ('Presb. Euclides Portella',           'governo', 'Conselho da Igreja', NULL, 'Vice-Presidente'),
  ('Presb. Laércio Ferreira Lima',       'governo', 'Conselho da Igreja', NULL, '1º Secretário'),
  ('Presb. Marcus Novaes',               'governo', 'Conselho da Igreja', NULL, '2º Secretário'),
  ('Presb. Max Filipe',                  'governo', 'Conselho da Igreja', NULL, '1º Tesoureiro'),
  ('Presb. Anderson Lopes Portela Rocha','governo', 'Conselho da Igreja', NULL, '2º Tesoureiro'),
  ('Presb. Anízio Alves Borges',         'governo', 'Conselho da Igreja', 'Representante PSSP', 'Titular'),
  ('Presb. Laércio Ferreira Lima',       'governo', 'Conselho da Igreja', 'Representante PSSP', 'Suplente'),
  ('Presb. Edson Vieira',                'governo', 'Conselho da Igreja', 'Representante PSSP', 'Suplente');

-- 1.2 Junta Diaconal — Mesa Diretora
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Fábio Carvalho',              'governo', 'Junta Diaconal', 'Mesa Diretora', 'Supervisor'),
  ('Presb. Hugo Alcantara Miguel',     'governo', 'Junta Diaconal', 'Mesa Diretora', 'Conselheiro'),
  ('Diác. Alexandre Carralero',        'governo', 'Junta Diaconal', 'Mesa Diretora', 'Presidente'),
  ('Diác. Osias Vasconcelos Júnior',   'governo', 'Junta Diaconal', 'Mesa Diretora', 'Vice-Presidente'),
  ('Diác. Marcos Roberto Piacente',    'governo', 'Junta Diaconal', 'Mesa Diretora', '1º Secretário'),
  ('Diác. Ronaldo Cardena',            'governo', 'Junta Diaconal', 'Mesa Diretora', '2º Secretário'),
  ('Diác. Vítor Góis de Oliveira',     'governo', 'Junta Diaconal', 'Mesa Diretora', 'Tesoureiro');


-- ════════════════════════════════════════════════════════════════
-- 2. COMISSÕES PERMANENTES DO CONSELHO
-- ════════════════════════════════════════════════════════════════

-- 2.1 Administração e Manutenção
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Presb. Carlos Alberto',          'comissao', 'Administração e Manutenção', 'Responsável'),
  ('Presb. Eder Góis',               'comissao', 'Administração e Manutenção', 'Responsável'),
  ('Rev. Atsushi Miyajima',          'comissao', 'Administração e Manutenção', 'Gestão Operacional Administrativa'),
  ('Jhonatan Diego Barreto',         'comissao', 'Administração e Manutenção', 'Gestão Operacional Ministerial');

-- 2.2 Ornamentação
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Neidir dos Santos Gomes',  'comissao', 'Ornamentação', 'Equipe'),
  ('Maria do Carmo Alves',     'comissao', 'Ornamentação', 'Equipe');

-- 2.3 Cozinha
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Presb. Carlos Alberto',          'comissao', 'Cozinha', 'Coordenação'),
  ('Ivone Carlos Bento da Silva',    'comissao', 'Cozinha', 'Coordenação'),
  ('Cristina Brito Cabral',          'comissao', 'Cozinha', 'Equipe'),
  ('Maria do Carmo Alves',           'comissao', 'Cozinha', 'Equipe'),
  ('Marisa Patriani',                'comissao', 'Cozinha', 'Equipe'),
  ('Nair Pereira',                   'comissao', 'Cozinha', 'Equipe'),
  ('Solange Santos Góis de Oliveira','comissao', 'Cozinha', 'Equipe');

-- 2.4 Patrimônio
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Presb. Edson Luís Vieira',         'comissao', 'Patrimônio', 'Relator'),
  ('Diác. Osias Vasconcelos Júnior',   'comissao', 'Patrimônio', 'Equipe'),
  ('Presb. Percílio Diório',           'comissao', 'Patrimônio', 'Equipe'),
  ('Rubens Vieira da Silva',           'comissao', 'Patrimônio', 'Equipe');

-- 2.5 Orçamento e Controladoria
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Diác. Adriano Portella da Rocha',     'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Presb. Anderson Lopes Portela Rocha', 'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Presb. Éder Góis de Oliveira',        'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Presb. Euclides Portella da Rocha',   'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Presb. Hugo Alcântara Miguel',        'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Diác. Marcos Piacente',               'comissao', 'Orçamento e Controladoria', 'Equipe'),
  ('Presb. Max Filipe Silva Gonçalves',   'comissao', 'Orçamento e Controladoria', 'Equipe');

-- 2.6 Comissão de Construção e Reforma
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Presb. Edson Luís Vieira',          'comissao', 'Construção e Reforma', 'Relator'),
  ('Diác. Edson Meneses de Carvalho',   'comissao', 'Construção e Reforma', 'Equipe'),
  ('Presb. Éder Góis de Oliveira',      'comissao', 'Construção e Reforma', 'Equipe'),
  ('Eli da Conceição Coelho',           'comissao', 'Construção e Reforma', 'Equipe'),
  ('Rodrigo Cunha',                     'comissao', 'Construção e Reforma', 'Equipe'),
  ('Rosangela',                         'comissao', 'Construção e Reforma', 'Equipe'),
  ('Thiago Evangelista',                'comissao', 'Construção e Reforma', 'Equipe');

-- 2.7 Exame de Contas da Tesouraria
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Sergio de Oliveira',        'comissao', 'Exame de Contas da Tesouraria', 'Equipe'),
  ('Diác. Thiago Cavalieri',    'comissao', 'Exame de Contas da Tesouraria', 'Equipe'),
  ('Victor Pagliaci Dal Maso',  'comissao', 'Exame de Contas da Tesouraria', 'Equipe');

-- 2.8 Aquisição de Imóveis
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Amauri Costa de Oliveira',       'comissao', 'Aquisição de Imóveis', 'Equipe'),
  ('Presb. Éder Góis de Oliveira',        'comissao', 'Aquisição de Imóveis', 'Equipe'),
  ('Presb. Hugo Alcântara Miguel',        'comissao', 'Aquisição de Imóveis', 'Equipe'),
  ('Presb. Marcus Vinícius Barros Novaes','comissao', 'Aquisição de Imóveis', 'Equipe'),
  ('Diác. Thiago Cavalieri',              'comissao', 'Aquisição de Imóveis', 'Equipe');

-- 2.9 Sede Campestre – Acampamento
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Amauri Oliveira',            'comissao', 'Sede Campestre – Acampamento', 'Equipe'),
  ('Presb. Edson Luís',               'comissao', 'Sede Campestre – Acampamento', 'Equipe'),
  ('Diác. Gabriel Marinho',           'comissao', 'Sede Campestre – Acampamento', 'Equipe'),
  ('Presb. Marcus Novais',            'comissao', 'Sede Campestre – Acampamento', 'Equipe'),
  ('Diác. Uelton Ramos de Oliveira',  'comissao', 'Sede Campestre – Acampamento', 'Equipe');

-- 2.10 Comissão Aniversário de 70 Anos
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Presb. Anízio A. Borges',       'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Rev. Carlos Lima',              'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Débora Ferreira',               'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Presb. Edmar Aquoti',           'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Rev. Fábio Carvalho',           'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Georgia Cunha',                 'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Presb. Laércio F. Lima',        'comissao', 'Aniversário 70 Anos', 'Relator'),
  ('Leonardo Langer',               'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Letícia Góis',                  'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Presb. Maurício Tosta',         'comissao', 'Aniversário 70 Anos', 'Equipe'),
  ('Surama Lima',                   'comissao', 'Aniversário 70 Anos', 'Equipe');


-- ════════════════════════════════════════════════════════════════
-- 3. MINISTÉRIOS PASTORAIS
-- ════════════════════════════════════════════════════════════════

-- ── 3.1 Ministério de Ensino ─────────────────────────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Carlos Eduardo Corrêa de Lima', 'ministerio', 'Ministério de Ensino', 'Supervisão Geral');

-- 3.1.1 CER
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Carlos Eduardo C. de Lima', 'ministerio', 'Ministério de Ensino', 'CER', 'Presidente'),
  ('Rev. Filipe Checon',             'ministerio', 'Ministério de Ensino', 'CER', 'Vice-Presidente'),
  ('Presb. Max Filipe',              'ministerio', 'Ministério de Ensino', 'CER', 'Representante do Conselho'),
  ('Graziela Bernardes Jacob',       'ministerio', 'Ministério de Ensino', 'CER', 'Coordenador da EBD'),
  ('Surama Lima',                    'ministerio', 'Ministério de Ensino', 'CER', 'Vice-Coord. da EBD'),
  ('Renata Henrique',                'ministerio', 'Ministério de Ensino', 'CER', 'Representante Penha Kids'),
  ('Rev. Filipe Checon',             'ministerio', 'Ministério de Ensino', 'CER', 'Representante Classes de Integração'),
  ('Rev. Carlos Henrique',           'ministerio', 'Ministério de Ensino', 'CER – EBD Infantil', 'Equipe'),
  ('Tiago Henrique',                 'ministerio', 'Ministério de Ensino', 'CER – EBD Infantil', 'Equipe'),
  ('Renata Henrique',                'ministerio', 'Ministério de Ensino', 'CER – EBD Infantil', 'Equipe');

-- 3.1.2 EBD Geral
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Graziela Mara Bernardes Jacob',          'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Coordenador'),
  ('Surama Lima',                            'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Vice-Coordenador'),
  ('Diác. Thiago Solino',                    'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Secretário'),
  ('Rev. Amauri Costa de Oliveira',          'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Filipe Checon',                     'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Carlos Alberto Henrique',           'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Cácio Silva',                       'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Carlos Eduardo Corrêa de Lima',     'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Fábio Carvalho',                    'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Presb. Laércio Ferreira Lima',           'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Presb. Éder Góis de Oliveira',           'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Presb. Alberto Shiniti Noguti',          'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Presb. Edson Luís Vieira',               'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Rev. Rogério de Castro Chaves',          'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Jhonatan Diego Barreto',                 'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Surama Cecília de Castro Ribeiro Lima',  'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Maria de Eunice Ferreira',               'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Lúcia Celeste Costa Vieira',             'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Gilberto Gallani Silva',                 'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Graziela Bernardes Jacob',               'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Márcia Caputo Cavalieri',                'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Tiago Rocha Vargas Henrique',            'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Ricardo Riul',                           'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Flávio Gallani',                         'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Max Filipe',                             'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Professor'),
  ('Diác. Edson Menezes',                    'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Equipe de Apoio'),
  ('Diác. Ronaldo Cardena',                  'ministerio', 'Ministério de Ensino', 'EBD Geral', 'Equipe de Apoio');

-- 3.1.3 EBD Hispânica
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Paulo Erben', 'ministerio', 'Ministério de Ensino', 'EBD Hispânica', 'Coordenador / Professor'),
  ('Emma Erben',       'ministerio', 'Ministério de Ensino', 'EBD Hispânica', 'Equipe');

-- 3.1.4 Penha Kids
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Carlos Henrique',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Supervisor'),
  ('Francine Rocha',                   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Coordenador'),
  ('Presb. Anderson Portela',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Conselheiro'),
  ('Deborah Alves de Moraes Miguel',   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Jessica Daré Vasconcelos',         'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Raquel Cavalieri Lee',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Renata Rocha Vargas Henrique',     'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Viviane Sclafiani',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Yuri Diego Molina',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'EBD e Culto Noturno'),
  ('Adriano Rocha',                    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Alice Cacciaguerra Disessa Aguilar','ministerio','Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Ana Carolina Sclafiani',           'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Ana Maria de Jesus dos Santos',    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Angélica Santana Rodrigues',       'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Arthur de Paula Dias',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Aurea Vasconcelos',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Barbara Mietto da Rocha',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Beatriz Santos',                   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Caio Ferreira Amorim',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Camila Torres Cesar',              'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Carol Rocha',                      'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Deborah Alves de Moraes Miguel',   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Denise Massom',                    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Denise Ramos Barreto',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Eduarda Bizzari de Brito',         'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Eva Quispe Apaza',                 'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Fernanda Rocha Nascimento Jacob',  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Flavio Yamane',                    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Francine Nascimento de Souza Rocha','ministerio','Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Gabriela Leite Roma',              'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Giulia Fuga Dal Maso',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Glaucia Helena de Souza Pinto Trindade','ministerio','Ministério de Ensino','Penha Kids','Professor / Auxiliar'),
  ('Isabel de Oliveira Batista',       'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Isabela Guedelha',                 'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Isabelle Soranso',                 'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Ivy Aline Gordon Leme Portilho',   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Jessica Daré Vasconcelos Gouvêa',  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Joseane Santos da Rocha',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Karina Cavalieri de Novaes',       'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Katia Ramos',                      'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Leticia Soares Moreiras',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Lisa de Souza Dias',               'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Livia Cristina de Morais Rodrigues','ministerio','Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Lucia Grotti',                     'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Luciana Pavia Villalva',           'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Luciene Marchesi Noguti',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Luiza Perico Patriani',            'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Marcela Neves Andrade',            'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Márcia Abdala',                    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Maressa Caroline Alonso Pereira',  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Maria Elisa',                      'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Maria Luiza Ramos da Rocha',       'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Meire de Jesus Santana',           'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Michele Brocker',                  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Natália Villano',                  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Nathália Iachel',                  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Nathália Nogutti',                 'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Perpétua Brito',                   'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Poliana Rocha Vargas Henrique',    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Priscila Castro',                  'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Raquel Cavalieri Lee',             'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Renata Rocha Vargas Henrique',     'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Rogério Carvalho',                 'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Sofia Souza Ramos',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Suzana de Queiroz Miranda',        'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Tânia Lima de Paula Dias',         'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Tiago Rocha Vargas Henrique',      'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Thiago Solino',                    'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Victória Duarte Checchi',          'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Viviane Scafflani',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar'),
  ('Yuri Diego Molina',                'ministerio', 'Ministério de Ensino', 'Penha Kids', 'Professor / Auxiliar');

-- 3.1.5 Grudados
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Carlos Alberto Henrique',       'ministerio', 'Ministério de Ensino', 'Grudados', 'Supervisor'),
  ('Sem. Tiago Rocha Vargas Henrique',   'ministerio', 'Ministério de Ensino', 'Grudados', 'Seminarista / Liderança Geral'),
  ('Presb. Anderson Portela',            'ministerio', 'Ministério de Ensino', 'Grudados', 'Conselheiro'),
  ('Jhonatan Diego Barreto',             'ministerio', 'Ministério de Ensino', 'Grudados', 'Louvor'),
  ('Yuri Molina Diego',                  'ministerio', 'Ministério de Ensino', 'Grudados', 'Liderança Geral'),
  ('Lisa Dias',                          'ministerio', 'Ministério de Ensino', 'Grudados', 'Liderança Geral'),
  ('Adriano Portela',                    'ministerio', 'Ministério de Ensino', 'Grudados', 'Professor EBD'),
  ('Aurea Daré',                         'ministerio', 'Ministério de Ensino', 'Grudados', 'Professor EBD'),
  ('Isabel Batista',                     'ministerio', 'Ministério de Ensino', 'Grudados', 'Professor EBD'),
  ('Perpétua Brito',                     'ministerio', 'Ministério de Ensino', 'Grudados', 'Professor EBD'),
  ('Thiago Solino',                      'ministerio', 'Ministério de Ensino', 'Grudados', 'Professor EBD');

-- 3.1.6 ETEP
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Carlos Eduardo Corrêa de Lima', 'ministerio', 'Ministério de Ensino', 'ETEP', 'Supervisão'),
  ('Presb. Max Filipe',                  'ministerio', 'Ministério de Ensino', 'ETEP', 'Representante do Conselho'),
  ('Rev. Amauri Oliveira',               'ministerio', 'Ministério de Ensino', 'ETEP', 'Coordenador Acadêmico'),
  ('Thais Rossana de Lima',              'ministerio', 'Ministério de Ensino', 'ETEP', 'Secretaria Acadêmica'),
  ('Gustavo Diaz',                       'ministerio', 'Ministério de Ensino', 'ETEP', 'Gestão Operacional e Transmissão'),
  ('Rev. Amauri Oliveira',               'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Rev. Cácio Silva',                   'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Rev. Carlos Eduardo Corrêa de Lima', 'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Rev. Carlos Henrique',               'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Caroline de Oliveira Cunha',         'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Rev. Filipe Checon',                 'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Diác. Flavio Gallani',               'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente'),
  ('Jhonatan Diego Barreto',             'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente / Professor Tutor'),
  ('Rev. Rogério Castro',                'ministerio', 'Ministério de Ensino', 'ETEP', 'Docente');

-- 3.1.7 Mídias do Ensino
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Poliana Rocha Vargas Henrique',    'ministerio', 'Ministério de Ensino', 'Mídias do Ensino', 'Equipe'),
  ('Sem. Tiago Rocha Vargas Henrique', 'ministerio', 'Ministério de Ensino', 'Mídias do Ensino', 'Equipe');

-- 3.1.8 Berçário e Ensino Infantil Noturno
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Ivy Aline Gordon Leme Portilho',   'ministerio', 'Ministério de Ensino', 'Berçário', 'Equipe'),
  ('Nathália Nogutti',                 'ministerio', 'Ministério de Ensino', 'Berçário', 'Equipe'),
  ('Deborah Alves',                    'ministerio', 'Ministério de Ensino', 'Ensino Infantil Noturno', 'Equipe'),
  ('Jéssica Vasconcelos Gouvêa',       'ministerio', 'Ministério de Ensino', 'Ensino Infantil Noturno', 'Equipe'),
  ('Yuri Diego Molina',                'ministerio', 'Ministério de Ensino', 'Ensino Infantil Noturno', 'Equipe');

-- 3.1.9 Mentoria para Pais
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Francine Nascimento', 'ministerio', 'Ministério de Ensino', 'Mentoria para Pais', 'Responsável');


-- ── 3.2 Ministério de Evangelização e Missões ────────────────

-- 3.2.1 Evangelização
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',        'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Supervisão'),
  ('Presb. Laércio Ferreira',   'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Conselheiro'),
  ('Diác. Gabriel Dias',        'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Coordenador'),
  ('Diác. Ariel Surco',         'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Carol Daré',                'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Cícero Martins da Silva',   'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Deise Augusto',             'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Débora Ferreira',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Sem. Guilherme Athú',       'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Guilherme Pietro',          'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Sem. Jean Silva',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Kevin Verdugues',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Sem. Léo Langer',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Marcos Terrenas',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Mariana Terrenas',          'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Maria Luisa',               'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Matheus Jorge',             'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Pablo Nunes Santos',        'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Rev. Paulo Erben',          'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Presb. Percílio',           'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Rebeca Abdala',             'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Diác. Ronaldo Gomes',       'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Sem. Tiago Henrique',       'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe'),
  ('Victor Góis',               'ministerio', 'Ministério de Evangelização e Missões', 'Evangelização', 'Equipe');

-- 3.2.2 GAM
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Cácio Silva',                      'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Supervisão'),
  ('Presb. Carlos Alberto',                 'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Conselheiro'),
  ('Jennifer da Silva Langervish',          'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Presidente'),
  ('Paulo Francisco da Silva',              'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Vice-Presidente'),
  ('Eni Belloti',                           'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Tesoureiro'),
  ('Priscila Nascimento dos Santos Castro', 'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Vice-Tesoureira'),
  ('Leonardo da Costa Langervish',          'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Secretário'),
  ('Elisângela Silva',                      'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Emma Castro',                           'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Henrique Masson',                       'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Marcelo Paulo Gomes da Silva',          'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Marisa Koritar',                        'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Norbert Koritar',                       'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Rev. Paulo Erben',                      'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe'),
  ('Priscila Castro',                       'ministerio', 'Ministério de Evangelização e Missões', 'GAM', 'Equipe');

-- 3.2.3 Ministério Hispânico
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Pr. Paulo Castro',                        'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Supervisão'),
  ('Diác. Ely Coelho',                        'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Conselheiro'),
  ('Lucila Verdugues Rodriguez',              'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Tesoureira'),
  ('Ariel Choquetarque',                      'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe'),
  ('Cristian Kevin',                          'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe'),
  ('Hermínio Estevão Ramos Rodrigues',        'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe'),
  ('Jéssica da Silva Rodrigues',              'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe'),
  ('Kevin Verdugues Miranda',                 'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe'),
  ('Maritza Choquetarque',                    'ministerio', 'Ministério de Evangelização e Missões', 'Hispânico', 'Equipe');


-- ── 3.3 Ministério de Ação Social e Cuidado ──────────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Rogério de Castro Chaves', 'ministerio', 'Ministério de Ação Social e Cuidado', 'Supervisão'),
  ('Presb. Edson Vieira',           'ministerio', 'Ministério de Ação Social e Cuidado', 'Conselheiro');

-- 3.3.1 Hebron
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Patrícia Alonso',        'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', 'Presidente'),
  ('Éder Fonseca',           'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', 'Vice-Presidente'),
  ('Camila Torres',          'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', '1º Secretário'),
  ('Danilo Lino',            'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', '2º Secretário'),
  ('Rev. Rogério Castro',    'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', 'Conselheiro'),
  ('Diác. Gabriel Dias',     'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', '1º Tesoureiro'),
  ('Eric de Moura Alves',    'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron', '2º Tesoureiro'),
  ('Rafael Sá',              'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron – Conselho Fiscal', 'Titular'),
  ('David Nelson Araújo Campos','ministerio','Ministério de Ação Social e Cuidado','Hebron – Conselho Fiscal','Titular'),
  ('Paulo F. Silva',         'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron – Conselho Fiscal', 'Titular'),
  ('Paulo dos Santos Silva', 'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron – Conselho Fiscal', 'Suplente'),
  ('Diác. Sérgio Crecchi',   'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron – Conselho Fiscal', 'Suplente'),
  ('Pablo Nunes Santos',     'ministerio', 'Ministério de Ação Social e Cuidado', 'Hebron – Conselho Fiscal', 'Suplente');

-- 3.3.2 Penha Care
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Atsushi Miyajima',        'ministerio', 'Ministério de Ação Social e Cuidado', 'Penha Care', 'Coordenação Administrativa'),
  ('Tânia Lima de Paula Dias',     'ministerio', 'Ministério de Ação Social e Cuidado', 'Penha Care', 'Equipe de Apoio'),
  ('Ivani Del Rio',                'ministerio', 'Ministério de Ação Social e Cuidado', 'Penha Care', 'Equipe de Apoio');

-- 3.3.3 Assistência Social e de Saúde
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Alessandra Bizeli Oliveira Sartori','ministerio','Ministério de Ação Social e Cuidado','Assistência – Psicologia',    'Psicóloga'),
  ('Terezinha Souto da Silva',          'ministerio','Ministério de Ação Social e Cuidado','Assistência – Psicologia',    'Psicóloga'),
  ('Roseli Oliveira Batista',           'ministerio','Ministério de Ação Social e Cuidado','Assistência – Acupuntura',    'Acupunturista'),
  ('Surama Cecília de Castro Ribeiro Lima','ministerio','Ministério de Ação Social e Cuidado','Assistência – Fisioterapia','Fisioterapeuta'),
  ('Natália Pagliaci',                  'ministerio','Ministério de Ação Social e Cuidado','Assistência – Fisioterapia',  'Fisioterapeuta'),
  ('Jamir Augustinali',                 'ministerio','Ministério de Ação Social e Cuidado','Assistência – Odontologia',   'Odontologista'),
  ('Henrique Masson',                   'ministerio','Ministério de Ação Social e Cuidado','Assistência – Odontologia',   'Odontologista'),
  ('Dr. Alberto Noguti',                'ministerio','Ministério de Ação Social e Cuidado','Assistência – Medicina',      'Médico'),
  ('Dr. Emerson Yamato',                'ministerio','Ministério de Ação Social e Cuidado','Assistência – Medicina',      'Médico'),
  ('Dra. Sabrina Mazuelos',             'ministerio','Ministério de Ação Social e Cuidado','Assistência – Medicina',      'Médica'),
  ('Dra. Jasmin Suk Hee Shin',          'ministerio','Ministério de Ação Social e Cuidado','Assistência – Medicina',      'Médica'),
  ('Deborah Alves',                     'ministerio','Ministério de Ação Social e Cuidado','Assistência – Jurídico',      'Orientação Jurídica'),
  ('Marisa Aquotti',                    'ministerio','Ministério de Ação Social e Cuidado','Assistência – Jurídico',      'Orientação Jurídica'),
  ('Meire de Jesus',                    'ministerio','Ministério de Ação Social e Cuidado','Assistência – Jurídico',      'Orientação Jurídica'),
  ('Waldir Walter Moreno',              'ministerio','Ministério de Ação Social e Cuidado','Assistência – Cabeleireiro',  'Cabeleireiro'),
  ('Cristina Gutierrez',                'ministerio','Ministério de Ação Social e Cuidado','Assistência – Podologia',     'Podóloga'),
  ('Maria Gorete Bolognini Aiello',     'ministerio','Ministério de Ação Social e Cuidado','Assistência – Nutrição',      'Nutricionista'),
  ('Kátia Villano',                     'ministerio','Ministério de Ação Social e Cuidado','Assistência – Nutrição',      'Nutricionista');

-- 3.3.4 Projetos de Ação Social
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Miss. Lourdes Alves de Oliveira',  'ministerio','Ministério de Ação Social e Cuidado','Projeto Reviver', 'Equipe'),
  ('Teresinha Souto',                  'ministerio','Ministério de Ação Social e Cuidado','Projeto Reviver', 'Equipe'),
  ('Rev. Aloísio Fagundes',            'ministerio','Ministério de Ação Social e Cuidado','Projeto Reviver', 'Equipe'),
  ('Liliane Alves de Moraes Miguel',   'ministerio','Ministério de Ação Social e Cuidado','Projeto Amparo',  'Coordenação'),
  ('Eni Beloti',                       'ministerio','Ministério de Ação Social e Cuidado','Projeto Amparo',  'Equipe'),
  ('Marcos Vinicius Novaes',           'ministerio','Ministério de Ação Social e Cuidado','Projeto Amparo',  'Equipe'),
  ('Yarian Santana Tamayo',            'ministerio','Ministério de Ação Social e Cuidado','Projeto Amparo',  'Equipe'),
  ('Midialis Baró Davila',             'ministerio','Ministério de Ação Social e Cuidado','Projeto Amparo',  'Equipe'),
  ('Solange Santos Góis de Oliveira',  'ministerio','Ministério de Ação Social e Cuidado','Projeto Esperança','Coordenação'),
  ('Selma Lima',                       'ministerio','Ministério de Ação Social e Cuidado','Projeto Esperança','Coordenação'),
  ('Caroline Silva',                   'ministerio','Ministério de Ação Social e Cuidado','PACA',             'Coordenação'),
  ('Patrícia Alonso',                  'ministerio','Ministério de Ação Social e Cuidado','PACA – Artes',     'Equipe'),
  ('Maressa Alonso',                   'ministerio','Ministério de Ação Social e Cuidado','PACA – Artes',     'Equipe'),
  ('Éder Fonseca',                     'ministerio','Ministério de Ação Social e Cuidado','PACA – Esportes',  'Equipe'),
  ('Lukas Maciel',                     'ministerio','Ministério de Ação Social e Cuidado','PACA – Esportes',  'Equipe'),
  ('Max Filipe',                       'ministerio','Ministério de Ação Social e Cuidado','Inspira',          'Coordenação'),
  ('Willian Baldin',                   'ministerio','Ministério de Ação Social e Cuidado','Inspira',          'Equipe'),
  ('Eder Fonseca',                     'ministerio','Ministério de Ação Social e Cuidado','Inspira',          'Equipe'),
  ('Diác. Gabriel Dias',               'ministerio','Ministério de Ação Social e Cuidado','Inspira',          'Equipe'),
  ('Sem. Lucas Johann Cruvinel Carvalho','ministerio','Ministério de Ação Social e Cuidado','Aprisco – Pastoral','Atividades Pastorais'),
  ('Rosana',                           'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Presidente'),
  ('Diác. Gabriel Dias',               'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Diretor Financeiro'),
  ('Rev. Jeremias Park',               'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Diretor Espiritual'),
  ('Valter Natal',                     'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Comissão de Manutenção'),
  ('Christian Adam Buzalski',          'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Comissão de Manutenção'),
  ('Dra. Jasmin Suk Hee Shin',         'ministerio','Ministério de Ação Social e Cuidado','Casa de Acolhimento Atibaia','Responsável pela Saúde');


-- ── 3.4 Ministérios de Família ───────────────────────────────

-- 3.4.1 Ministério Lar Cristão
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Fabio Luiz de Carvalho',               'ministerio','Ministério de Família','Lar Cristão','Supervisão'),
  ('Janaina Oliveira Simões de Carvalho',        'ministerio','Ministério de Família','Lar Cristão','Supervisão'),
  ('Rev. Rogério de Castro Chaves',              'ministerio','Ministério de Família','Lar Cristão','Supervisão'),
  ('Daniela Aparecida de França Santos',         'ministerio','Ministério de Família','Lar Cristão','Supervisão'),
  ('Diác. Ely C. Coelho',                        'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Jéssica W. T. Coelho',                       'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Guilherme Cunha',                            'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Georgia Cunha',                              'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Diác. Alexandre Carralero Martins',          'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Silvana Aparecida Sales Martins',            'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Presb. Laércio Ferreira Lima',               'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Surama Cecília de Castro Ribeiro Lima',      'ministerio','Ministério de Família','Lar Cristão','Coordenação'),
  ('Arnaldo Ernesto Junior',                     'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Silvia S. D. Ernesto',                       'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Fernando de Lima Bernardo Junior',           'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Bruna Elisabete Shimoyama Bernardo',         'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Daniel César',                               'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Camila Torres César',                        'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Eli C. Coelho',                              'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Lúcia Anaya Coelho',                         'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Elivaldo Vieira',                            'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Crisley Ferreira Vieira',                    'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Ítalo Amaral Lira',                          'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Michele Brocker',                            'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Marcos Vinícius Torres Lanza',               'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Ana Cássia dos Santos Lanza',                'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Matheus Galvão de Sousa',                    'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Giovana Brito de Lima',                      'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Michel Correia de Lima',                     'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Letícia Alencar de Lima',                    'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Ronaldo Ramos da Silva Cruz',                'ministerio','Ministério de Família','Lar Cristão','Equipe'),
  ('Jaqueline Rodrigues Silva Ramos',            'ministerio','Ministério de Família','Lar Cristão','Equipe');

-- 3.4.2 Terceira Idade
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Amauri Costa de Oliveira', 'ministerio','Ministério de Família','Terceira Idade','Supervisão'),
  ('Danila de Andrade Alves',       'ministerio','Ministério de Família','Terceira Idade','Coordenação'),
  ('Elifas Alves',                  'ministerio','Ministério de Família','Terceira Idade','Coordenação'),
  ('Elda Queila de Oliveira',       'ministerio','Ministério de Família','Terceira Idade','Aux. de Coordenação'),
  ('Elzira Gomes Ribeiro',          'ministerio','Ministério de Família','Terceira Idade','Equipe'),
  ('Maria do Carmo Alves',          'ministerio','Ministério de Família','Terceira Idade','Equipe');


-- ── 3.5 Ministérios de Acolhimento, Integração e Cuidado ─────

-- 3.5.1 Acolhimento, Integração e Cadastro
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','Acolhimento','Supervisão'),
  ('Deise Augusto',              'ministerio','Ministério de Acolhimento, Integração e Cuidado','Acolhimento','Coordenação'),
  ('Presb. Alberto Shiniti Noguti','ministerio','Ministério de Acolhimento, Integração e Cuidado','Acolhimento','Conselheiro'),
  ('Carlos Alberto',             'ministerio','Ministério de Acolhimento, Integração e Cuidado','Acolhimento','Líder do Acolhimento'),
  ('Luciana Crecchi',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Acolhimento','Líder do Cadastro'),
  ('Andrea Alves',               'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Dircilei Campos Costa',      'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Eni Belloti',                'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Glaucia Helena de Souza',    'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Hernani Souza de Almeida',   'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Ismael Theodoro de Carvalho','ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Ivani de Lourdes Sales',     'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Jane Altieri',               'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Neiva Lima Gomes',           'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Silvana Aparecida Sales',    'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Silvia de Souza',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Acolhimento','Equipe'),
  ('Deise Augusto',              'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Integração','Equipe'),
  ('Edneusa Rios',               'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Integração','Equipe'),
  ('Luciana Crecchi',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Cadastro','Equipe'),
  ('Bruna Shimoyama',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Cadastro','Equipe'),
  ('Clayton Nunes',              'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Cadastro','Equipe'),
  ('Priscila Celino',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Equipe Cadastro','Equipe'),
  ('Patrícia Lima',              'ministerio','Ministério de Acolhimento, Integração e Cuidado','Mídias Acolhimento','Equipe'),
  ('Bruna Shimoyama',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Mídias Acolhimento','Equipe'),
  ('Sem. Jean Silva',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','Software Ekklésia', 'Gerenciamento');

-- 3.5.2 DAI
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','DAI','Supervisão'),
  ('Michelli Santos Guedelha',   'ministerio','Ministério de Acolhimento, Integração e Cuidado','DAI','Equipe'),
  ('Mariana Terrenas Vidal',     'ministerio','Ministério de Acolhimento, Integração e Cuidado','DAI','Equipe'),
  ('Nara Justino Motta',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','DAI','Equipe'),
  ('Luciana Duarte Crecchi',     'ministerio','Ministério de Acolhimento, Integração e Cuidado','DAI','Equipe');

-- 3.5.3 MAD
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',      'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Supervisão'),
  ('Caroline Oliveira Cunha', 'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Coordenação'),
  ('Alaíde Correia',          'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Amanda Ferreira',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Cristiane Yamane',        'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Presb. Edson Luís',       'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Georgia Cunha',           'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Guilherme Cunha',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Letícia Góis',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Lúcia Celeste',           'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Solange Góis',            'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe'),
  ('Thaís Fernandes',         'ministerio','Ministério de Acolhimento, Integração e Cuidado','MAD','Equipe');


-- ── 3.6 Ministério de Música e Artes ─────────────────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Fábio Carvalho',                  'ministerio','Ministério de Música e Artes','Supervisão'),
  ('Victor Pagliaci Dal Maso',             'ministerio','Ministério de Música e Artes','Coordenação Geral'),
  ('Presb. Euclides Portella da Rocha',    'ministerio','Ministério de Música e Artes','Conselheiro');

-- 3.6.1 Coral João Calvino
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Presb. Éder Góis de Oliveira',          'ministerio','Ministério de Música e Artes','Coral João Calvino','Diretor'),
  ('Selma Lima',                            'ministerio','Ministério de Música e Artes','Coral João Calvino','Secretária de Toga'),
  ('Thais Lima',                            'ministerio','Ministério de Música e Artes','Coral João Calvino','Secretária de Chamada'),
  ('Márcia Aparecida Laureano Molina',      'ministerio','Ministério de Música e Artes','Coral João Calvino','Secretária de Partitura'),
  ('Hozéa Barbosa Stroppa',                'ministerio','Ministério de Música e Artes','Coral João Calvino','Regente');

-- 3.6.2 Instrumentistas
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Hozéa Barbosa Stroppa',      'ministerio','Ministério de Música e Artes','Instrumentistas','Equipe'),
  ('Percília Coutinho Pagliaci', 'ministerio','Ministério de Música e Artes','Instrumentistas','Equipe'),
  ('Mirian Stroppa Mesquita Freddi','ministerio','Ministério de Música e Artes','Instrumentistas','Equipe'),
  ('Jhonatan Diego Barreto',     'ministerio','Ministério de Música e Artes','Instrumentistas','Equipe');

-- 3.6.3 Coral Jovem
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Victor Pagliaci Dal Maso',  'ministerio','Ministério de Música e Artes','Coral Jovem','Regente'),
  ('Heitor Pagliaci Dal Maso',  'ministerio','Ministério de Música e Artes','Coral Jovem','Aux. de Regência');

-- 3.6.4 Coral Infantil Perfeito Louvor
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Presb. Anderson Portella',      'ministerio','Ministério de Música e Artes','Coral Infantil Perfeito Louvor','Conselheiro'),
  ('Hillarny Lourrane Duarte Alves','ministerio','Ministério de Música e Artes','Coral Infantil Perfeito Louvor','Regente'),
  ('Victor Pagliaci',               'ministerio','Ministério de Música e Artes','Coral Infantil Perfeito Louvor','Equipe'),
  ('Nathalia Pagliaci',             'ministerio','Ministério de Música e Artes','Coral Infantil Perfeito Louvor','Equipe'),
  ('Éder Fonseca',                  'ministerio','Ministério de Música e Artes','Coral Infantil Perfeito Louvor','Equipe');

-- 3.6.5 Orquestra
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',              'ministerio','Ministério de Música e Artes','Orquestra','Pastor'),
  ('Presb. Carlos Alberto Rocha da Silva','ministerio','Ministério de Música e Artes','Orquestra','Conselheiro'),
  ('Gilberto Massambani',             'ministerio','Ministério de Música e Artes','Orquestra','Regente'),
  ('Ivone Carlos Bento Silva',        'ministerio','Ministério de Música e Artes','Orquestra','Secretária'),
  ('Renato Sousa da Mata',            'ministerio','Ministério de Música e Artes','Orquestra','Liderança'),
  ('Talita Cataldi Gasparini da Mata','ministerio','Ministério de Música e Artes','Orquestra','Liderança'),
  ('Guilherme Martins Reis',          'ministerio','Ministério de Música e Artes','Orquestra','Liderança'),
  ('Ivone Carlos Bento da Silva',     'ministerio','Ministério de Música e Artes','Orquestra','Liderança'),
  ('Fabio Pereira de Oliveira',       'ministerio','Ministério de Música e Artes','Orquestra','Colaborador'),
  ('Tatiana dos Santos Oliveira',     'ministerio','Ministério de Música e Artes','Orquestra','Colaborador'),
  ('Paulo Julião de Oliveira',        'ministerio','Ministério de Música e Artes','Orquestra','Colaborador'),
  ('Italo Ferreira Gonçalves da Silva','ministerio','Ministério de Música e Artes','Orquestra','Colaborador'),
  ('Alysson Ferreira Gonçalves da Silva','ministerio','Ministério de Música e Artes','Orquestra','Colaborador');

-- 3.6.6 Escola de Música
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Presb. Carlos Alberto Rocha da Silva','ministerio','Ministério de Música e Artes','Escola de Música','Conselheiro'),
  ('Hozea Stropa',                        'ministerio','Ministério de Música e Artes','Escola de Música','Diretora'),
  ('Ivone Carlos Bento da Silva',         'ministerio','Ministério de Música e Artes','Escola de Música','Secretária');

-- 3.6.7 Louvor e Bandas
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Valdir Patriani',          'ministerio','Ministério de Música e Artes','Louvor e Bandas','Liderança'),
  ('Victor Pagliaci Dal Maso', 'ministerio','Ministério de Música e Artes','Louvor e Bandas','Liderança'),
  ('Heitor Pagliaci Dal Maso', 'ministerio','Ministério de Música e Artes','Louvor e Bandas','Liderança'),
  ('Rafael Sá',                'ministerio','Ministério de Música e Artes','Louvor e Bandas','Liderança');

-- 3.6.8 Hinos Clássicos / Litúrgicos e Pró-Culto
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Filipe Checon',       'ministerio','Ministério de Música e Artes','Hinos Clássicos','Supervisão'),
  ('Jhonatan Diego Barreto',   'ministerio','Ministério de Música e Artes','Hinos Clássicos','Coordenação'),
  ('Márcia Molina',            'ministerio','Ministério de Música e Artes','Hinos Clássicos','Secretária'),
  ('Carol Daré',               'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Rev. Carlos Henrique',     'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Eli Coelho',               'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Rev. Fabio Carvalho',      'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Márcia Molina',            'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Nathália',                 'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Rebeca Abdala',            'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Surama',                   'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Victor Pagliaci',          'ministerio','Ministério de Música e Artes','Hinos Clássicos – Equipe Vocal','Equipe'),
  ('Mirian Stroppa',           'ministerio','Ministério de Música e Artes','Hinos Clássicos – Pianistas','Pianista'),
  ('Percília Coutinho',        'ministerio','Ministério de Música e Artes','Hinos Clássicos – Pianistas','Pianista'),
  ('Jhonatan Diego',           'ministerio','Ministério de Música e Artes','Hinos Clássicos – Pianistas','Pianista'),
  ('Rev. Filipe Checon',       'ministerio','Ministério de Música e Artes','Pró-Culto','Supervisão'),
  ('Diác. Ronaldo Gomes',      'ministerio','Ministério de Música e Artes','Pró-Culto','Coordenação'),
  ('Diác. Gabriel Assis',      'ministerio','Ministério de Música e Artes','Pró-Culto','Coordenação'),
  ('Amanda Ferreira',          'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Enrico Vrunski',           'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Fabio Yamane',             'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Flavio Yamane',            'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Guilherme Pietro',         'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Isabelle Assis',           'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Lucas Soranso',            'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe'),
  ('Thiago Magalhães',         'ministerio','Ministério de Música e Artes','Pró-Culto','Equipe');

-- 3.6.9 Banda de Sopro
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Renato da Mata',  'ministerio','Ministério de Música e Artes','Banda de Sopro','Regente'),
  ('Paulo Julião',    'ministerio','Ministério de Música e Artes','Banda de Sopro','Aux. de Regência');

-- 3.6.10 Teatro
INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Rev. Carlos Lima',          'ministerio','Ministério de Música e Artes','Teatro','Supervisão'),
  ('Presb. Laércio Ferreira Lima','ministerio','Ministério de Música e Artes','Teatro','Conselheiro');


-- ── 3.7 Ministério de Comunicação e Tecnologia ───────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Amauri',              'ministerio','Ministério de Comunicação e Tecnologia','Supervisão'),
  ('Sem. Léo Langer',         'ministerio','Ministério de Comunicação e Tecnologia','Coordenação'),
  ('Presb. Marcus Novaes',     'ministerio','Ministério de Comunicação e Tecnologia','Conselheiro');

INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Jullyana Shiroma',     'ministerio','Ministério de Comunicação e Tecnologia','Mídias Sociais','Equipe'),
  ('Erika Melo',           'ministerio','Ministério de Comunicação e Tecnologia','Mídias Sociais','Equipe'),
  ('Gustavo Diaz',         'ministerio','Ministério de Comunicação e Tecnologia','Mídias Sociais','Equipe'),
  ('Mariana Ribeiro',      'ministerio','Ministério de Comunicação e Tecnologia','Projeção','Equipe'),
  ('Geórgia Cunha',        'ministerio','Ministério de Comunicação e Tecnologia','Projeção','Equipe'),
  ('Kevin Miranda',        'ministerio','Ministério de Comunicação e Tecnologia','Transmissão','Equipe'),
  ('Luiz',                 'ministerio','Ministério de Comunicação e Tecnologia','Som e Iluminação','Equipe'),
  ('Gustavo Diaz',         'ministerio','Ministério de Comunicação e Tecnologia','T.I.','Equipe'),
  ('Presb. Marcus Novaes', 'ministerio','Ministério de Comunicação e Tecnologia','T.I.','Equipe'),
  ('Heitor Pagliaci',      'ministerio','Ministério de Comunicação e Tecnologia','Infraestrutura','Equipe');


-- ── 3.8 Ministério de Intercessão ────────────────────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Fábio Carvalho',  'ministerio','Ministério de Intercessão','Supervisão'),
  ('Márcia Beatriz',       'ministerio','Ministério de Intercessão','Pais de Oração'),
  ('Rev. Fábio Carvalho',  'ministerio','Ministério de Intercessão','Relógio de Oração'),
  ('Rev. Fábio Carvalho',  'ministerio','Ministério de Intercessão','Culto das Primícias');


-- ── 3.9 Ministério de Capelania ──────────────────────────────
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Filipe Checon',         'ministerio','Ministério de Capelania','Supervisão'),
  ('Presb. Edmar Aquoti',        'ministerio','Ministério de Capelania','Conselheiro'),
  ('Diác. Osias Júnior',         'ministerio','Ministério de Capelania','Coordenador'),
  ('Caroline Maressa',           'ministerio','Ministério de Capelania','Secretária'),
  ('Diác. Cícero',               'ministerio','Ministério de Capelania','Equipe'),
  ('Diác. Gabriel Dias',         'ministerio','Ministério de Capelania','Equipe'),
  ('Guilherme Pietro',           'ministerio','Ministério de Capelania','Equipe'),
  ('Pr. Jeremias Jongpil Park',  'ministerio','Ministério de Capelania','Equipe'),
  ('Marcelo Macedo',             'ministerio','Ministério de Capelania','Equipe'),
  ('Diác. Ronaldo Gomes',        'ministerio','Ministério de Capelania','Equipe'),
  ('Thiago Alonso',              'ministerio','Ministério de Capelania','Equipe');


-- ════════════════════════════════════════════════════════════════
-- 4. SOCIEDADES INTERNAS
-- ════════════════════════════════════════════════════════════════

-- 4.1 UPH
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Filipe Checon',         'sociedade','UPH – União Presbiteriana de Homens','Pastor Supervisor'),
  ('Presb. Edson Vieira',        'sociedade','UPH – União Presbiteriana de Homens','Conselheiro'),
  ('Carlos Alberto Santos',      'sociedade','UPH – União Presbiteriana de Homens','Presidente'),
  ('Diác. Ronaldo Gomes',        'sociedade','UPH – União Presbiteriana de Homens','Vice-Presidente'),
  ('Diác. Gabriel Dias',         'sociedade','UPH – União Presbiteriana de Homens','1º Secretário'),
  ('Flávio Coelho Gomes',        'sociedade','UPH – União Presbiteriana de Homens','2º Secretário'),
  ('Flávio Yamane',              'sociedade','UPH – União Presbiteriana de Homens','1º Tesoureiro'),
  ('Diác. Sérgio Paulo',         'sociedade','UPH – União Presbiteriana de Homens','2º Tesoureiro');

-- 4.2 SAF
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Fábio Carvalho',                 'sociedade','SAF – Sociedade Auxiliadora Feminina','Pastor'),
  ('Presb. Hugo Alcântara Miguel',        'sociedade','SAF – Sociedade Auxiliadora Feminina','Conselheiro'),
  ('Edneusa Lino dos Santos',             'sociedade','SAF – Sociedade Auxiliadora Feminina','Presidente'),
  ('Alba Suely Maciel Pinto',             'sociedade','SAF – Sociedade Auxiliadora Feminina','Vice-Presidente'),
  ('Silvia Dias Ernesto',                 'sociedade','SAF – Sociedade Auxiliadora Feminina','1ª Secretária'),
  ('Joseneide Dantas da Silva',           'sociedade','SAF – Sociedade Auxiliadora Feminina','2ª Secretária'),
  ('Silvana Aparecida Sales Martins',     'sociedade','SAF – Sociedade Auxiliadora Feminina','Tesoureira');

-- 4.3 UMP
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Fábio Carvalho',         'sociedade','UMP – União da Mocidade Presbiteriana','Supervisor'),
  ('Lic. Paulo Erben',            'sociedade','UMP – União da Mocidade Presbiteriana','Supervisor'),
  ('Presb. Éder Góis de Oliveira','sociedade','UMP – União da Mocidade Presbiteriana','Conselheiro'),
  ('Jhonatan Diego Barreto',      'sociedade','UMP – União da Mocidade Presbiteriana','Coordenador (Asp.)'),
  ('Carol Vasconcelos',           'sociedade','UMP – União da Mocidade Presbiteriana','Equipe'),
  ('Vitor Gois',                  'sociedade','UMP – União da Mocidade Presbiteriana','Equipe'),
  ('Jessé Santana',               'sociedade','UMP – União da Mocidade Presbiteriana','Equipe'),
  ('Sem. Jean Silva',             'sociedade','UMP – União da Mocidade Presbiteriana','Apoio');

-- 4.4 UCP
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Carlos Henrique',              'sociedade','UCP – União das Crianças Presbiterianas','Pastor'),
  ('Presb. Anderson Portela',           'sociedade','UCP – União das Crianças Presbiterianas','Conselheiro'),
  ('Sem. Tiago Rocha Vargas Henrique',  'sociedade','UCP – União das Crianças Presbiterianas','Seminarista'),
  ('Karina Cavalieri de Novaes',        'sociedade','UCP – União das Crianças Presbiterianas','Coordenação'),
  ('Ivy Aline G. Leme Portilho',        'sociedade','UCP – União das Crianças Presbiterianas','Coordenação'),
  ('Tânia Lima de Paula Dias',          'sociedade','UCP – União das Crianças Presbiterianas','Coordenação');

-- 4.5 UPA
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Fábio Carvalho',              'sociedade','UPA – União Presbiteriana de Adolescentes','Pastor'),
  ('Pr. Paulo Erben',                  'sociedade','UPA – União Presbiteriana de Adolescentes','Pastor'),
  ('Presb. Marcus Novaes',             'sociedade','UPA – União Presbiteriana de Adolescentes','Conselheiro'),
  ('Presb. Anderson Portela',          'sociedade','UPA – União Presbiteriana de Adolescentes','Conselheiro'),
  ('Karina Cavalieri',                 'sociedade','UPA – União Presbiteriana de Adolescentes','Coordenador'),
  ('Sem. Tiago Rocha Vargas Henrique', 'sociedade','UPA – União Presbiteriana de Adolescentes','Coordenação'),
  ('Sem. Daniel Carvalho',             'sociedade','UPA – União Presbiteriana de Adolescentes','Seminarista'),
  ('Yuri Molina',                      'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança'),
  ('Lisa Dias',                        'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança'),
  ('Caio Noguti',                      'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Denise Masson',                    'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Henrique Masson',                  'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Jennifer Langer',                  'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Sem. Leonardo Langer',             'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Pablo Nunes',                      'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Rogério Scaflani',                 'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Viviane Sclafani',                 'sociedade','UPA – União Presbiteriana de Adolescentes','Equipe Estratégico'),
  ('Ana Carolina Scaflani',            'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('Enrico Cavalieri Lee',             'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('Joaquim Prince',                   'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('João Pedro de Freitas Lima',       'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('Milena',                           'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('Rafael Cavalieri de Novaes',       'sociedade','UPA – União Presbiteriana de Adolescentes','Liderança SOS'),
  ('Carol Prince',                     'sociedade','UPA – União Presbiteriana de Adolescentes','Coordenação da Cozinha');


-- ════════════════════════════════════════════════════════════════
-- 5. GRUPOS E MINISTÉRIOS DE APOIO
-- ════════════════════════════════════════════════════════════════

-- 5.1 Day Camp
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Pr. Fábio Carvalho',                  'grupo','Day Camp','Supervisão'),
  ('Presb. Euclides Portela',             'grupo','Day Camp','Conselheiro'),
  ('Maria Aparecida Mieto',               'grupo','Day Camp','Conselheiro'),
  ('Edneusa Lino dos Santos',             'grupo','Day Camp','Equipe'),
  ('Presb. Éder Góis de Oliveira',        'grupo','Day Camp','Equipe'),
  ('Presb. Edson Luís Vieira',            'grupo','Day Camp','Equipe'),
  ('Presb. Hugo Alcântara Miguel',        'grupo','Day Camp','Equipe'),
  ('Liliane Alves',                       'grupo','Day Camp','Equipe'),
  ('Luis Roberto dos Santos',             'grupo','Day Camp','Equipe'),
  ('Lúcia Celeste',                       'grupo','Day Camp','Equipe'),
  ('Solange Santos Góis de Oliveira',     'grupo','Day Camp','Equipe');

-- 5.2 Esportes
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Matheus Melo', 'grupo','Esportes','Responsável');

-- 5.5 JA – Jovens Adultos
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Pr. Fábio Carvalho',     'grupo','JA – Jovens Adultos','Supervisão'),
  ('Presb. Max Felipe',      'grupo','JA – Jovens Adultos','Conselheiro'),
  ('Marcia Alves de Souza',  'grupo','JA – Jovens Adultos','Coordenação'),
  ('Luciana Santos',         'grupo','JA – Jovens Adultos','Coordenação');

-- 5.6 Representações
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Eni Beloti', 'grupo','Representações (Brasil Presbiteriano / SAF em Revista / Alcance)','Representante');


-- ════════════════════════════════════════════════════════════════
-- 6. CONGREGAÇÕES
-- ════════════════════════════════════════════════════════════════

-- 6.1 IP Vila União
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Pr. Paulo Erben',    'congregacao','IP Vila União','Supervisão'),
  ('Presb. Percílio',    'congregacao','IP Vila União','Coordenação'),
  ('Joseneide',          'congregacao','IP Vila União','Equipe');

-- 6.2 IP Hispana (Cangaíba)
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Jairo Isaque',     'congregacao','IP Hispana – Cangaíba','Supervisão'),
  ('Miss. Kênia',           'congregacao','IP Hispana – Cangaíba','Supervisão'),
  ('Presb. Percílio',       'congregacao','IP Hispana – Cangaíba','Conselheiro'),
  ('Miss. Elinalda',        'congregacao','IP Hispana – Cangaíba','Equipe'),
  ('Diác. José Bohorques',  'congregacao','IP Hispana – Cangaíba','Equipe'),
  ('Floraci Bohroques',     'congregacao','IP Hispana – Cangaíba','Equipe');

-- 6.3 IP Jardim Primavera – Itaquaquecetuba
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Adriano Pedrosa',   'congregacao','IP Jardim Primavera – Itaquaquecetuba','Supervisão'),
  ('Luciana Pedrosa',        'congregacao','IP Jardim Primavera – Itaquaquecetuba','Supervisão'),
  ('Presb. Marcus Novais',   'congregacao','IP Jardim Primavera – Itaquaquecetuba','Conselheiro');

-- 6.4 IP Mueb (Carrão)
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Filipe Checon',   'congregacao','IP Mueb – Carrão','Supervisão'),
  ('Presb. Edson Vieira',  'congregacao','IP Mueb – Carrão','Conselheiro'),
  ('Luiz Júnior',          'congregacao','IP Mueb – Carrão','Tesoureiro');

INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Alexandre Trevisan',   'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro'),
  ('Presb. Edson Vieira',  'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro'),
  ('Presb. Joel Ferreira', 'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro'),
  ('Luiz Júnior',          'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro'),
  ('Marcos Pereira',       'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro'),
  ('Washington Palmieri',  'congregacao','IP Mueb – Carrão','Mesa Administrativa','Membro');

-- 6.5 IP Jardim Piratininga
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Rogério Castro',           'congregacao','IP Jardim Piratininga','Supervisão'),
  ('Daniela França',                'congregacao','IP Jardim Piratininga','Supervisão'),
  ('Presb. Laercio Lima',           'congregacao','IP Jardim Piratininga','Conselheiro'),
  ('Sem. Guilherme Athu',           'congregacao','IP Jardim Piratininga','Coordenação'),
  ('Eder Fonseca',                  'congregacao','IP Jardim Piratininga','Tesoureiro'),
  ('Bárbara Gomes',                 'congregacao','IP Jardim Piratininga','Equipe'),
  ('Cláudia',                       'congregacao','IP Jardim Piratininga','Equipe'),
  ('David Franco',                  'congregacao','IP Jardim Piratininga','Equipe'),
  ('Deniel de Castro Flor',         'congregacao','IP Jardim Piratininga','Equipe'),
  ('Edson',                         'congregacao','IP Jardim Piratininga','Equipe'),
  ('João Sobrinho',                 'congregacao','IP Jardim Piratininga','Equipe'),
  ('Patrícia Muniz',                'congregacao','IP Jardim Piratininga','Equipe'),
  ('Rafael Franco',                 'congregacao','IP Jardim Piratininga','Equipe'),
  ('Raquel Medeiros',               'congregacao','IP Jardim Piratininga','Equipe');

-- 6.6 IP Anália
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Michael Fassheber',    'congregacao','IP Anália','Supervisão'),
  ('Rodrigo Cunha Bascimento',  'congregacao','IP Anália','Tesoureiro');

INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('André Colette',        'congregacao','IP Anália','Mesa Administrativa','Membro'),
  ('Presb. Alberto Noguti','congregacao','IP Anália','Mesa Administrativa','Membro'),
  ('Eli Coelho',           'congregacao','IP Anália','Mesa Administrativa','Membro'),
  ('Rafael Cavalcante',    'congregacao','IP Anália','Mesa Administrativa','Membro'),
  ('Sergio',               'congregacao','IP Anália','Mesa Administrativa','Membro');

-- 6.7 IP Aprisco
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Pr. Rogério Castro',                    'congregacao','IP Aprisco','Conselheiro'),
  ('Ismael Gomes de Oliveira',              'congregacao','IP Aprisco','Tesoureiro');

INSERT INTO nomeados (nome, orgao_tipo, orgao, suborgao, cargo) VALUES
  ('Cesar Augusto',                         'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Edson Carvalho',                        'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Eliton Ribeiro',                        'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Ismael Gomes de Oliveira',              'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Laércio Xavier',                        'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Sem. Lucas Johann Cruvinel Carvalho',   'congregacao','IP Aprisco','Mesa Administrativa','Membro'),
  ('Claudia Carvalho',                      'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Eliton Ribeiro',                        'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Ismael Oliveira',                       'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Sem. Lucas Johann Cruvinel Carvalho',   'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Raquel de Albuquerque',                 'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Suelem Ribeiro',                        'congregacao','IP Aprisco','Escola Dominical','Professor'),
  ('Cesar Augusto',                         'congregacao','IP Aprisco','UMP','Presidente'),
  ('Maurício Henrique de Carvalho',         'congregacao','IP Aprisco','UMP','Vice-Presidente'),
  ('Sem. Lucas Johann Cruvinel Carvalho',   'congregacao','IP Aprisco','UMP','Tesoureiro'),
  ('Luara Goy',                             'congregacao','IP Aprisco','UMP','Secretária'),
  ('Rosimeire Xavier',                      'congregacao','IP Aprisco','SAF','Presidente'),
  ('Roseli Oliveira',                       'congregacao','IP Aprisco','SAF','Vice-Presidente'),
  ('Claudia Carvalho',                      'congregacao','IP Aprisco','SAF','Tesoureira'),
  ('Maria',                                 'congregacao','IP Aprisco','SAF','Secretária');

-- 6.8 IP Vila Rosária
INSERT INTO nomeados (nome, orgao_tipo, orgao, cargo) VALUES
  ('Rev. Ricardo Riul',      'congregacao','IP Vila Rosária','Supervisão'),
  ('Presb. Éder Góis',       'congregacao','IP Vila Rosária','Conselheiro'),
  ('Rubem',                  'congregacao','IP Vila Rosária','Tesoureiro');


-- ════════════════════════════════════════════════════════════════
-- VIEW: busca rápida de pessoa por nome
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW vw_pessoa_cargos AS
SELECT nome,
       string_agg(orgao || COALESCE(' › ' || suborgao, '') || ' — ' || COALESCE(cargo,''), ' | ' ORDER BY orgao_tipo, orgao) AS cargos,
       COUNT(*) AS total_cargos
FROM   nomeados
WHERE  status = 'ativo'
GROUP  BY nome
ORDER  BY nome;
