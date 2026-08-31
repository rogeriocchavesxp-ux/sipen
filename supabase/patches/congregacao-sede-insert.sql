-- ================================================================
-- SIPEN — Adiciona Sede como congregação
-- Executar no Supabase Dashboard → SQL Editor
-- ================================================================

INSERT INTO public.congregacoes (nome, status, localizacao)
VALUES ('Sede - IPPenha', 'ativa', 'Penha')
ON CONFLICT DO NOTHING;

-- Verificar
SELECT id, nome, status FROM congregacoes WHERE nome = 'Sede - IPPenha';
