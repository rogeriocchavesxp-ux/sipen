# SIPEN — Relatório de Auditoria de Segurança
**Data:** 2026-05-19  
**Scope:** Supabase/PostgreSQL — schema `public`

---

## Resumo Executivo

| Categoria | Achados | Criticidade | Status após hardening |
|---|---|---|---|
| Security Definer Views | 24 views | Alta | Corrigido (FASE 1) |
| Auth RLS Init Plan | 3 tabelas reais + funções | Média (performance) | Corrigido (FASE 2) |
| Grant anon em contratos | INSERT/UPDATE/DELETE sem auth | **Crítica** | Corrigido (FASE 3) |
| user_profiles sem policies | SELECT bloqueado silenciosamente | Alta | Corrigido (FASE 4) |
| WhatsApp policies quebradas | Lógica de role nunca casa | Alta | Corrigido (FASE 5) |
| USING (true) em tabelas core | Sem granularidade de linha | Baixa (aceitável) | Documentado |

---

## Achado 1 — Security Definer Views (CRÍTICO)

### Problema
Todas as 24 views criadas via `CREATE OR REPLACE VIEW` (sem `WITH (security_invoker = on)`) herdam automaticamente o behavior `SECURITY DEFINER` do PostgreSQL. O dono das views é o role `postgres`/superusuário do Supabase.

**Consequência:** A view executa com os privilégios do *dono* (postgres), não do *chamador*. Isso significa que as políticas RLS das tabelas-base são **ignoradas** quando o acesso é feito via view. Qualquer usuário que consiga acessar a view contorna todas as restrições de linha configuradas nas tabelas.

### Risco Real no SIPEN
Como a maioria das tabelas-base usa `USING (true)` para `authenticated`, o risco prático de exposição de dados entre usuários autenticados é baixo. Porém:
- Se um atacante obtiver acesso à URL do Supabase + anon key (que está no frontend), views sem `security_invoker` poderiam expor dados via REST mesmo que as tabelas-base bloqueiem anon.
- Se no futuro as políticas das tabelas-base forem apertadas (ex: filtro por congregação), as views continuariam bypassando essas regras.

### Views Afetadas
| View | Fonte (migration) | Dependências no Frontend |
|---|---|---|
| `v_membros` | supabase-v3-patch.sql | membresia/index.js, projetos/index.js |
| `v_visitantes` | supabase-v2-schema.sql | (não referenciado diretamente) |
| `v_oficiais` | supabase-v2-schema.sql | diaconal/escalas.js, core/init.js |
| `v_nomeados` | supabase-v2-schema.sql | core/init.js (carregarConselhoKpis) |
| `v_demandas` | supabase-v2-schema.sql | demandas/index.js |
| `v_contratos` | contratos-rls-grant-fix.sql | juridico/contratos.js |
| `v_pessoas_ativas` | supabase-v2-schema.sql | autocomplete, varios |
| `v_contratados` | supabase-v3-patch.sql | core/init.js |
| `v_seminaristas` | supabase-v3-patch.sql | (não referenciado diretamente) |
| `v_rede_cuidado` | supabase-rede-cuidado.sql | pastoral/rede-cuidado.js |
| `v_escala_diaconal` | supabase-escala-diaconal.sql | diaconal/escalas.js |
| `v_participantes_externos` | supabase-participantes-externos.sql | admin/pessoas-externas.js |
| `vw_mandatos_a_vencer` | supabase-oficiais.sql | (interno) |
| `vw_quadro_resumo` | supabase-oficiais.sql | (interno) |
| `vw_pessoa_cargos` | supabase-nomeados.sql | (interno) |
| `vw_pessoas_ativas` | (live DB) | autocomplete |
| `v_pessoas_completo` | (live DB) | (verificar) |
| `vw_oficiais_ativos` | (live DB) | (verificar) |
| `vw_financeiro_ativo` | (live DB) | financeiro/index.js |
| `vw_membros_ativos` | (live DB) | (verificar) |
| `vw_contratos_ativos` | (live DB) | juridico/contratos.js |
| `vw_nomeados_ativos` | (live DB) | (verificar) |
| `vw_demandas_ativas` | (live DB) | demandas/index.js |
| `v_pessoas_sem_vinculo` | (live DB) | (verificar) |

