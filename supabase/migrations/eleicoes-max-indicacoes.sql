-- SIPEN — Eleições: limite configurável de indicações por tipo
-- Execute no Supabase SQL Editor

ALTER TABLE public.eleicao_processos
  ADD COLUMN IF NOT EXISTS max_indicacoes INTEGER NOT NULL DEFAULT 5;
