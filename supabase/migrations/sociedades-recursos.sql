-- Migration: sociedades-recursos.sql
-- Adiciona campos de descrição e módulos opcionais à tabela sociedades
-- Liderança permanece exclusivamente na tabela nomeados (fonte única)

ALTER TABLE public.sociedades
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS recursos  jsonb NOT NULL DEFAULT '{}'::jsonb;
