-- ═══════════════════════════════════════════════════════
-- SIPEN — Fornecedores + Notas Fiscais HAZAL
-- Executar APÓS recursos-estoque.sql
-- SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- ── 1. Tabela de Fornecedores ────────────────────────
CREATE TABLE IF NOT EXISTS recursos_fornecedores (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text NOT NULL,
  cnpj        text UNIQUE,
  ie          text,
  im          text,
  endereco    text,
  numero      text,
  complemento text,
  bairro      text,
  cep         text,
  cidade      text,
  estado      char(2),
  telefone    text,
  email       text,
  contato     text,
  obs         text,
  ativo       boolean DEFAULT true,
  criado_em   timestamptz DEFAULT now()
);

-- ── 2. Tabela de Notas Fiscais ───────────────────────
CREATE TABLE IF NOT EXISTS recursos_notas_fiscais (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id   uuid REFERENCES recursos_fornecedores(id) ON DELETE RESTRICT,
  numero          text,
  serie           text,
  chave_acesso    text UNIQUE,
  natureza        text,
  data_emissao    date,
  data_entrada    date,
  valor_total     numeric(12,2),
  valor_frete     numeric(12,2) DEFAULT 0,
  valor_desconto  numeric(12,2) DEFAULT 0,
  forma_pagamento text,
  vencimento      date,
  protocolo       text,
  obs             text,
  criado_em       timestamptz DEFAULT now()
);

