-- ═══════════════════════════════════════════════════════
-- SIPEN — Recursos v2 (modelo Excel IPPenha)
-- Executar APÓS recursos-estoque.sql e hazal-dados.sql
-- ═══════════════════════════════════════════════════════

BEGIN;

-- Lock explícito em ordem consistente para evitar deadlock
LOCK TABLE recursos_itens IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE recursos_movimentos IN SHARE ROW EXCLUSIVE MODE;

-- 1. Dropar trigger ANTES de alterar constraint (evita deadlock)
DROP TRIGGER IF EXISTS trg_atualizar_estoque ON recursos_movimentos;

-- 2. Itens: código de barras e custo unitário
ALTER TABLE recursos_itens
  ADD COLUMN IF NOT EXISTS codigo         text,
  ADD COLUMN IF NOT EXISTS custo_unitario numeric(12,2);

-- 3. Movimentos: custo, valor total, destino/setor
ALTER TABLE recursos_movimentos
  ADD COLUMN IF NOT EXISTS custo_unitario numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_total    numeric(12,2),
  ADD COLUMN IF NOT EXISTS destino_setor  text;

-- 4. Ampliar CHECK de tipo (ajuste_entrada e ajuste_saida)
ALTER TABLE recursos_movimentos
  DROP CONSTRAINT IF EXISTS recursos_movimentos_tipo_check;
ALTER TABLE recursos_movimentos
  ADD CONSTRAINT recursos_movimentos_tipo_check
  CHECK (tipo IN ('entrada','saida','ajuste','ajuste_entrada','ajuste_saida'));

-- 5. Função do trigger atualizada: novos tipos + custo_unitario no item
CREATE OR REPLACE FUNCTION _fn_atualizar_estoque_recursos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo IN ('entrada','ajuste_entrada') THEN
    UPDATE recursos_itens SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
  ELSIF NEW.tipo IN ('saida','ajuste_saida') THEN
    UPDATE recursos_itens SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade) WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE recursos_itens SET estoque_atual = NEW.quantidade WHERE id = NEW.item_id;
  END IF;
  -- Atualiza custo_unitario no item ao registrar compra (entrada com preço)
  IF NEW.tipo = 'entrada' AND NEW.custo_unitario IS NOT NULL AND NEW.custo_unitario > 0 THEN
    UPDATE recursos_itens SET custo_unitario = NEW.custo_unitario WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recriar trigger (após alterar constraint e função)
CREATE TRIGGER trg_atualizar_estoque
  AFTER INSERT ON recursos_movimentos
  FOR EACH ROW EXECUTE FUNCTION _fn_atualizar_estoque_recursos();

-- 7. Categorias do modelo Excel (mantém as existentes)
INSERT INTO recursos_categorias (nome, icone) VALUES
  ('Higiene',    '🧴'),
  ('Utilidades', '🗑️')
ON CONFLICT DO NOTHING;

