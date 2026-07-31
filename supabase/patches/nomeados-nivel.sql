-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Nomeações: coluna nivel + hierarquia de permissões
-- nomeados-nivel.sql
-- ═══════════════════════════════════════════════════════════════
-- Princípio da Integridade Sistêmica: nivel é a única fonte de
-- verdade para hierarquia funcional em nomeados.
--
-- DOIS MODELOS DE HIERARQUIA:
--   governo / sociedade → presidente, vice_presidente, secretario, tesoureiro
--   ministerio / comissao / grupo → supervisor, coordenador, lider_area, membro

-- 1. Coluna nivel
ALTER TABLE nomeados
  ADD COLUMN IF NOT EXISTS nivel TEXT
    CHECK (nivel IN (
      'presidente', 'vice_presidente', 'secretario', 'tesoureiro',
      'supervisor',  'coordenador',    'lider_area', 'membro'
    ));

-- 2. Auto-popular a partir de cargo + orgao_tipo existentes
UPDATE nomeados SET nivel =
  CASE
    WHEN orgao_tipo IN ('governo', 'sociedade') THEN
      CASE
        WHEN lower(cargo) LIKE '%vice%presidente%' OR lower(cargo) LIKE '%vice-presidente%' THEN 'vice_presidente'
        WHEN lower(cargo) LIKE '%presidente%'                                               THEN 'presidente'
        WHEN lower(cargo) LIKE '%tesourei%'                                                 THEN 'tesoureiro'
        WHEN lower(cargo) LIKE '%secretar%'                                                 THEN 'secretario'
        ELSE 'presidente'
      END
    WHEN orgao_tipo IN ('ministerio', 'comissao', 'grupo', 'congregacao') THEN
      CASE
        WHEN lower(cargo) LIKE '%supervisor%'   OR cargo ILIKE 'pastor%'      THEN 'supervisor'
        WHEN lower(cargo) LIKE '%coordena%'     OR lower(cargo) LIKE '%responsav%' THEN 'coordenador'
        WHEN lower(cargo) LIKE '%l_der%'        OR lower(cargo) LIKE '%líder%'     THEN 'lider_area'
        ELSE 'membro'
      END
    ELSE 'membro'
  END
WHERE nivel IS NULL AND deleted_at IS NULL;

-- 3. Função: nivel mais alto do usuário num contexto (admin usa para UI)
CREATE OR REPLACE FUNCTION get_user_nivel(p_user_id UUID, p_dept_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT nivel
  FROM nomeados
  WHERE pessoa_id   = p_user_id
    AND status      = 'ativo'
    AND deleted_at  IS NULL
    AND (p_dept_id IS NULL OR dept_id = p_dept_id)
  ORDER BY
    CASE nivel
      WHEN 'presidente'       THEN 1
      WHEN 'supervisor'       THEN 1
      WHEN 'vice_presidente'  THEN 2
      WHEN 'coordenador'      THEN 2
      WHEN 'secretario'       THEN 3
      WHEN 'tesoureiro'       THEN 3
      WHEN 'lider_area'       THEN 4
      WHEN 'membro'           THEN 9
      ELSE 10
    END
  LIMIT 1;
$$;

-- 4. RLS
-- Usa a função is_admin() já existente em supabase-v3-incremental.sql
-- que verifica user_profiles.role = 'admin' AND ativo = true

ALTER TABLE nomeados ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
DROP POLICY IF EXISTS "nomeados_select" ON nomeados;
CREATE POLICY "nomeados_select" ON nomeados
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Insert: admin pode tudo; supervisor pode adicionar coord/lider no seu dept; coord pode adicionar lider
-- Nota: em RLS WITH CHECK, a linha sendo inserida é referenciada sem prefixo (nivel, dept_id, etc.)
DROP POLICY IF EXISTS "nomeados_insert" ON nomeados;
CREATE POLICY "nomeados_insert" ON nomeados
  FOR INSERT TO authenticated
  WITH CHECK (
    -- admin (usa função existente no projeto)
    public.is_admin()
    OR
    -- supervisor → pode inserir coordenador ou lider_area no seu dept
    (
      nivel IN ('coordenador', 'lider_area')
      AND dept_id IN (
        SELECT dept_id FROM nomeados n2
        WHERE n2.pessoa_id = auth.uid() AND n2.nivel = 'supervisor'
          AND n2.status = 'ativo' AND n2.deleted_at IS NULL
      )
    )
    OR
    -- coordenador → pode inserir lider_area no seu dept
    (
      nivel = 'lider_area'
      AND dept_id IN (
        SELECT dept_id FROM nomeados n2
        WHERE n2.pessoa_id = auth.uid() AND n2.nivel IN ('supervisor','coordenador')
          AND n2.status = 'ativo' AND n2.deleted_at IS NULL
      )
    )
  );

-- Update: mesma lógica (USING filtra linhas visíveis; WITH CHECK valida o novo estado)
DROP POLICY IF EXISTS "nomeados_update" ON nomeados;
CREATE POLICY "nomeados_update" ON nomeados
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      nivel IN ('coordenador', 'lider_area')
      AND dept_id IN (
        SELECT dept_id FROM nomeados n2
        WHERE n2.pessoa_id = auth.uid() AND n2.nivel = 'supervisor'
          AND n2.status = 'ativo' AND n2.deleted_at IS NULL
      )
    )
    OR (
      nivel = 'lider_area'
      AND dept_id IN (
        SELECT dept_id FROM nomeados n2
        WHERE n2.pessoa_id = auth.uid() AND n2.nivel IN ('supervisor','coordenador')
          AND n2.status = 'ativo' AND n2.deleted_at IS NULL
      )
    )
  );

NOTIFY pgrst, 'reload schema';
