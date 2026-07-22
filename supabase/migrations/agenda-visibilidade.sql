-- Adiciona coluna visibilidade na tabela agenda
-- 'publica'  = aparece para todos os membros na Área do Membro
-- 'interna'  = visível apenas na área de gestão (admin/gestor)
ALTER TABLE agenda
  ADD COLUMN IF NOT EXISTS visibilidade TEXT NOT NULL DEFAULT 'publica'
    CHECK (visibilidade IN ('publica', 'interna'));
