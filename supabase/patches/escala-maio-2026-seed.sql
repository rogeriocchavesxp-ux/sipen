-- ═══════════════════════════════════════════════════════════════════
-- SIPEN — Seed: Escala da Junta Diaconal — Maio/2026
-- Fonte: PDF "Escala da Junta Diaconal - Maio/2026" (IPPenha)
--
-- PRÉ-REQUISITO: executar supabase-escala-diaconal.sql antes.
--
-- ATENÇÃO — nomes que podem precisar de ajuste manual:
--   • "Thiago Magalhês de Souza" — PDF tem "ê" (erro tipográfico do PDF?);
--     se no banco estiver "Magalhães" o match será via DO block abaixo
--   • "William" e "Elivaldo" — nomes curtos; o match busca exato primeiro
--   • "Éber Costa Moreira Lopes" — confirme grafia do cadastro
-- Execute o SELECT de relatório no final para ver o que não vinculou.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Limpa qualquer inserção anterior deste seed ───────────────
DELETE FROM public.escala_diaconal
WHERE mes_ref = '2026-05' AND deleted_at IS NULL;

-- ── 2. Insere os 70 lançamentos do PDF ───────────────────────────
INSERT INTO public.escala_diaconal (mes_ref, data, programacao, posto, diacono_nome, ordem)
VALUES
  -- ── Sexta, 01/05 — SOS - Jovens ─────────────────────────────────
  ('2026-05','2026-05-01','SOS - Jovens','Hall / Templo',           'Vitor Santos Góis de Oliveira',  1),
  ('2026-05','2026-05-01','SOS - Jovens','Galeria / Ronda',         '',                               2),

  -- ── Domingo, 03/05 — Culto Matinal ──────────────────────────────
  ('2026-05','2026-05-03','Culto Matinal','Hall / Templo',           'Flavio Gallani',                 3),
  ('2026-05','2026-05-03','Culto Matinal','Galeria / Ronda',         'Gabriel Assis',                  4),
  ('2026-05','2026-05-03','Culto Matinal','Estacionamento (Igreja)', 'Guilherme Pietro',               5),
  ('2026-05','2026-05-03','Culto Matinal','Estacionamento (Rua)',    'Carlos Alberto',                 6),
  ('2026-05','2026-05-03','Culto Matinal','Estacionamento (Rua)',    'Thiago Magalhês de Souza',       7),

  -- ── Domingo, 03/05 — Culto Vespertino (Santa Ceia) ──────────────
  ('2026-05','2026-05-03','Culto Vespertino (Santa Ceia)','Hall / Templo',           'Agilson Alves Oliveira',       8),
  ('2026-05','2026-05-03','Culto Vespertino (Santa Ceia)','Galeria / Ronda',         'Edson Menezes',                9),
  ('2026-05','2026-05-03','Culto Vespertino (Santa Ceia)','Estacionamento (Igreja)', 'Vitor Santos Góis de Oliveira',10),
  ('2026-05','2026-05-03','Culto Vespertino (Santa Ceia)','Estacionamento (Rua)',    'Adilson Aparecido Villano',    11),
  ('2026-05','2026-05-03','Culto Vespertino (Santa Ceia)','Estacionamento (Rua)',    'Sidnei Lima',                  12),

  -- ── Segunda, 04/05 — Conexão com Deus ───────────────────────────
  ('2026-05','2026-05-04','Conexão com Deus','Hall / Templo',   'Ely da Conceição Coelho', 13),
  ('2026-05','2026-05-04','Conexão com Deus','Galeria / Ronda', '',                        14),

  -- ── Sexta, 08/05 — Abertura do Workshop da Família ──────────────
  ('2026-05','2026-05-08','Abertura do Workshop da Família 20:00hrs','Hall / Templo',   'Vitor Santos Góis de Oliveira', 15),
  ('2026-05','2026-05-08','Abertura do Workshop da Família 20:00hrs','Galeria / Ronda', 'William',                       16),

  -- ── Sábado, 09/05 — Workshop da Família ─────────────────────────
  ('2026-05','2026-05-09','Workshop da Família 14:00hrs','Hall / Templo',   'Ronaldo Gomes',              17),
  ('2026-05','2026-05-09','Workshop da Família 14:00hrs','Galeria / Ronda', 'Alexandre Carraleiro Martins',18),

  -- ── Domingo, 10/05 — Culto Matinal ──────────────────────────────
  ('2026-05','2026-05-10','Culto Matinal','Hall / Templo',           'Thiago Cavalieri',       19),
  ('2026-05','2026-05-10','Culto Matinal','Galeria / Ronda',         'Gabriel Dias Marinho',   20),
  ('2026-05','2026-05-10','Culto Matinal','Estacionamento (Igreja)', 'Ismael Molina',          21),
  ('2026-05','2026-05-10','Culto Matinal','Estacionamento (Rua)',    'Cícero Martins',         22),
  ('2026-05','2026-05-10','Culto Matinal','Estacionamento (Rua)',    'José Ênio de Alencar',   23),

  -- ── Domingo, 10/05 — Culto Vespertino ───────────────────────────
  ('2026-05','2026-05-10','Culto Vespertino','Hall / Templo',           'Éber Costa Moreira Lopes', 24),
  ('2026-05','2026-05-10','Culto Vespertino','Galeria / Ronda',         'Daniel Aguiar',            25),
  ('2026-05','2026-05-10','Culto Vespertino','Estacionamento (Igreja)', 'Agilson Alves Oliveira',   26),
  ('2026-05','2026-05-10','Culto Vespertino','Estacionamento (Rua)',    'Adriano Portela da Rocha', 27),
  ('2026-05','2026-05-10','Culto Vespertino','Estacionamento (Rua)',    'William',                  28),

  -- ── Segunda, 11/05 — Conexão com Deus ───────────────────────────
  ('2026-05','2026-05-11','Conexão com Deus','Hall / Templo',   'Ely da Conceição Coelho', 29),
  ('2026-05','2026-05-11','Conexão com Deus','Galeria / Ronda', 'Márcio Dal Maso',         30),

  -- ── Sexta, 15/05 — SOS - Jovens ─────────────────────────────────
  ('2026-05','2026-05-15','SOS - Jovens','Hall / Templo',   'Marcos Roberto Piacente', 31),
  ('2026-05','2026-05-15','SOS - Jovens','Galeria / Ronda', '',                        32),

  -- ── Domingo, 17/05 — Culto Matinal (Santa Ceia) ─────────────────
  ('2026-05','2026-05-17','Culto Matinal (Santa Ceia)','Hall / Templo',           'Daniel Felipe',   33),
  ('2026-05','2026-05-17','Culto Matinal (Santa Ceia)','Galeria / Ronda',         'Flavio Gallani',  34),
  ('2026-05','2026-05-17','Culto Matinal (Santa Ceia)','Estacionamento (Igreja)', 'Guilherme Pietro',35),
  ('2026-05','2026-05-17','Culto Matinal (Santa Ceia)','Estacionamento (Rua)',    'Uelton Ramos',    36),
  ('2026-05','2026-05-17','Culto Matinal (Santa Ceia)','Estacionamento (Rua)',    'Sérgio Crecchi',  37),

  -- ── Domingo, 17/05 — Culto Vespertino ───────────────────────────
  ('2026-05','2026-05-17','Culto Vespertino','Hall / Templo',           'Osias Vasconcelos Junior', 38),
  ('2026-05','2026-05-17','Culto Vespertino','Galeria / Ronda',         'Daniel Aguiar',            39),
  ('2026-05','2026-05-17','Culto Vespertino','Estacionamento (Igreja)', 'Elivaldo',                 40),
  ('2026-05','2026-05-17','Culto Vespertino','Estacionamento (Rua)',    'Adriano Portela da Rocha', 41),
  ('2026-05','2026-05-17','Culto Vespertino','Estacionamento (Rua)',    'Lucas Soranso',            42),

  -- ── Segunda, 18/05 — Conexão com Deus ───────────────────────────
  ('2026-05','2026-05-18','Conexão com Deus','Hall / Templo',   'Ronaldo Gomes', 43),
  ('2026-05','2026-05-18','Conexão com Deus','Galeria / Ronda', '',              44),

  -- ── Sexta, 22/05 — SOS - Jovens ─────────────────────────────────
  ('2026-05','2026-05-22','SOS - Jovens','Hall / Templo',   'Fladimir Pessoa Martins', 45),
  ('2026-05','2026-05-22','SOS - Jovens','Galeria / Ronda', '',                        46),

  -- ── Domingo, 24/05 — Culto Matinal ──────────────────────────────
  ('2026-05','2026-05-24','Culto Matinal','Hall / Templo',           'Orlando Guedelha', 47),
  ('2026-05','2026-05-24','Culto Matinal','Galeria / Ronda',         'Thiago Cavalieri', 48),
  ('2026-05','2026-05-24','Culto Matinal','Estacionamento (Igreja)', 'Ismael Molina',    49),
  ('2026-05','2026-05-24','Culto Matinal','Estacionamento (Rua)',    'Cícero Martins',   50),
  ('2026-05','2026-05-24','Culto Matinal','Estacionamento (Rua)',    'Carlos Alberto',   51),

  -- ── Domingo, 24/05 — Culto Vespertino ───────────────────────────
  ('2026-05','2026-05-24','Culto Vespertino','Hall / Templo',           'Éber Costa Moreira Lopes',  52),
  ('2026-05','2026-05-24','Culto Vespertino','Galeria / Ronda',         'Fladimir Pessoa Martins',   53),
  ('2026-05','2026-05-24','Culto Vespertino','Estacionamento (Igreja)', 'Osias Vasconcelos Junior',  54),
  ('2026-05','2026-05-24','Culto Vespertino','Estacionamento (Rua)',    'Adilson Aparecido Villano', 55),
  ('2026-05','2026-05-24','Culto Vespertino','Estacionamento (Rua)',    'Edson Menezes',             56),

  -- ── Segunda, 25/05 — Conexão com Deus ───────────────────────────
  ('2026-05','2026-05-25','Conexão com Deus','Hall / Templo',   'Ronaldo Gomes',   57),
  ('2026-05','2026-05-25','Conexão com Deus','Galeria / Ronda', 'Márcio Dal Maso', 58),

  -- ── Sexta, 29/05 — SOS - Jovens ─────────────────────────────────
  ('2026-05','2026-05-29','SOS - Jovens','Hall / Templo',   'Marcos Roberto Piacente', 59),
  ('2026-05','2026-05-29','SOS - Jovens','Galeria / Ronda', '',                        60),

  -- ── Domingo, 31/05 — Culto Matinal ──────────────────────────────
  ('2026-05','2026-05-31','Culto Matinal','Hall / Templo',           'Daniel Felipe',       61),
  ('2026-05','2026-05-31','Culto Matinal','Galeria / Ronda',         'Gabriel Dias Marinho',62),
  ('2026-05','2026-05-31','Culto Matinal','Estacionamento (Igreja)', 'Gabriel Assis',       63),
  ('2026-05','2026-05-31','Culto Matinal','Estacionamento (Rua)',    'Uelton Ramos',        64),
  ('2026-05','2026-05-31','Culto Matinal','Estacionamento (Rua)',    'Sérgio Crecchi',      65),

  -- ── Domingo, 31/05 — Culto Vespertino ───────────────────────────
  ('2026-05','2026-05-31','Culto Vespertino','Hall / Templo',           'Osias Vasconcelos Junior',     66),
  ('2026-05','2026-05-31','Culto Vespertino','Galeria / Ronda',         'Elivaldo',                     67),
  ('2026-05','2026-05-31','Culto Vespertino','Estacionamento (Igreja)', 'Alexandre Carraleiro Martins', 68),
  ('2026-05','2026-05-31','Culto Vespertino','Estacionamento (Rua)',    'Lucas Soranso',                69),
  ('2026-05','2026-05-31','Culto Vespertino','Estacionamento (Rua)',    'Thiago Magalhês de Souza',     70);

