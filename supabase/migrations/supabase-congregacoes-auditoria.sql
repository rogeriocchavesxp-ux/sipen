-- ================================================================
-- SIPEN — Auditoria e Correção das Congregações Oficiais
-- Data: 2026-05-17
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. CORRIGIR TRIGGER (referência a coluna inexistente bloqueia todo UPDATE)
DROP TRIGGER IF EXISTS trg_congregacoes_atualizado_em ON congregacoes;

ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION fn_congregacoes_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_congregacoes_atualizado_em
  BEFORE UPDATE ON congregacoes
  FOR EACH ROW EXECUTE FUNCTION fn_congregacoes_atualizado_em();


-- 2. RENOMEAR congregações com nome divergente do padrão oficial
UPDATE congregacoes SET nome = 'IP Mueb (Carrão)'
  WHERE id = '27f08553-f808-47f9-ba34-173503fc19ee';

UPDATE congregacoes SET nome = 'IP Jardim Piratininga'
  WHERE id = '4326c059-461f-485f-814e-602ad77ca040';


-- 3. CRIAR congregações oficiais ausentes
INSERT INTO congregacoes (nome, tipo, status, cidade, estado) VALUES
  ('IP Vila União',          'congregacao', 'ativa', 'São Paulo', 'SP'),
  ('IP Hispana (Cangaíba)',   'congregacao', 'ativa', 'São Paulo', 'SP'),
  ('IP Jardim Primavera',     'congregacao', 'ativa', 'São Paulo', 'SP'),
  ('IP Anália Franco',        'congregacao', 'ativa', 'São Paulo', 'SP'),
  ('IP Aprisco',              'congregacao', 'ativa', 'São Paulo', 'SP'),
  ('IP Vila Rosária',         'congregacao', 'ativa', 'São Paulo', 'SP')
ON CONFLICT DO NOTHING;


-- 4. DESATIVAR congregações inválidas com membros vinculados
--    Preserva os vínculos existentes mas remove das listagens de seleção
UPDATE congregacoes SET status = 'inativa'
WHERE id IN (
  '875163d4-984f-4a45-b709-6a4ca626e2fa', -- Belém            (1 membro vinculado)
  'c1feb03a-66fb-4c66-ac5d-ed6fb3304b6b', -- Campinas         (1 membro vinculado)
  'fda284e8-c91b-4778-b8f9-f541869e6f49', -- Domitila         (7 membros vinculados)
  '00d9b2b7-f2a1-4f44-b393-2672386e61a4', -- Novo Mundo       (3 membros vinculados)
  '575cd4af-d515-4d90-acd4-c2218c0a3b36', -- Penha 2          (1 membro vinculado)
  'd1a2fa8a-d94c-4152-bf6b-83d2a7727286', -- Penha 3 - Adolescentes (9 membros vinculados)
  'fc590c96-f9fe-4d16-88b9-ca13f15dcfc3', -- Ponte Rasa       (6 membros vinculados)
  'c8bfa666-ce41-4682-a7bf-9aeb32abff67', -- Tatuapé 1        (3 membros vinculados)
  '80910918-d658-4dd4-9310-c1fa69a93017'  -- Vila Esperança   (3 membros vinculados)
);


-- 5. SOFT-DELETE congregações inválidas sem nenhum vínculo
UPDATE congregacoes SET status = 'inativa', deleted_at = now()
WHERE id IN (
  'cd4d7943-3569-4a52-8cea-d829e9bf93fc', -- Jardim São Carlos (0 membros)
  '2c974580-a91f-4d37-a097-9110e0d151fb', -- Penha 4 - Jovens  (0 membros)
  '8d86bb8b-c65b-400a-a40a-21b365d7c06c'  -- São Mateus        (0 membros)
);


-- VERIFICAÇÃO: 8 ativas + 9 inativas + 3 excluídas
SELECT
  CASE WHEN deleted_at IS NOT NULL THEN 'EXCLUÍDA'
       WHEN status = 'inativa'     THEN 'inativa'
       ELSE status END AS situacao,
  nome,
  id
FROM congregacoes
ORDER BY situacao, nome;
