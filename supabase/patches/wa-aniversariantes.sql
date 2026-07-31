-- ═══════════════════════════════════════════════════════
-- SIPEN — WhatsApp: Envio de Aniversariantes
-- wa-aniversariantes.sql
-- ═══════════════════════════════════════════════════════

ALTER TABLE wa_agendamentos
  ADD COLUMN IF NOT EXISTS tipo             TEXT DEFAULT 'mensagem',
  ADD COLUMN IF NOT EXISTS recorrente       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS horario_diario   TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_envio_em  TIMESTAMPTZ;

-- tipo: 'mensagem' (conteúdo estático) | 'aniversariantes' (conteúdo gerado no momento do envio)
-- recorrente: true = repete todo dia no horario_diario; status permanece 'pendente'
-- horario_diario: ex '08:00' — hora local do disparo diário
-- ultimo_envio_em: atualizado a cada execução recorrente para evitar duplo envio no mesmo dia

NOTIFY pgrst, 'reload schema';