-- 8. EANs dos produtos HAZAL já inseridos
UPDATE recursos_itens SET codigo = '2067179173223' WHERE nome ILIKE 'Talco Desinfetante%';
UPDATE recursos_itens SET codigo = '2039605858905' WHERE nome ILIKE 'Papel Toalha Bobina Premium%';
UPDATE recursos_itens SET codigo = '2063439717800' WHERE nome ILIKE 'Multiuso Original%';
UPDATE recursos_itens SET codigo = '2070921042609' WHERE nome ILIKE 'Papel Higiênico Delicatto%6x12%';
UPDATE recursos_itens SET codigo = '2031986778209' WHERE nome ILIKE 'Água Sanitária%';
UPDATE recursos_itens SET codigo = '2070744231402' WHERE nome ILIKE 'Copo Descartável%';
UPDATE recursos_itens SET codigo = '2066963109882' WHERE nome ILIKE 'Papel Higiênico Irapel%';
UPDATE recursos_itens SET codigo = '2086569234702' WHERE nome ILIKE 'Detergente em pó Tixan%';
UPDATE recursos_itens SET codigo = '2029517158200' WHERE nome ILIKE 'Papel Alumínio%';
UPDATE recursos_itens SET codigo = '2000782184002' WHERE nome ILIKE 'Papel Higiênico Delicatto%16x4%';
UPDATE recursos_itens SET codigo = '2081287639044' WHERE nome ILIKE 'Cloro%';
UPDATE recursos_itens SET codigo = '2074986609401' WHERE nome ILIKE 'Detergente Grill%';
UPDATE recursos_itens SET codigo = '2068598945408' WHERE nome ILIKE 'Papel Toalha Bobina Especial%';
UPDATE recursos_itens SET codigo = '2048786382802' WHERE nome ILIKE 'Removedor%';
UPDATE recursos_itens SET codigo = '2007911017606' WHERE nome ILIKE 'Saco de Lixo 100L / 5kg%';
UPDATE recursos_itens SET codigo = '2087440304606' WHERE nome ILIKE 'Saco de Lixo 60L%';
UPDATE recursos_itens SET codigo = '2001548980500' WHERE nome ILIKE 'Absorvente%';
UPDATE recursos_itens SET codigo = '2071835485407' WHERE nome ILIKE 'Lenço Umedecido%';
UPDATE recursos_itens SET codigo = '2042039803809' WHERE nome ILIKE 'Desinfetante Urca%';
UPDATE recursos_itens SET codigo = '2030640021101' WHERE nome ILIKE 'Papel Higiênico Paloma%';
UPDATE recursos_itens SET codigo = '2015421353602' WHERE nome ILIKE 'Saco de Lixo 100L preto%';
UPDATE recursos_itens SET codigo = '2074374350960' WHERE nome ILIKE 'Multiuso Suprema%';

-- 9. Custo unitário inicial nos itens (última compra registrada na NF)
UPDATE recursos_itens SET custo_unitario = 13    WHERE nome ILIKE 'Talco Desinfetante%';
UPDATE recursos_itens SET custo_unitario = 90    WHERE nome ILIKE 'Papel Toalha Bobina Premium%';
UPDATE recursos_itens SET custo_unitario = 20    WHERE nome ILIKE 'Multiuso Original%';
UPDATE recursos_itens SET custo_unitario = 13    WHERE nome ILIKE 'Papel Higiênico Delicatto%6x12%';
UPDATE recursos_itens SET custo_unitario = 12    WHERE nome ILIKE 'Água Sanitária%';
UPDATE recursos_itens SET custo_unitario = 5.45  WHERE nome ILIKE 'Copo Descartável%';
UPDATE recursos_itens SET custo_unitario = 90    WHERE nome ILIKE 'Papel Higiênico Irapel%';
UPDATE recursos_itens SET custo_unitario = 12    WHERE nome ILIKE 'Detergente em pó Tixan%';
UPDATE recursos_itens SET custo_unitario = 4     WHERE nome ILIKE 'Papel Alumínio%';
UPDATE recursos_itens SET custo_unitario = 96    WHERE nome ILIKE 'Papel Higiênico Delicatto%16x4%';
UPDATE recursos_itens SET custo_unitario = 40    WHERE nome ILIKE 'Cloro%';
UPDATE recursos_itens SET custo_unitario = 20    WHERE nome ILIKE 'Detergente Grill%';
UPDATE recursos_itens SET custo_unitario = 90    WHERE nome ILIKE 'Papel Toalha Bobina Especial%';
UPDATE recursos_itens SET custo_unitario = 15    WHERE nome ILIKE 'Removedor%';
UPDATE recursos_itens SET custo_unitario = 80    WHERE nome ILIKE 'Saco de Lixo 100L / 5kg%';
UPDATE recursos_itens SET custo_unitario = 73.2  WHERE nome ILIKE 'Saco de Lixo 60L%';
UPDATE recursos_itens SET custo_unitario = 7     WHERE nome ILIKE 'Absorvente%';
UPDATE recursos_itens SET custo_unitario = 8     WHERE nome ILIKE 'Lenço Umedecido%';
UPDATE recursos_itens SET custo_unitario = 14    WHERE nome ILIKE 'Desinfetante Urca%';
UPDATE recursos_itens SET custo_unitario = 6     WHERE nome ILIKE 'Papel Higiênico Paloma%';
UPDATE recursos_itens SET custo_unitario = 70    WHERE nome ILIKE 'Saco de Lixo 100L preto%';
UPDATE recursos_itens SET custo_unitario = 4     WHERE nome ILIKE 'Multiuso Suprema%';

COMMIT;
