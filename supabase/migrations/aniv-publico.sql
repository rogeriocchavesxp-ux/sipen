-- Função pública para aniversariantes (acesso sem autenticação)
-- SECURITY DEFINER: executa como postgres, contornando RLS de v_membros
CREATE OR REPLACE FUNCTION public.get_aniversariantes()
RETURNS TABLE (
  nome            text,
  data_nascimento date,
  funcao          text,
  congregacao     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome, data_nascimento::date, funcao, congregacao
  FROM public.v_membros
  WHERE status = 'ativo'
    AND data_nascimento IS NOT NULL
  ORDER BY data_nascimento;
$$;

-- Permite que o role anon (sem login) execute a função
GRANT EXECUTE ON FUNCTION public.get_aniversariantes() TO anon;