### Correção
```sql
ALTER VIEW public.<nome> SET (security_invoker = on);
```
Sem risco de quebrar frontend: não altera colunas, nomes ou comportamento dos dados.

---

## Achado 2 — Auth RLS Initialization Plan (PERFORMANCE)

### Problema
Quando `auth.uid()` aparece diretamente em uma subquery de policy RLS (especialmente dentro de `EXISTS` ou `IN`), o PostgreSQL a classifica como função `VOLATILE` e a reavalia para cada linha — `O(n)`. Isso degrada significativamente queries em tabelas grandes.

**Fix:** Substituir `auth.uid()` por `(SELECT auth.uid())` transforma a avaliação em um `InitPlan` — calculado uma vez por query — `O(1)`.

### Tabelas Realmente Afetadas (com auth.uid() em subquery)
| Tabela | Tipo de Problema | Policy Afetada |
|---|---|---|
| `ministerios` | auth.uid() em IN subquery | ministerios_select, ministerios_insert |
| `ministerio_membros` | auth.uid() em IN subquery | ministerio_membros_select, _insert |
| `rede_cuidado` | auth.uid() em EXISTS subquery | rede_cuidado_admin_all, _lider_select, _cuidado_select |

### Tabelas Listadas no Advisor mas com USING (true)
As seguintes tabelas foram flagadas pelo Advisor mas usam `USING (true)` — sem `auth.uid()` direto nas policies. O Advisor provavelmente as flagou por serem tabelas com RLS ativo sem granularidade. Não há fix de performance necessário, mas documentamos que o comportamento `USING (true)` é **intencional** para um sistema interno.

`congregacoes`, `membros`, `user_profiles`, `logs_sistema`, `demandas`, `agenda`, `pgs`, `pg_participantes`, `pessoas`, `estudos_pgs`, `ministerio_setores`, `pessoa_congregacoes`, `demanda_andamentos`, `pessoa_ministerios`

---

## Achado 3 — Grant anon em `contratos` (CRÍTICO)