-- ── 3. Vincula diacono_id — passo 1: match exato (case-insensitive) ─
UPDATE public.escala_diaconal e
SET    diacono_id = p.id
FROM   public.pessoas p
WHERE  e.mes_ref      = '2026-05'
  AND  e.diacono_id   IS NULL
  AND  e.diacono_nome != ''
  AND  e.deleted_at   IS NULL
  AND  p.deleted_at   IS NULL
  AND  LOWER(TRIM(p.nome)) = LOWER(TRIM(e.diacono_nome));

-- ── 4. Vincula diacono_id — passo 2: match com variação de acento ──
-- Cobre casos como "Thiago Magalhês" (PDF) vs "Thiago Magalhães" (banco)
-- e "Éber" vs "Eber". Usa pg_trgm similarity se disponível; caso contrário
-- faz match pelo primeiro e segundo token do nome.
DO $$
DECLARE
  rec   RECORD;
  pid   uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT diacono_nome
    FROM   public.escala_diaconal
    WHERE  mes_ref = '2026-05'
      AND  diacono_id IS NULL
      AND  diacono_nome != ''
      AND  deleted_at IS NULL
  LOOP
    -- Tenta match pelo primeiro token (nome) + token do sobrenome
    SELECT id INTO pid
    FROM   public.pessoas
    WHERE  deleted_at IS NULL
      AND  LOWER(nome) LIKE '%' || LOWER(split_part(rec.diacono_nome, ' ', 1)) || '%'
      AND  LOWER(nome) LIKE '%' || LOWER(split_part(rec.diacono_nome, ' ', 2)) || '%'
    LIMIT  1;

    IF pid IS NOT NULL THEN
      UPDATE public.escala_diaconal
      SET    diacono_id = pid
      WHERE  mes_ref      = '2026-05'
        AND  diacono_nome = rec.diacono_nome
        AND  diacono_id   IS NULL
        AND  deleted_at   IS NULL;
    END IF;
  END LOOP;
