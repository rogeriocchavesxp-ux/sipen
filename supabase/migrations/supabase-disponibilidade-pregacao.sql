-- SIPEN — Disponibilidade de Pregação
-- ATUALIZADO: não criar tabela própria para disponibilidade.
-- A tela #pastoral-disp usa a estrutura real já existente da Escala de Pregação.
--
-- Fonte de dados: public.escala_pregacao
-- Colunas usadas: data, culto_tipo, pastor_id, local, observacoes, status, origem.
-- Estados reais: PENDENTE, PREENCHIDA, CONFIRMADA.
--
-- Este arquivo fica como marcador histórico/no-op para evitar recriar uma tabela obsoleta.

select 'Disponibilidade de Pregação usa public.escala_pregacao' as info;
