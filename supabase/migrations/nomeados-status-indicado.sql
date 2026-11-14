-- Adiciona 'indicado' ao CHECK constraint de nomeados.status
-- Permite inserções públicas via formulário externo (sipen.com.br/suporte)

-- 1. Remove constraint atual
ALTER TABLE public.nomeados DROP CONSTRAINT IF EXISTS nomeados_status_check;

-- 2. Recria com 'indicado' incluído
ALTER TABLE public.nomeados ADD CONSTRAINT nomeados_status_check
  CHECK (status IN ('ativo', 'inativo', 'indicado'));

-- 3. Atualiza a coluna também precisa do DEFAULT
-- (DEFAULT 'ativo' permanece, mas aceitará 'indicado' em inserções anon)

-- 4. Atualiza a policy de INSERT anon para não exigir status específico
--    (já controlado pelo CHECK constraint e pelo ano=2027)
DROP POLICY IF EXISTS "Insert público nomeações indicadas" ON public.nomeados;
CREATE POLICY "Insert público nomeações indicadas"
  ON public.nomeados
  FOR INSERT TO anon
  WITH CHECK (ano = 2027 AND status = 'indicado');
