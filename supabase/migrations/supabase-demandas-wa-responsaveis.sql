-- ═══════════════════════════════════════════════════════════════
-- SIPEN — Responsáveis por departamento para notificação WhatsApp
-- Execute no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabela de mapeamento área → pessoa responsável ────────
CREATE TABLE IF NOT EXISTS public.demanda_responsaveis (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area      text NOT NULL,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_dres_area ON public.demanda_responsaveis(area) WHERE ativo = true;

ALTER TABLE public.demanda_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dres_auth_select" ON public.demanda_responsaveis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dres_admin_all" ON public.demanda_responsaveis
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "dres_service_all" ON public.demanda_responsaveis
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. Como popular (substitua pelos UUIDs reais de pessoas) ─
-- Para descobrir o pessoa_id de alguém:
--   SELECT id, nome FROM pessoas WHERE nome ILIKE '%nome da pessoa%';
--
-- Exemplo de inserção:
--   INSERT INTO demanda_responsaveis (area, pessoa_id) VALUES
--     ('Financeiro',              '<uuid-tesoureiro>'),
--     ('Manutenção',              '<uuid-resp-manutencao>'),
--     ('Comunicação e Divulgação','<uuid-resp-comunicacao>'),
--     ('Administrativo Geral',    '<uuid-administrador>'),
--     ('Oração e Aconselhamento', '<uuid-pastor>'),
--     ('Visitação',               '<uuid-diacono>');
--
-- Uma pessoa pode ser responsável por múltiplas áreas.
-- Múltiplas pessoas podem ser responsáveis pela mesma área.

-- ── 3. Verificação ────────────────────────────────────────────
SELECT area, count(*) AS responsaveis
FROM demanda_responsaveis
WHERE ativo = true
GROUP BY area
ORDER BY area;
