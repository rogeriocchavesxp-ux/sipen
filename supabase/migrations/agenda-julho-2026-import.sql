-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Importação da Agenda de Julho 2026
-- Execute no Supabase SQL Editor (erhwryfzpycahgsohhbh)
-- Fonte: Planilha Google Sheets compartilhada (julho/2026)
--
-- Espaços NÃO são alterados. Os nomes usados em agenda.espaco
-- são texto livre (conforme a planilha); o campo não tem FK para
-- public.espacos.
-- Proteção contra duplicatas: WHERE NOT EXISTS (titulo + data + hora_inicio)
-- ═══════════════════════════════════════════════════════════════


-- ── Importar eventos de julho 2026 ───────────────────────────
-- Usa CTE para evitar duplicatas (checa titulo + data + hora_inicio)
-- Status 'confirmado' + visibilidade_publica = true para todos
-- Eventos sem horário definido são importados com hora_inicio = NULL

WITH importados (titulo, tipo, data, data_enc, mes, diasem, hi, hf, espaco, org, resp, rec, obs, origem) AS (
  VALUES

    -- ── 01/07 Quarta-feira ────────────────────────────────────
    ('Culto das Primícias',           'Culto',          '2026-07-01'::DATE, '2026-07-01'::DATE, 'Julho', 'Quarta-feira', '07:00', '08:00', 'Templo',              'Min. Intercessão',  'Rev. Fábio',      'Mensal',    NULL, 'planilha'),
    ('EBF — Escola Bíblica de Férias','EBF',            '2026-07-01'::DATE, '2026-07-03'::DATE, 'Julho', 'Quarta-feira',  NULL,    NULL,   '',                    '',                  '',                '',          'EBF 01 a 03/07', 'planilha'),
    ('Tarde da Esperança',            'Projeto Social', '2026-07-01'::DATE, '2026-07-01'::DATE, 'Julho', 'Quarta-feira', '14:30', '15:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),
    ('Projeto Esperança',             'Projeto Social', '2026-07-01'::DATE, '2026-07-01'::DATE, 'Julho', 'Quarta-feira', '15:30', '17:00', 'Sala do Pátio',       'Projeto Esperança', 'Berenice',        'Semanal',   NULL, 'planilha'),
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-01'::DATE, '2026-07-01'::DATE, 'Julho', 'Quarta-feira', '20:00', '22:00', 'Sala 201',            'Min. Música',       'Hozea',           'Semanal',   'Sala 201 p/ensaio + Templo', 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-01'::DATE, '2026-07-01'::DATE, 'Julho', 'Quarta-feira', '20:00',  NULL,   '',                    'Min. Música',       'Victor',          '',          NULL, 'planilha'),

    -- ── 02/07 Quinta-feira ────────────────────────────────────
    ('Ensaio Coral Intersinodal',     'Ensaio',         '2026-07-02'::DATE, '2026-07-02'::DATE, 'Julho', 'Quinta-feira', '19:00', '21:30', 'Sala 201',            'SLP',               'Hozea',           'Semanal',   NULL, 'planilha'),
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-02'::DATE, '2026-07-02'::DATE, 'Julho', 'Quinta-feira', '19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),

    -- ── 04/07 Sábado ─────────────────────────────────────────
    ('Ensaio do Louvor',              'Ensaio',         '2026-07-04'::DATE, '2026-07-04'::DATE, 'Julho', 'Sábado',       '13:00', '15:00', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Ensaio do Hispano',             'Ensaio',         '2026-07-04'::DATE, '2026-07-04'::DATE, 'Julho', 'Sábado',       '15:00', '16:30', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Culto Movimento',               'Culto',          '2026-07-04'::DATE, '2026-07-04'::DATE, 'Julho', 'Sábado',       '17:00', '23:00', 'Templo + Pátio',      'UMP',               'Jhonatan',        'Quinzenal', NULL, 'planilha'),

    -- ── 05/07 Domingo ────────────────────────────────────────
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-05'::DATE, '2026-07-05'::DATE, 'Julho', 'Domingo',      '16:00', '17:30', 'Templo',              'Min. Música',       'Hozea',           '',          NULL, 'planilha'),

    -- ── 06/07 Segunda-feira ───────────────────────────────────
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-06'::DATE, '2026-07-06'::DATE, 'Julho', 'Segunda-feira','19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),
    ('Conexão com Deus',              'Culto',          '2026-07-06'::DATE, '2026-07-06'::DATE, 'Julho', 'Segunda-feira','20:00', '21:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),

    -- ── 07/07 Terça-feira ────────────────────────────────────
    ('Ensaio de Orquestra',           'Ensaio',         '2026-07-07'::DATE, '2026-07-07'::DATE, 'Julho', 'Terça-feira',  '19:30', '22:30', 'Templo',              'Min. Música',       'Pb Carlos Rocha', 'Semanal',   'Templo ou Penha Kids', 'planilha'),
    ('Pequenos Grupos',               'Pequenos Grupos','2026-07-07'::DATE, '2026-07-07'::DATE, 'Julho', 'Terça-feira',  '20:00', '22:00', 'Penha Kids, Sala 01, Sala 03', 'Pequenos Grupos', 'Rev. Amauri', 'Semanal', NULL, 'planilha'),

    -- ── 08/07 Quarta-feira ────────────────────────────────────
    ('EBF — Escola Bíblica de Férias','EBF',            '2026-07-08'::DATE, '2026-07-10'::DATE, 'Julho', 'Quarta-feira', '14:00', '18:00', 'A definir',           '',                  'Pb Anderson',     '',          'Precisa delimitar o espaço', 'planilha'),
    ('Tarde da Esperança',            'Projeto Social', '2026-07-08'::DATE, '2026-07-08'::DATE, 'Julho', 'Quarta-feira', '14:30', '15:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),
    ('Projeto Esperança',             'Projeto Social', '2026-07-08'::DATE, '2026-07-08'::DATE, 'Julho', 'Quarta-feira', '15:30', '17:00', 'Sala do Pátio',       'Projeto Esperança', 'Solange Gois',    'Semanal',   NULL, 'planilha'),
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-08'::DATE, '2026-07-08'::DATE, 'Julho', 'Quarta-feira', '20:00', '22:00', 'Sala 201',            'Min. Música',       'Hozea',           'Semanal',   'Sala 201 p/ensaio + Templo', 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-08'::DATE, '2026-07-08'::DATE, 'Julho', 'Quarta-feira', '20:00',  NULL,   '',                    'Min. Música',       'Victor',          '',          NULL, 'planilha'),

    -- ── 09/07 Quinta-feira ────────────────────────────────────
    ('Ensaio Coral Intersinodal',     'Ensaio',         '2026-07-09'::DATE, '2026-07-09'::DATE, 'Julho', 'Quinta-feira', '19:00', '21:30', 'Sala 201',            'SLP',               'Hozea',           'Semanal',   NULL, 'planilha'),
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-09'::DATE, '2026-07-09'::DATE, 'Julho', 'Quinta-feira', '19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),

    -- ── 10/07 Sexta-feira ────────────────────────────────────
    ('Pais de Oração',                'Reunião',        '2026-07-10'::DATE, '2026-07-10'::DATE, 'Julho', 'Sexta-feira',  '20:00', '21:30', 'Sala 03',             'Min. Intercessão',  'Rev. Fábio',      'Mensal',    NULL, 'planilha'),

    -- ── 11/07 Sábado ─────────────────────────────────────────
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-11'::DATE, '2026-07-11'::DATE, 'Julho', 'Sábado',       '10:00', '12:00', 'Templo',              'Min. Música',       'Victor',          '',          NULL, 'planilha'),
    ('Ensaio do Louvor',              'Ensaio',         '2026-07-11'::DATE, '2026-07-11'::DATE, 'Julho', 'Sábado',       '13:00', '15:00', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Ensaio do Hispano',             'Ensaio',         '2026-07-11'::DATE, '2026-07-11'::DATE, 'Julho', 'Sábado',       '15:00', '16:30', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Encontro Grudados',             'Evento',         '2026-07-11'::DATE, '2026-07-11'::DATE, 'Julho', 'Sábado',       '15:00', '18:00', 'Sala da UPA',         'Penha Kids',        'Tiago Henrique',  'Mensal',    NULL, 'planilha'),
    ('Jantar Beneficente Assoc. Hebron','Evento',       '2026-07-11'::DATE, '2026-07-11'::DATE, 'Julho', 'Sábado',       '17:00', '22:00', 'Pátio, Cozinha',      'Assoc. Hebron',     'Dra Patrícia Alonso','',       NULL, 'planilha'),

    -- ── 12/07 Domingo ────────────────────────────────────────
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-12'::DATE, '2026-07-12'::DATE, 'Julho', 'Domingo',      '16:00', '17:30', 'Templo',              'Min. Música',       'Hozea',           '',          NULL, 'planilha'),

    -- ── 13/07 Segunda-feira ───────────────────────────────────
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-13'::DATE, '2026-07-13'::DATE, 'Julho', 'Segunda-feira','19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),
    ('Conexão com Deus',              'Culto',          '2026-07-13'::DATE, '2026-07-13'::DATE, 'Julho', 'Segunda-feira','20:00', '21:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),

    -- ── 14/07 Terça-feira ────────────────────────────────────
    ('Ensaio de Orquestra',           'Ensaio',         '2026-07-14'::DATE, '2026-07-14'::DATE, 'Julho', 'Terça-feira',  '19:30', '22:30', 'Templo',              'Min. Música',       'Pb Carlos Rocha', 'Semanal',   'Templo ou Penha Kids', 'planilha'),
    ('Pequenos Grupos',               'Pequenos Grupos','2026-07-14'::DATE, '2026-07-14'::DATE, 'Julho', 'Terça-feira',  '20:00', '22:00', 'Penha Kids, Sala 01, Sala 03', 'Pequenos Grupos', 'Rev. Amauri', 'Semanal', NULL, 'planilha'),

    -- ── 15/07 Quarta-feira ────────────────────────────────────
    ('Tarde da Esperança',            'Projeto Social', '2026-07-15'::DATE, '2026-07-15'::DATE, 'Julho', 'Quarta-feira', '14:30', '15:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),
    ('Projeto Esperança',             'Projeto Social', '2026-07-15'::DATE, '2026-07-15'::DATE, 'Julho', 'Quarta-feira', '15:30', '17:00', 'Sala do Pátio',       'Projeto Esperança', 'Solange Gois',    'Semanal',   NULL, 'planilha'),
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-15'::DATE, '2026-07-15'::DATE, 'Julho', 'Quarta-feira', '20:00', '22:00', 'Sala 201',            'Min. Música',       'Hozea',           'Semanal',   'Sala 201 p/ensaio + Templo', 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-15'::DATE, '2026-07-15'::DATE, 'Julho', 'Quarta-feira', '20:00',  NULL,   '',                    'Min. Música',       'Victor',          '',          NULL, 'planilha'),

    -- ── 16/07 Quinta-feira ────────────────────────────────────
    ('Ensaio Coral Intersinodal',     'Ensaio',         '2026-07-16'::DATE, '2026-07-16'::DATE, 'Julho', 'Quinta-feira', '19:00', '21:30', 'Sala 201',            'SLP',               'Hozea',           'Semanal',   NULL, 'planilha'),
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-16'::DATE, '2026-07-16'::DATE, 'Julho', 'Quinta-feira', '19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),

    -- ── 17/07 Sexta-feira ────────────────────────────────────
    ('Esquenta SOS (Adolescentes)',   'Evento',         '2026-07-17'::DATE, '2026-07-17'::DATE, 'Julho', 'Sexta-feira',  '20:00', '23:59', 'Sala da UPA, Pátio',  'UPA',               'Rev. Fábio',      '',          NULL, 'planilha'),

    -- ── 18/07 Sábado ─────────────────────────────────────────
    ('Audição Escola de Música Simon Lima','Evento',    '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '09:00', '13:00', 'Penha Kids',          'Escola de Música',  'Hozea',           'Eventual',  NULL, 'planilha'),
    ('Café da Manhã com os Homens',   'Evento',         '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '09:00', '12:00', 'Sala B01',            'Pastoral',          'Edneusa',         'Eventual',  NULL, 'planilha'),
    ('Curso de Capelania',            'Curso',          '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '08:00', '18:00', 'Sala B05',            'Hebrom',            'Patrícia Alonso', 'Eventual',  NULL, 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '10:00', '12:00', 'Templo',              'Min. Música',       'Victor',          'Quinzenal', NULL, 'planilha'),
    ('Ensaio do Louvor',              'Ensaio',         '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '13:00', '15:00', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Ensaio do Hispano',             'Ensaio',         '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '15:00', '16:30', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Culto Movimento',               'Culto',          '2026-07-18'::DATE, '2026-07-18'::DATE, 'Julho', 'Sábado',       '17:00', '23:00', 'Templo + Pátio',      'UMP',               'Jhonatan',        'Quinzenal', NULL, 'planilha'),

    -- ── 20/07 Segunda-feira ───────────────────────────────────
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-20'::DATE, '2026-07-20'::DATE, 'Julho', 'Segunda-feira','19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),
    ('Conexão com Deus',              'Culto',          '2026-07-20'::DATE, '2026-07-20'::DATE, 'Julho', 'Segunda-feira','20:00', '21:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),

    -- ── 21/07 Terça-feira ────────────────────────────────────
    ('Ensaio de Orquestra',           'Ensaio',         '2026-07-21'::DATE, '2026-07-21'::DATE, 'Julho', 'Terça-feira',  '19:30', '22:30', 'Templo',              'Min. Música',       'Pb Carlos Rocha', 'Semanal',   'Templo ou Penha Kids', 'planilha'),
    ('Pequenos Grupos',               'Pequenos Grupos','2026-07-21'::DATE, '2026-07-21'::DATE, 'Julho', 'Terça-feira',  '20:00', '22:00', 'Penha Kids, Sala 01, Sala 03', 'Pequenos Grupos', 'Rev. Amauri', 'Semanal', NULL, 'planilha'),

    -- ── 22/07 Quarta-feira ────────────────────────────────────
    ('Tarde da Esperança',            'Projeto Social', '2026-07-22'::DATE, '2026-07-22'::DATE, 'Julho', 'Quarta-feira', '14:30', '15:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),
    ('Projeto Esperança',             'Projeto Social', '2026-07-22'::DATE, '2026-07-22'::DATE, 'Julho', 'Quarta-feira', '15:30', '17:00', 'Sala do Pátio',       'Projeto Esperança', 'Berenice',        'Semanal',   NULL, 'planilha'),
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-22'::DATE, '2026-07-22'::DATE, 'Julho', 'Quarta-feira', '20:00', '22:00', 'Sala 201',            'Min. Música',       'Hozea',           'Semanal',   'Sala 201 p/ensaio + Templo', 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-22'::DATE, '2026-07-22'::DATE, 'Julho', 'Quarta-feira', '20:00',  NULL,   '',                    'Min. Música',       'Victor',          '',          NULL, 'planilha'),

    -- ── 23/07 Quinta-feira ────────────────────────────────────
    ('Ensaio Coral Intersinodal',     'Ensaio',         '2026-07-23'::DATE, '2026-07-23'::DATE, 'Julho', 'Quinta-feira', '19:00', '21:30', 'Sala 201',            'SLP',               'Hozea',           'Semanal',   NULL, 'planilha'),
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-23'::DATE, '2026-07-23'::DATE, 'Julho', 'Quinta-feira', '19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),

    -- ── 24/07 Sexta-feira ────────────────────────────────────
    ('Conferência UPA',               'Evento',         '2026-07-24'::DATE, '2026-07-24'::DATE, 'Julho', 'Sexta-feira',  '20:00', '23:59', 'Sala da UPA, Pátio',  'UPA',               'Rev. Fábio',      '',          NULL, 'planilha'),

    -- ── 25/07 Sábado ─────────────────────────────────────────
    -- ATENÇÃO: planilha registra 25/07 como "Sexta-feira" em uma entrada
    -- mas 25/07/2026 é Sábado — mantemos como Sábado (correto)
    ('Conferência UPA — Dia Inteiro', 'Evento',         '2026-07-25'::DATE, '2026-07-25'::DATE, 'Julho', 'Sábado',       '08:00', '23:59', 'Sala da UPA, Pátio',  'UPA',               'Rev. Fábio',      '',          'Entrada duplicada na planilha (lançada como Sexta-feira)', 'planilha'),
    ('Ensaio do Louvor',              'Ensaio',         '2026-07-25'::DATE, '2026-07-25'::DATE, 'Julho', 'Sábado',       '13:00', '15:00', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Ensaio do Hispano',             'Ensaio',         '2026-07-25'::DATE, '2026-07-25'::DATE, 'Julho', 'Sábado',       '15:00', '16:30', 'Templo',              'Min. Música',       'Victor',          'Semanal',   NULL, 'planilha'),
    ('Reunião de Jovens Adultos',     'Reunião',        '2026-07-25'::DATE, '2026-07-25'::DATE, 'Julho', 'Sábado',       '19:00', '22:00', 'Penha Kids',          'Jovens Adultos',    'Márcia Souza',    'Mensal',    NULL, 'planilha'),

    -- ── 26/07 Domingo ────────────────────────────────────────
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-26'::DATE, '2026-07-26'::DATE, 'Julho', 'Domingo',      '16:00', '17:30', 'Templo',              'Min. Música',       'Hozea',           '',          NULL, 'planilha'),
    ('Supremo Concílio — Manaus',     'Evento',         '2026-07-26'::DATE, '2026-07-31'::DATE, 'Julho', 'Domingo',       NULL,    NULL,   'Manaus',              '',                  '',                '',          '26 a 31/07', 'planilha'),

    -- ── 27/07 Segunda-feira ───────────────────────────────────
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-27'::DATE, '2026-07-27'::DATE, 'Julho', 'Segunda-feira','19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),
    ('Conexão com Deus — Lançamento Casa de Paz','Culto','2026-07-27'::DATE,'2026-07-27'::DATE, 'Julho', 'Segunda-feira','20:00', '21:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   'Lançamento Casa de Paz — 2º semestre', 'planilha'),

    -- ── 28/07 Terça-feira ────────────────────────────────────
    ('Ensaio de Orquestra',           'Ensaio',         '2026-07-28'::DATE, '2026-07-28'::DATE, 'Julho', 'Terça-feira',  '19:30', '22:30', 'Templo',              'Min. Música',       'Pb Carlos Rocha', 'Semanal',   'Templo ou Penha Kids', 'planilha'),
    ('Pequenos Grupos',               'Pequenos Grupos','2026-07-28'::DATE, '2026-07-28'::DATE, 'Julho', 'Terça-feira',  '20:00', '22:00', 'Penha Kids, Sala 01, Sala 03', 'Pequenos Grupos', 'Rev. Amauri', 'Semanal', NULL, 'planilha'),

    -- ── 29/07 Quarta-feira ────────────────────────────────────
    ('Tarde da Esperança',            'Projeto Social', '2026-07-29'::DATE, '2026-07-29'::DATE, 'Julho', 'Quarta-feira', '14:30', '15:30', 'Templo',              'Equipe Pastoral',   'Rev. Filipe',     'Semanal',   NULL, 'planilha'),
    ('Projeto Esperança',             'Projeto Social', '2026-07-29'::DATE, '2026-07-29'::DATE, 'Julho', 'Quarta-feira', '15:30', '17:00', 'Sala do Pátio',       'Projeto Esperança', 'Berenice',        'Semanal',   NULL, 'planilha'),
    ('Ensaio Coral JC',               'Ensaio',         '2026-07-29'::DATE, '2026-07-29'::DATE, 'Julho', 'Quarta-feira', '20:00', '22:00', 'Sala 201',            'Min. Música',       'Hozea',           'Semanal',   'Sala 201 p/ensaio + Templo', 'planilha'),
    ('Ensaio do Coral Jovem',         'Ensaio',         '2026-07-29'::DATE, '2026-07-29'::DATE, 'Julho', 'Quarta-feira', '20:00',  NULL,   '',                    'Min. Música',       'Victor',          '',          NULL, 'planilha'),

    -- ── 30/07 Quinta-feira ────────────────────────────────────
    ('Ensaio Coral Intersinodal',     'Ensaio',         '2026-07-30'::DATE, '2026-07-30'::DATE, 'Julho', 'Quinta-feira', '19:00', '21:30', 'Sala 201',            'SLP',               'Hozea',           'Semanal',   NULL, 'planilha'),
    ('Ensaio de Banda de Sopro',      'Ensaio',         '2026-07-30'::DATE, '2026-07-30'::DATE, 'Julho', 'Quinta-feira', '19:00', '22:30', 'Penha Kids',          'Min. Música',       'Pb Carlos Rocha', 'Semanal',   NULL, 'planilha'),

    -- ── 31/07 Sexta-feira ────────────────────────────────────
    ('SOS (Adolescentes) — Retorno',  'Evento',         '2026-07-31'::DATE, '2026-07-31'::DATE, 'Julho', 'Sexta-feira',  '20:00', '23:59', 'Templo + Pátio',      'UPA',               'Rev. Fábio',      '',          NULL, 'planilha')

)
INSERT INTO public.agenda (
  titulo, tipo,
  data, data_encerramento, mes, dia_semana,
  hora_inicio, hora_fim,
  espaco, organizador, observacao,
  status, visibilidade_publica,
  recorrencia, origem, origem_sol
)
SELECT
  i.titulo, i.tipo,
  i.data,   i.data_enc,  i.mes, i.diasem,
  i.hi,     i.hf,
  i.espaco, i.org,       i.obs,
  'confirmado', true,
  NULLIF(i.rec, ''), 'planilha', i.resp
FROM importados i
WHERE NOT EXISTS (
  SELECT 1 FROM public.agenda a
  WHERE a.titulo     = i.titulo
    AND a.data       = i.data
    AND COALESCE(a.hora_inicio, '') = COALESCE(i.hi, '')
    AND a.deleted_at IS NULL
);