### Problema
O arquivo `contratos-rls-grant-fix.sql` contém:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO anon;
```
Isso permite que **qualquer pessoa não autenticada** (só com a anon key pública do Supabase) crie, edite e exclua contratos via API REST. A anon key é exposta no frontend JavaScript.

### Impacto
- Contrato pode ser criado com valores falsos por qualquer visitante da página
- Contratos existentes podem ser alterados ou deletados sem nenhuma autenticação
- Risco real de dano de integridade de dados

### Correção
```sql
REVOKE ALL PRIVILEGES ON public.contratos FROM anon;
DROP POLICY IF EXISTS "anon_select_contratos" ON public.contratos;
```

---

## Achado 4 — `user_profiles` sem policies SELECT

### Problema
`user_profiles` tem `ENABLE ROW LEVEL SECURITY` mas sem `SELECT` policy para `authenticated`. O PostgreSQL com RLS ativo e sem policy bloqueia silenciosamente todas as queries (retorna 0 linhas, sem erro).

### Impacto
- `is_admin()` e `has_role()` funcionam (são SECURITY DEFINER, bypassam RLS)
- Mas qualquer query direta à tabela por usuários autenticados retorna vazio
- Se o frontend tentar ler o próprio perfil, recebe `[]` sem indicação de erro

### Correção
Adicionadas policies:
- `user_profiles_self_select`: usuário lê apenas sua própria linha
- `user_profiles_admin_all`: admin gerencia todas as linhas

---

## Achado 5 — WhatsApp policies com `auth.jwt() ->> 'role'` (QUEBRADO)

### Problema
As policies em `supabase-whatsapp.sql` usam:
```sql
USING (auth.jwt() ->> 'role' IN ('admin_geral','ADMINISTRADOR_GERAL'))
```

O claim `role` do JWT Supabase é **sempre** `'authenticated'` ou `'anon'` — não é o role de aplicação do SIPEN (que é armazenado em `membros.funcao` e `perfis`, não no JWT).

### Impacto
- `whatsapp_config`: **NENHUM** usuário autenticado consegue ler ou alterar configurações (policy falha para todos pois `'authenticated' NOT IN ('admin_geral','ADMINISTRADOR_GERAL')`)
- `whatsapp_mensagens`: idem — logs de mensagens inacessíveis para todos
- A funcionalidade WhatsApp está essencialmente bloqueada no dashboard admin

### Correção
Substituir `auth.jwt() ->> 'role'` por `public.is_admin()` que lê corretamente de `user_profiles.role` via SECURITY DEFINER.

> **ATENÇÃO:** Se `user_profiles` não estiver populado com os usuários admin, `is_admin()` retornará `false` para todos. Nesse caso, popular a tabela primeiro ou usar o fallback `is_admin_by_funcao()` documentado na migration.

---

## Achado 6 — USING (true) nas tabelas core (DOCUMENTADO, INTENCIONAL)

### Situação
A maioria das tabelas core (`pessoas`, `membros`, `agenda`, `financeiro`, etc.) usa:
```sql
CREATE POLICY "auth_select_<tabela>" FOR SELECT TO authenticated USING (true);
```

### Avaliação
Para um sistema de gestão eclesiástica interno onde todos os usuários autenticados são membros/funcionários da mesma instituição, `USING (true)` é uma **escolha arquitetural aceitável**. Implementar RLS por congregação/ministério exigiria refatoração significativa do frontend.

### Recomendação Futura (não urgente)
Se o sistema crescer para múltiplas igrejas independentes (multi-tenant), adicionar `AND congregacao_id = minha_congregacao_id()` nas policies das tabelas core. Isso é um escopo futuro — não alterar agora pois quebraria o frontend atual.

---

## Estado do Advisor Após Hardening

| Check do Advisor | Antes | Após |
|---|---|---|
| Security Definer Views | 20+ alertas | 0 alertas esperados |
| Auth RLS Initialization Plan | 20+ alertas | ~3-5 restantes (USING true, aceitável) |
| Tabelas sem RLS | 0 (já OK) | 0 |
| Anon access excessivo | contratos + views | 0 |

---

## Ordem de Execução Recomendada

1. Executar `sipen-security-hardening-v1.sql` no Supabase Dashboard > SQL Editor
2. Verificar resultados da FASE 7 (validation queries)
3. Testar login e navegação no SIPEN
4. Testar módulo WhatsApp (confirmar que admin consegue acessar)
5. Se WhatsApp ainda falhar: verificar se `user_profiles` está populado
6. Executar os queries de auditoria da FASE 0 para comparar antes/depois

## Arquivos de Migration Relacionados

```
sipen-security-hardening-v1.sql  ← EXECUTAR AGORA
sipen-security-audit-report.md   ← este arquivo (documentação)

Migrations que geraram os problemas (NÃO reexecutar):
  contratos-rls-grant-fix.sql    — gerou o grant anon perigoso
  supabase-v2-schema.sql         — criou views sem security_invoker
  supabase-v3-patch.sql          — criou v_contratados, v_seminaristas sem security_invoker
  supabase-whatsapp.sql          — criou policies com auth.jwt() quebrado
  sipen-security-migration.sql   — criou policies ministerios com auth.uid() direto
  supabase-rede-cuidado.sql      — criou policies rede_cuidado com auth.uid() direto
```
