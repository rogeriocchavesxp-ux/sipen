-- ================================================================
-- SIPEN — Importação histórica de cultos (WhatsApp Junta Diaconal)
-- Período: 01/03/2026 a 12/04/2026
-- Executar no Supabase Dashboard → SQL Editor
--
-- Mapeamento de tipos:
--   Matutino   → 'Culto Manhã'
--   Vespertino → 'Culto Tarde'
--   Noturno    → 'Culto Noite'
--   Conexão    → 'Conexão Com Deus'
--   Hispânico  → cong separada (Congregação Hispânica) se existir,
--                senão insere como Sede com obs
-- ================================================================

DO $$
DECLARE
  sede_id   uuid;
  hisp_id   uuid;
BEGIN
  SELECT id INTO sede_id FROM congregacoes WHERE nome = 'Sede - IPPenha' LIMIT 1;
  SELECT id INTO hisp_id FROM congregacoes WHERE nome ILIKE '%hisp%' LIMIT 1;

  IF sede_id IS NULL THEN
    RAISE EXCEPTION 'Congregação "Sede - IPPenha" não encontrada. Execute congregacao-sede-insert.sql primeiro.';
  END IF;

  -- ── 01/03/2026 (Domingo) ────────────────────────────────────────

  -- Matutino: Adultos 522, Crianças 50, Online 90
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-01', 'Culto Manhã', 522, 50, 572, 'Online: 90');

  -- Hispânico: 35 adultos, 14 crianças, 3 online
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (COALESCE(hisp_id, sede_id), '2026-03-01', 'Culto Manhã', 35, 14, 49,
          CASE WHEN hisp_id IS NULL THEN 'Culto Hispânico — Online: 3' ELSE 'Online: 3' END);

  -- Vespertino: Adultos 353, Crianças 33, Online 115 (corrigido de 65)
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-01', 'Culto Tarde', 353, 33, 386, 'Online: 115');

  -- ── 02/03/2026 (Segunda) — Conexão Com Deus ───────────────────

  -- Adultos 35, Online 72
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-02', 'Conexão Com Deus', 35, 0, 35, 'Online: 72');

  -- ── 09/03/2026 (Segunda) — Culto Conexão ─────────────────────

  -- Adultos 52, Crianças 1, Online 76
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-09', 'Conexão Com Deus', 52, 1, 53, 'Online: 76');

  -- ── 22/03/2026 (Domingo) ────────────────────────────────────────

  -- Matutino: Adultos 491, Crianças 46, Online 99
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-22', 'Culto Manhã', 491, 46, 537, 'Online: 99');

  -- Hispânico: 34 adultos, 8 crianças, 2 online
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (COALESCE(hisp_id, sede_id), '2026-03-22', 'Culto Manhã', 34, 8, 42,
          CASE WHEN hisp_id IS NULL THEN 'Culto Hispânico — Online: 2' ELSE 'Online: 2' END);

  -- Noturno: Adultos 314, Crianças 25, Online 146
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-22', 'Culto Noite', 314, 25, 339, 'Online: 146');

  -- ── 24/03/2026 (Terça) — Conexão ──────────────────────────────

  -- Presentes 53, Online 61, Crianças 2
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-24', 'Conexão Com Deus', 51, 2, 53, 'Online: 61');

  -- ── 29/03/2026 (Domingo) ────────────────────────────────────────

  -- Matutino: Adultos 465, Crianças 67, Online 87
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-29', 'Culto Manhã', 465, 67, 532, 'Online: 87');

  -- Hispânico: 31 adultos, 10 crianças
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (COALESCE(hisp_id, sede_id), '2026-03-29', 'Culto Manhã', 31, 10, 41,
          CASE WHEN hisp_id IS NULL THEN 'Culto Hispânico' ELSE NULL END);

  -- Vespertino: Adultos 501, Crianças 39, Online 176
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-03-29', 'Culto Tarde', 501, 39, 540, 'Online: 176');

  -- ── 01/04/2026 (Quarta) — Conexão Com Deus ───────────────────
  -- Nota: sem data explícita no WhatsApp; estimado como 01/04 (Quarta entre 29/03 e Páscoa 05/04)

  -- Presentes 120, Online 57
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-04-01', 'Conexão Com Deus', 120, 0, 120, 'Online: 57');

  -- ── 05/04/2026 (Domingo — Páscoa / Culto da Ressurreição) ─────

  -- Matutino Ressurreição: Adultos 381, Crianças 21, Online 69
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-04-05', 'Culto Manhã', 381, 21, 402, 'Online: 69 | Culto da Ressurreição');

  -- Hispânico: 43 adultos, 15 crianças
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (COALESCE(hisp_id, sede_id), '2026-04-05', 'Culto Manhã', 43, 15, 58,
          CASE WHEN hisp_id IS NULL THEN 'Culto Hispânico' ELSE NULL END);

  -- Noturno: Adultos 328, Crianças 22, Online 100
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-04-05', 'Culto Noite', 328, 22, 350, 'Online: 100');

  -- ── 06/04/2026 (Segunda) — Conexão ───────────────────────────

  -- Presentes 250, Online 179
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-04-06', 'Conexão Com Deus', 250, 0, 250, 'Online: 179');

  -- ── 12/04/2026 (Domingo) ────────────────────────────────────────

  -- Matutino: Adultos 404, Crianças 61, Online 81
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (sede_id, '2026-04-12', 'Culto Manhã', 404, 61, 465, 'Online: 81');

  -- Hispânico: 38 adultos, 14 crianças, 1 online
  INSERT INTO congregacao_cultos (cong_id, data, tipo, adultos, criancas, participantes, obs)
  VALUES (COALESCE(hisp_id, sede_id), '2026-04-12', 'Culto Manhã', 38, 14, 52,
          CASE WHEN hisp_id IS NULL THEN 'Culto Hispânico — Online: 1' ELSE 'Online: 1' END);

END $$;

-- Verificar o que foi inserido
SELECT
  c.nome AS congregacao,
  cc.data,
  cc.tipo,
  cc.adultos,
  cc.criancas,
  cc.participantes,
  cc.obs
FROM congregacao_cultos cc
JOIN congregacoes c ON c.id = cc.cong_id
ORDER BY cc.data, cc.tipo;
