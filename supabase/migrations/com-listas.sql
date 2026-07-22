-- Listas personalizadas de destinatários para comunicação
-- migration: com-listas

CREATE TABLE IF NOT EXISTS com_listas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  criado_por  UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS com_lista_membros (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id   UUID NOT NULL REFERENCES com_listas(id) ON DELETE CASCADE,
  pessoa_id  UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  UNIQUE(lista_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_com_lista_membros_lista ON com_lista_membros(lista_id);
CREATE INDEX IF NOT EXISTS idx_com_lista_membros_pessoa ON com_lista_membros(pessoa_id);