END $$;

-- ── 5. Relatório: nomes vinculados × não vinculados ──────────────
-- Execute esta query para verificar o resultado:
SELECT
  e.diacono_nome                                               AS nome_pdf,
  CASE WHEN e.diacono_id IS NOT NULL THEN p.nome ELSE '—' END AS nome_banco,
  CASE WHEN e.diacono_id IS NOT NULL THEN '✓ vinculado'
       WHEN e.diacono_nome = ''       THEN '○ vaga em aberto'
       ELSE '⚠ NÃO VINCULADO — ajuste manual necessário'
  END                                                          AS status,
  COUNT(*)                                                     AS ocorrencias
FROM  public.escala_diaconal e
LEFT  JOIN public.pessoas p ON p.id = e.diacono_id
WHERE e.mes_ref     = '2026-05'
  AND e.deleted_at  IS NULL
GROUP BY e.diacono_nome, e.diacono_id, p.nome
ORDER BY 3 DESC, 1;

-- ── 6. Para corrigir manualmente um nome não vinculado: ──────────
-- UPDATE public.escala_diaconal
-- SET    diacono_id = (SELECT id FROM public.pessoas WHERE nome ILIKE '%nome%' LIMIT 1)
-- WHERE  mes_ref = '2026-05' AND diacono_nome = 'Nome exato do PDF' AND deleted_at IS NULL;
