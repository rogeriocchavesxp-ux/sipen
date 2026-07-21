-- Migration: sociedades-recursos.sql
-- Adiciona campos de administração e módulos opcionais à tabela sociedades

ALTER TABLE public.sociedades
  ADD COLUMN IF NOT EXISTS descricao       text,
  ADD COLUMN IF NOT EXISTS presidente_id   uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conselheiro_id  uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS secretario_id   uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recursos        jsonb NOT NULL DEFAULT '{}'::jsonb;
