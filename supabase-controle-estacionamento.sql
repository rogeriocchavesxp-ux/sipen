-- SIPEN — Controle de Acesso / Controles do Estacionamento
-- Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.controle_estacionamento_controles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id uuid REFERENCES public.membros(id) ON DELETE SET NULL,
  codigo_controle text NOT NULL UNIQUE,
  marca text NOT NULL DEFAULT 'Nice',
  codigo_base text NOT NULL DEFAULT '1EF9C96',
  status_pagamento text NOT NULL DEFAULT 'pendente'
    CHECK (status_pagamento IN ('pago','pendente')),
  status text NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('disponivel','entregue','devolvido','perdido','bloqueado')),
  data_entrega date,
  entregue_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.controle_estacionamento_controles
ADD COLUMN IF NOT EXISTS status_pagamento text
DEFAULT 'pendente'
CHECK (status_pagamento IN ('pago','pendente'));

CREATE TABLE IF NOT EXISTS public.controle_estacionamento_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  controle_id uuid REFERENCES public.controle_estacionamento_controles(id) ON DELETE CASCADE,
  acao text NOT NULL,
  status_anterior text,
  status_novo text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_controles_membro
  ON public.controle_estacionamento_controles(membro_id);

CREATE INDEX IF NOT EXISTS idx_ce_controles_status
  ON public.controle_estacionamento_controles(status);

CREATE INDEX IF NOT EXISTS idx_ce_historico_controle
  ON public.controle_estacionamento_historico(controle_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ce_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_controles_updated_at
  ON public.controle_estacionamento_controles;

CREATE TRIGGER trg_ce_controles_updated_at
BEFORE UPDATE ON public.controle_estacionamento_controles
FOR EACH ROW
EXECUTE FUNCTION public.ce_touch_updated_at();

CREATE OR REPLACE FUNCTION public.sipen_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas p
    JOIN public.membros m ON m.pessoa_id = p.id
    WHERE p.auth_user_id = auth.uid()
      AND p.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.status = 'ativo'
      AND (
        lower(coalesce(m.funcao,'')) LIKE '%admin%'
        OR upper(regexp_replace(coalesce(m.funcao,''), '[^A-Za-z0-9]+', '_', 'g'))
           IN ('ADMINISTRADOR_GERAL','ADMIN_GERAL','ADM_OPERACIONAL')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.sipen_is_admin() TO authenticated;
GRANT SELECT ON public.v_membros TO authenticated;

ALTER TABLE public.controle_estacionamento_controles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_estacionamento_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_controles_select_admin" ON public.controle_estacionamento_controles;
DROP POLICY IF EXISTS "ce_controles_insert_admin" ON public.controle_estacionamento_controles;
DROP POLICY IF EXISTS "ce_controles_update_admin" ON public.controle_estacionamento_controles;
DROP POLICY IF EXISTS "ce_controles_delete_admin" ON public.controle_estacionamento_controles;

CREATE POLICY "ce_controles_select_admin"
  ON public.controle_estacionamento_controles
  FOR SELECT TO authenticated
  USING (public.sipen_is_admin());

CREATE POLICY "ce_controles_insert_admin"
  ON public.controle_estacionamento_controles
  FOR INSERT TO authenticated
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "ce_controles_update_admin"
  ON public.controle_estacionamento_controles
  FOR UPDATE TO authenticated
  USING (public.sipen_is_admin())
  WITH CHECK (public.sipen_is_admin());

CREATE POLICY "ce_controles_delete_admin"
  ON public.controle_estacionamento_controles
  FOR DELETE TO authenticated
  USING (public.sipen_is_admin());

DROP POLICY IF EXISTS "ce_historico_select_admin" ON public.controle_estacionamento_historico;
DROP POLICY IF EXISTS "ce_historico_insert_admin" ON public.controle_estacionamento_historico;

CREATE POLICY "ce_historico_select_admin"
  ON public.controle_estacionamento_historico
  FOR SELECT TO authenticated
  USING (public.sipen_is_admin());

CREATE POLICY "ce_historico_insert_admin"
  ON public.controle_estacionamento_historico
  FOR INSERT TO authenticated
  WITH CHECK (public.sipen_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.controle_estacionamento_controles TO authenticated;

GRANT SELECT, INSERT
  ON public.controle_estacionamento_historico TO authenticated;