-- ── 3. Itens das Notas Fiscais ───────────────────────
CREATE TABLE IF NOT EXISTS recursos_nf_itens (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_id         uuid NOT NULL REFERENCES recursos_notas_fiscais(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES recursos_itens(id) ON DELETE SET NULL,
  codigo_produto  text,
  descricao       text NOT NULL,
  ncm             text,
  cfop            text,
  unidade         text,
  quantidade      numeric(12,4),
  valor_unitario  numeric(12,4),
  valor_total     numeric(12,2),
  criado_em       timestamptz DEFAULT now()
);

-- ── 4. Colunas extras em movimentos ─────────────────
ALTER TABLE recursos_movimentos ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES recursos_fornecedores(id);
ALTER TABLE recursos_movimentos ADD COLUMN IF NOT EXISTS nota_id       uuid REFERENCES recursos_notas_fiscais(id);

-- ── 5. RLS ───────────────────────────────────────────
ALTER TABLE recursos_fornecedores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_nf_itens      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "rec_forn_read"  ON recursos_fornecedores  FOR SELECT TO authenticated USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rec_forn_write" ON recursos_fornecedores  FOR ALL    TO authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rec_nf_read"    ON recursos_notas_fiscais FOR SELECT TO authenticated USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rec_nf_write"   ON recursos_notas_fiscais FOR ALL    TO authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rec_nfi_read"   ON recursos_nf_itens      FOR SELECT TO authenticated USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "rec_nfi_write"  ON recursos_nf_itens      FOR ALL    TO authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════
-- FORNECEDOR: HAZAL DISTRIBUIDORA DE ALIMENTOS LTDA
-- CNPJ: 49.385.828/0001-02 · IE: 138541152118
-- R Maria Teresa Assunção, 471 Bloco A · Vila São Geraldo
-- CEP 03609-000 · São Paulo SP · (11) 4277-5955
-- ═══════════════════════════════════════════════════════
INSERT INTO recursos_fornecedores
  (nome, cnpj, ie, endereco, numero, complemento, bairro, cep, cidade, estado, telefone)
VALUES
  ('HAZAL DISTRIBUIDORA DE ALIMENTOS LTDA',
   '49.385.828/0001-02', '138541152118',
   'R Maria Teresa Assunção', '471', 'Bloco A',
   'Vila São Geraldo', '03609-000', 'São Paulo', 'SP', '(11) 4277-5955')
ON CONFLICT (cnpj) DO UPDATE SET
  nome = EXCLUDED.nome, ie = EXCLUDED.ie,
  endereco = EXCLUDED.endereco, numero = EXCLUDED.numero,
  complemento = EXCLUDED.complemento, bairro = EXCLUDED.bairro,
  cep = EXCLUDED.cep, telefone = EXCLUDED.telefone;

-- ═══════════════════════════════════════════════════════
-- CATEGORIAS (garantir existência)
-- ═══════════════════════════════════════════════════════
INSERT INTO recursos_categorias (nome, icone) VALUES
  ('Limpeza',        '🧹'),
  ('Cozinha',        '🍽️'),
  ('Papel e Higiene','🧻')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- ITENS DE ESTOQUE
-- 22 produtos únicos das 4 NF-es
-- ═══════════════════════════════════════════════════════
DO $$
DECLARE
  cat_lim  uuid := (SELECT id FROM recursos_categorias WHERE nome = 'Limpeza'         LIMIT 1);
  cat_coz  uuid := (SELECT id FROM recursos_categorias WHERE nome = 'Cozinha'         LIMIT 1);
  cat_pap  uuid := (SELECT id FROM recursos_categorias WHERE nome = 'Papel e Higiene' LIMIT 1);
BEGIN
  INSERT INTO recursos_itens (nome, categoria_id, unidade, estoque_atual, estoque_minimo) VALUES
    -- Limpeza
    ('Talco Desinfetante VMAX 5LT',              cat_lim, 'un',   0, 5),
    ('Cloro 10/12% 5LT Forte',                   cat_lim, 'un',   0, 3),
    ('Multiuso Original 5LT Concentrado',        cat_lim, 'un',   0, 3),
    ('Multiuso Suprema Tradicional 500ML',       cat_lim, 'un',   0, 5),
    ('Detergente Grill Allmar Pro 5LT',          cat_lim, 'un',   0, 3),
    ('Água Sanitária 5LT c/Cloro Ativo',         cat_lim, 'gl',   0, 3),
    ('Desinfetante Urca 5LT Lavanda',            cat_lim, 'un',   0, 3),
    ('Removedor Zulu 1LT Lavanda',               cat_lim, 'un',   0, 2),
    ('Saco de Lixo 100LT 5KG Reforçado',         cat_lim, 'un',   0, 2),
    ('Saco de Lixo 60L Preto P5 70x90cm 100un',  cat_lim, 'kg',   0, 2),
    ('Saco de Lixo 100L P5 90x100cm 10un',       cat_lim, 'pcte', 0, 2),
    ('Pó Tixan Conc 800G CT Primavera',          cat_lim, 'cx',   0, 2),
    -- Papel e Higiene
    ('Papel Toalha Bobina 100% 28GR 6 Rolos',    cat_pap, 'un',   0, 3),
    ('Papel Toalha Bobina 100% 2GR 6 Rolos',     cat_pap, 'un',   0, 3),
    ('Papel Higiênico 6x12x20MT Delicatto Dupla',cat_pap, 'un',   0, 5),
    ('Papel Higiênico 16x4x30MT Delicatto Dupla',cat_pap, 'un',   0, 3),
    ('Papel Higiênico Irapel 8RLS 300MT',        cat_pap, 'un',   0, 3),
    ('Papel Higiênico Paloma 16x4 FL Dupla',     cat_pap, 'un',   0, 3),
    ('Papel Alumínio 0,30x4M Life Clean',        cat_pap, 'un',   0, 2),
    ('Absorvente Intimus C/8 Unidades',          cat_pap, 'un',   0, 2),
    ('Toalha Umedecida C/5 Unidades',            cat_pap, 'un',   0, 3),
    -- Cozinha
    ('Copo Descartável 180ML PCT C/100un',       cat_coz, 'un',   0, 10)
  ON CONFLICT DO NOTHING;
END $$;

-- ═══════════════════════════════════════════════════════
-- NOTAS FISCAIS + ITENS + MOVIMENTOS
-- ═══════════════════════════════════════════════════════
DO $$
DECLARE
  hazal    uuid := (SELECT id FROM recursos_fornecedores WHERE cnpj = '49.385.828/0001-02');
  nf1 uuid; nf2 uuid; nf3 uuid; nf4 uuid;

  -- aliases
  i_talco    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Talco Desinfetante VMAX 5LT'               LIMIT 1);
  i_cloro    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Cloro 10/12% 5LT Forte'                    LIMIT 1);
  i_mul5l    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Multiuso Original 5LT Concentrado'         LIMIT 1);
  i_mul5c    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Multiuso Suprema Tradicional 500ML'        LIMIT 1);
  i_det      uuid := (SELECT id FROM recursos_itens WHERE nome = 'Detergente Grill Allmar Pro 5LT'           LIMIT 1);
  i_agua     uuid := (SELECT id FROM recursos_itens WHERE nome = 'Água Sanitária 5LT c/Cloro Ativo'          LIMIT 1);
  i_desinf   uuid := (SELECT id FROM recursos_itens WHERE nome = 'Desinfetante Urca 5LT Lavanda'             LIMIT 1);
  i_remov    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Removedor Zulu 1LT Lavanda'                LIMIT 1);
  i_sl100    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Saco de Lixo 100LT 5KG Reforçado'          LIMIT 1);
  i_sl60     uuid := (SELECT id FROM recursos_itens WHERE nome = 'Saco de Lixo 60L Preto P5 70x90cm 100un'   LIMIT 1);
  i_sl100l   uuid := (SELECT id FROM recursos_itens WHERE nome = 'Saco de Lixo 100L P5 90x100cm 10un'        LIMIT 1);
  i_tixan    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Pó Tixan Conc 800G CT Primavera'           LIMIT 1);
  i_pt28     uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Toalha Bobina 100% 28GR 6 Rolos'     LIMIT 1);
  i_pt2g     uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Toalha Bobina 100% 2GR 6 Rolos'      LIMIT 1);
  i_ph6x12   uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Higiênico 6x12x20MT Delicatto Dupla' LIMIT 1);
  i_ph16x4   uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Higiênico 16x4x30MT Delicatto Dupla' LIMIT 1);
  i_phirap   uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Higiênico Irapel 8RLS 300MT'         LIMIT 1);
  i_phpal    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Higiênico Paloma 16x4 FL Dupla'      LIMIT 1);
  i_palum    uuid := (SELECT id FROM recursos_itens WHERE nome = 'Papel Alumínio 0,30x4M Life Clean'         LIMIT 1);
  i_abs      uuid := (SELECT id FROM recursos_itens WHERE nome = 'Absorvente Intimus C/8 Unidades'           LIMIT 1);
  i_tum      uuid := (SELECT id FROM recursos_itens WHERE nome = 'Toalha Umedecida C/5 Unidades'             LIMIT 1);
  i_copo     uuid := (SELECT id FROM recursos_itens WHERE nome = 'Copo Descartável 180ML PCT C/100un'        LIMIT 1);

BEGIN

  -- ── NF 2.191 · 14/07/2026 · R$ 777,00 ──────────────
  INSERT INTO recursos_notas_fiscais
    (fornecedor_id, numero, serie, chave_acesso, natureza, data_emissao, data_entrada, valor_total, forma_pagamento, protocolo)
  VALUES
    (hazal, '2191', '001', '35260749385828000102550010000021911429807979',
     'Venda de mercadoria', '2026-07-14', '2026-07-14', 777.00, 'À vista', '135262807544739')
  RETURNING id INTO nf1;

  INSERT INTO recursos_nf_itens
    (nota_id, item_id, codigo_produto, descricao, ncm, cfop, unidade, quantidade, valor_unitario, valor_total)
  VALUES
    (nf1, i_talco,  '2067179173223', 'TALCO DESINFETANTE VMAX 5LT',                          '38089419','5102','UN', 7,  13.00, 91.00),
    (nf1, i_pt28,   '2039605858905', 'PAPEL TOALHA BOBINA 100% ESPECIAL PREMIUM 28GR 6 ROLOS','48181000','5102','UN', 5,  90.00, 450.00),
    (nf1, i_mul5l,  '2063439717800', 'MULTIUSO ORIGINAL 5LT CONCENTRADO',                    '74181000','5102','UN', 4,  20.00, 80.00),
    (nf1, i_ph6x12, '2070921042609', 'PAPEL HIG 6X12X20MT DELICATTO FL DUPLA',               '48181000','5102','UN', 12, 13.00, 156.00);

  INSERT INTO recursos_movimentos (item_id, tipo, quantidade, observacao, responsavel, nota_id, fornecedor_id) VALUES
    (i_talco,  'entrada', 7,  'NF 2.191 · HAZAL · 14/07/2026', 'Recebimento', nf1, hazal),
    (i_pt28,   'entrada', 5,  'NF 2.191 · HAZAL · 14/07/2026', 'Recebimento', nf1, hazal),
    (i_mul5l,  'entrada', 4,  'NF 2.191 · HAZAL · 14/07/2026', 'Recebimento', nf1, hazal),
    (i_ph6x12, 'entrada', 12, 'NF 2.191 · HAZAL · 14/07/2026', 'Recebimento', nf1, hazal);

  -- ── NF 2.192 · 14/07/2026 · R$ 1.916,00 ────────────
  INSERT INTO recursos_notas_fiscais
    (fornecedor_id, numero, serie, chave_acesso, natureza, data_emissao, data_entrada, valor_total, forma_pagamento, protocolo)
  VALUES
    (hazal, '2192', '001', '35260749385828000102550010000021921487332829',
     'Venda de mercadoria', '2026-07-14', '2026-07-14', 1916.00, 'À vista', '135262809296987')
  RETURNING id INTO nf2;

  INSERT INTO recursos_nf_itens
    (nota_id, item_id, codigo_produto, descricao, ncm, cfop, unidade, quantidade, valor_unitario, valor_total)
  VALUES
    (nf2, i_talco,  '2067179173223', 'TALCO DESINFETANTE VMAX 5LT',                          '38089419','5102','UN',  7,   13.00,  91.00),
    (nf2, i_agua,   '2031986778209', 'AGUA SANITARIA - 05 LT C/CLORO ATIVO',                 '28289419','5102','GL',  5,   12.00,  60.00),
    (nf2, i_copo,   '2070744231402', 'COPO DESCARTAVEL 180ML PCT C/100 UNIDADES',             '39241000','5102','UN',  125, 5.40,   675.00),
    (nf2, i_phirap, '2066963109882', 'PAPEL HIG 100% CEL IRAPEL C/8RLS 300MT',               '48181000','5102','UN',  4,   90.00,  360.00),
    (nf2, i_tixan,  '2068569234702', 'DT PO TIXAN CONC 800G CT PRIMAVERA',                   '34025000','5102','CX20',5,   12.00,  60.00),
    (nf2, i_palum,  '2029517158200', 'PAPEL ALUMINIO 0,30 X 4M LIFE CLEAN',                  '76071190','5102','UN',  7,   4.00,   28.00),
    (nf2, i_ph16x4, '2000782184002', 'PAPEL HIG 16X4X30MT DELICATTO FL DUPLA',               '48181000','5102','UN',  2,   96.00,  192.00),
    (nf2, i_pt28,   '2039605858905', 'PAPEL TOALHA BOBINA 100% ESPECIAL PREMIUM 28GR 6 ROLOS','48181000','5102','UN', 5,   90.00,  450.00);

  INSERT INTO recursos_movimentos (item_id, tipo, quantidade, observacao, responsavel, nota_id, fornecedor_id) VALUES
    (i_talco,  'entrada', 7,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_agua,   'entrada', 5,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_copo,   'entrada', 125, 'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_phirap, 'entrada', 4,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_tixan,  'entrada', 5,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_palum,  'entrada', 7,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_ph16x4, 'entrada', 2,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal),
    (i_pt28,   'entrada', 5,   'NF 2.192 · HAZAL · 14/07/2026', 'Recebimento', nf2, hazal);

  -- ── NF 2.193 · 14/07/2026 · R$ 1.444,00 ────────────
  INSERT INTO recursos_notas_fiscais
    (fornecedor_id, numero, serie, chave_acesso, natureza, data_emissao, data_entrada, valor_total, forma_pagamento, protocolo)
  VALUES
    (hazal, '2193', '001', '35260749385828000102550010000021931563636240',
     'Venda de mercadoria', '2026-07-14', '2026-07-14', 1444.00, 'À vista', '135262810913575')
  RETURNING id INTO nf3;

  INSERT INTO recursos_nf_itens
    (nota_id, item_id, codigo_produto, descricao, ncm, cfop, unidade, quantidade, valor_unitario, valor_total)
  VALUES
    (nf3, i_talco,  '2067179173223', 'TALCO DESINFETANTE VMAX 5LT',                              '38089419','5102','UN',10,  13.00,  130.00),
    (nf3, i_cloro,  '2081287639044', 'CLORO 10/12% 5LT FORTE',                                   '28011000','5102','UN', 5,  40.00,  200.00),
    (nf3, i_mul5l,  '2063439717800', 'MULTIUSO ORIGINAL 5LT CONCENTRADO',                        '74181000','5102','UN', 7,  20.00,  140.00),
    (nf3, i_det,    '2070749866094', 'DETERGENTE GRILL ALLMAR PRO 5LT',                          '34012090','5102','UN', 7,  20.00,  140.00),
    (nf3, i_ph16x4, '2000782184002', 'PAPEL HIG 16X4X30MT DELICATTO FL DUPLA',                   '48181000','5102','UN', 2,  96.00,  192.00),
    (nf3, i_pt2g,   '2068598945408', 'PAPEL TOALHA BOBINA 100% ESPECIAL TER FOLHAS 2GR 6 ROLOS', '48181000','5102','UN', 2,  90.00,  180.00),
    (nf3, i_remov,  '2045786382802', 'REMOVEDOR ZULU 1LT LAVANDA',                               '63071000','5102','UN', 2,  15.00,   30.00),
    (nf3, i_sl100,  '2070911017606', 'SACO DE LIXO 100LTS /5KG REFORCADOS 0,16/MICRA',           '39232190','5102','UN', 2, 100.00,  200.00),
    (nf3, i_sl60,   '2087440304606', 'SACO DE LIXO 60L PRETO P5 MEDIDA 70CM x 90CM 100UN',       '39232190','5102','KG', 2,  78.00,  156.00),
    (nf3, i_abs,    '2001548980500', 'ABS INTIMUS C/8 UNIDADES',                                  '74181000','5102','UN', 4,   7.00,   28.00),
    (nf3, i_tum,    '2071835485407', 'TOALHA C/5 INLENCINHO UMEDECIDO',                           '74181000','5102','UN', 6,   8.00,   48.00);
  -- Subtotal: 130+200+140+140+192+180+30+200+156+28+48 = 1.444,00 ✓

  INSERT INTO recursos_movimentos (item_id, tipo, quantidade, observacao, responsavel, nota_id, fornecedor_id) VALUES
    (i_talco,  'entrada', 10, 'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_cloro,  'entrada', 5,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_mul5l,  'entrada', 7,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_det,    'entrada', 7,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_ph16x4, 'entrada', 2,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_pt2g,   'entrada', 2,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_remov,  'entrada', 2,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_sl100,  'entrada', 2,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_sl60,   'entrada', 2,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_abs,    'entrada', 4,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal),
    (i_tum,    'entrada', 6,  'NF 2.193 · HAZAL · 14/07/2026', 'Recebimento', nf3, hazal);

  -- ── NF 2.195 · 16/07/2026 · R$ 2.509,50 (fatura 07/08/2026) ──
  INSERT INTO recursos_notas_fiscais
    (fornecedor_id, numero, serie, chave_acesso, natureza, data_emissao, data_entrada, valor_total, vencimento, forma_pagamento, protocolo)
  VALUES
    (hazal, '2195', '001', '35260749385828000102550010000021951804599287',
     'Venda de mercadoria', '2026-07-16', '2026-07-16', 2509.50, '2026-08-07', 'Fatura — 30 dias', '135262849969199')
  RETURNING id INTO nf4;

  INSERT INTO recursos_nf_itens
    (nota_id, item_id, codigo_produto, descricao, ncm, cfop, unidade, quantidade, valor_unitario, valor_total)
  VALUES
    (nf4, i_desinf, '2042039803809', 'DESINFETANTE URCA 5LT LAVANDA',                          '38089419','5102','UN',   7,   14.00,   98.00),
    (nf4, i_copo,   '2070744231402', 'COPO DESCARTAVEL 180ML PCT C/100 UNIDADES - 3cx',         '39241000','5102','UN',   5.5, 125.00,  687.50),
    (nf4, i_pt2g,   '2068598945408', 'PAPEL TOALHA BOBINA 100% ESPECIAL TER FOLHAS 2GR 6 ROLOS','48181000','5102','UN',   5,   90.00,  450.00),
    (nf4, i_phirap, '2066963109882', 'PAPEL HIG 100% CEL IRAPEL C/8RLS 300MT',                 '48181000','5102','UN',   5,   90.00,  450.00),
    (nf4, i_phpal,  '2030640021101', 'PAPEL HIG PALOMA 16X4 FL DUPLA - 2 FARDOS',              '48181000','5102','UN',  36,    6.00,  216.00),
    (nf4, i_sl100l, '2015421353602', 'SACO DE LIXO 100L P5 MEDIDA 90CM x 100CM 10UNIDADES',    '39232190','5102','pcte',10,   35.00,  350.00),
    (nf4, i_sl60,   '2087440304606', 'SACO DE LIXO 60L PRETO P5 MEDIDA 70CM x 90CM 100UN',     '39232190','5102','KG',   3,   70.00,  210.00),
    (nf4, i_mul5c,  '2074374350960', 'MULTIUSO SUPREMA TRADICIONAL 500ML',                     '63071000','5102','UN',  12,    4.00,   48.00);
  -- Subtotal: 98+687,50+450+450+216+350+210+48 = 2.509,50 ✓

  INSERT INTO recursos_movimentos (item_id, tipo, quantidade, observacao, responsavel, nota_id, fornecedor_id) VALUES
    (i_desinf, 'entrada', 7,   'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_copo,   'entrada', 5.5, 'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_pt2g,   'entrada', 5,   'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_phirap, 'entrada', 5,   'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_phpal,  'entrada', 36,  'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_sl100l, 'entrada', 10,  'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_sl60,   'entrada', 3,   'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal),
    (i_mul5c,  'entrada', 12,  'NF 2.195 · HAZAL · 16/07/2026', 'Recebimento', nf4, hazal);

END $$;

-- ═══════════════════════════════════════════════════════
-- RESUMO
-- Fornecedor: HAZAL DISTRIBUIDORA DE ALIMENTOS LTDA
-- 4 Notas Fiscais  — série 001
-- NF 2191  14/07/2026  R$    777,00  (à vista)
-- NF 2192  14/07/2026  R$  1.916,00  (à vista)
-- NF 2193  14/07/2026  R$  1.444,00  (à vista)
-- NF 2195  16/07/2026  R$  2.509,50  (fatura venc 07/08/2026)
-- Total comprado:      R$  6.646,50
-- 22 itens cadastrados · 30 movimentos de entrada
-- ═══════════════════════════════════════════════════════
