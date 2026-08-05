-- Torna pessoa_id opcional em nomeados
-- Necessário para permitir inserção de líderes/membros de sociedades via UI
-- sem exigir vínculo com um registro em pessoas.

ALTER TABLE public.nomeados
  ALTER COLUMN pessoa_id DROP NOT NULL;
