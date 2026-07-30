-- ═══════════════════════════════════════════════════════
-- SIPEN — Gestão de Recursos (Estoque)
-- Executar no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- Categorias
CREATE TABLE IF NOT EXISTS recursos_categorias (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome      text NOT NULL,
  icone     text DEFAULT '📦',
  criado_em timestamptz DEFAULT now()
);

-- Itens
CREATE TABLE IF NOT EXISTS recursos_itens (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           text NOT NULL,
  categoria_id   uuid REFERENCES recursos_categorias(id) ON DELETE SET NULL,
  unidade        text NOT NULL DEFAULT 'un',
  estoque_atual  numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  descricao      text,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz DEFAULT now()
);

-- Movimentos (entradas, saídas e ajustes)
CREATE TABLE IF NOT EXISTS recursos_movimentos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id     uuid NOT NULL REFERENCES recursos_itens(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade  numeric NOT NULL,
  observacao  text,
  responsavel text,
  criado_em   timestamptz DEFAULT now()
);

-- Requisições (saídas com aprovação)
CREATE TABLE IF NOT EXISTS recursos_requisicoes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id          uuid NOT NULL REFERENCES recursos_itens(id) ON DELETE CASCADE,
  quantidade       numeric NOT NULL,
  motivo           text,
  solicitante_nome text,
  solicitante_id   uuid,
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  aprovado_por     text,
  observacao       text,
  criado_em        timestamptz DEFAULT now(),
  resolvido_em     timestamptz
);

-- Trigger: atualiza estoque_atual após cada movimento
CREATE OR REPLACE FUNCTION _fn_atualizar_estoque_recursos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE recursos_itens
      SET estoque_atual = estoque_atual + NEW.quantidade
      WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE recursos_itens
      SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade)
      WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE recursos_itens
      SET estoque_atual = NEW.quantidade
      WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_estoque ON recursos_movimentos;
CREATE TRIGGER trg_atualizar_estoque
  AFTER INSERT ON recursos_movimentos
  FOR EACH ROW EXECUTE FUNCTION _fn_atualizar_estoque_recursos();

-- RLS
ALTER TABLE recursos_categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_movimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_requisicoes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rec_cat_read"  ON recursos_categorias  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rec_cat_write" ON recursos_categorias  FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "rec_it_read"   ON recursos_itens        FOR SELECT TO authenticated USING (true);
CREATE POLICY "rec_it_write"  ON recursos_itens        FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "rec_mov_read"  ON recursos_movimentos   FOR SELECT TO authenticated USING (true);
CREATE POLICY "rec_mov_write" ON recursos_movimentos   FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "rec_req_read"  ON recursos_requisicoes  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rec_req_write" ON recursos_requisicoes  FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Categorias iniciais
INSERT INTO recursos_categorias (nome, icone) VALUES
  ('Limpeza',     '🧹'),
  ('Cozinha',     '🍽️'),
  ('Escritório',  '📋'),
  ('Manutenção',  '🔧'),
  ('Descartáveis','🥤'),
  ('Outros',      '📦')
ON CONFLICT DO NOTHING;
