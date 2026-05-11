# Codex — Setores Internos de Ministérios

## Contexto

Projeto: SIPEN — SPA vanilla JS + Supabase (sem framework, sem bundler).

Arquivos relevantes para esta tarefa:
- `modules/departamentos/ministerios.js` — módulo IIFE de ministérios (~663 linhas)
- `modules/departamentos/view.html` — views HTML do módulo (~159 linhas)
- `supabase/migrations/ministerios-migration.sql` — schema atual (tabelas `ministerios` e `ministerio_membros`)

### Schema atual (resumo)

```sql
ministerios (id UUID PK, nome TEXT, descricao TEXT, tipo TEXT,
             supervisor UUID FK pessoas, conselheiro UUID FK pessoas,
             coordenador UUID FK pessoas, ativo BOOLEAN, created_at, updated_at)

ministerio_membros (id UUID PK, ministerio_id UUID FK, pessoa_id UUID FK,
                    funcao TEXT, status TEXT CHECK(ativo|inativo), created_at)
```

### Estado JS relevante (variáveis e funções existentes)

```javascript
// Estado (IIFE-scoped)
let _ministerioAtual = null;   // UUID do ministério aberto no detalhe
let _pessoasCache    = null;   // cache de pessoas para selects
let _editandoId      = null;   // UUID do ministério em edição

// Helpers já existentes — reutilizar, não duplicar
_hdr()             // headers com JWT
_hdrJson()         // headers + Content-Type + Prefer
_auditInsert()     // { criado_por, igreja_id }
_carregarPessoas() // Promise → array {id, nome}
_optionsPessoa(selecionado) // HTML de <option> com pessoas
_modalWrap(id, titulo, breadcrumb, corpo, footerBtns)
_fld(id, label, type, req)
_sel(id, label, opts, req)
_errEl(id)
_showErr(id, msg)

// Perfis / permissão
_isGestor()   // ADMINISTRADOR_GERAL | CONSELHO | PASTORAL | ADM_OPERACIONAL
_isLider()    // LIDER_MINISTERIO | LIDER_AREA
_podeEditar() // _isGestor() || _isLider()

// Globais do SIPEN
SUPABASE_URL, SUPABASE_ANON_KEY
USUARIO_ATUAL.perfil, USUARIO_ATUAL.auth_user_id, USUARIO_ATUAL.pessoa_id, USUARIO_ATUAL.igreja_id
escapeHtml(str)
```

---

## Tarefas

### Tarefa 1 — Criar `supabase/migrations/ministerios-setores.sql`

```sql
-- SIPEN — Setores internos de ministérios
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ministerio_setores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministerio_id    UUID        NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  nome             TEXT        NOT NULL,
  lider_setorial   UUID        REFERENCES pessoas(id) ON DELETE SET NULL,
  observacoes      TEXT,
  ativo            BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  igreja_id        UUID
);

CREATE INDEX IF NOT EXISTS idx_msetores_ministerio ON ministerio_setores(ministerio_id);
CREATE INDEX IF NOT EXISTS idx_msetores_lider      ON ministerio_setores(lider_setorial);

-- Reusa o trigger set_updated_at() criado em ministerios-migration.sql
DROP TRIGGER IF EXISTS trg_msetores_updated_at ON ministerio_setores;
CREATE TRIGGER trg_msetores_updated_at
  BEFORE UPDATE ON ministerio_setores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ministerio_setores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='ministerio_setores' AND policyname='Leitura autenticada ministerio_setores'
  ) THEN
    CREATE POLICY "Leitura autenticada ministerio_setores"
      ON ministerio_setores FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='ministerio_setores' AND policyname='Escrita autenticada ministerio_setores'
  ) THEN
    CREATE POLICY "Escrita autenticada ministerio_setores"
      ON ministerio_setores FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ministerio_setores TO authenticated;
```

---

### Tarefa 2 — Atualizar `modules/departamentos/ministerios.js`

#### 2.1 — Novos campos de estado (logo após `let _editandoId = null;`)

Adicionar:
```javascript
let _setorEditandoId           = null;
let _supervisorDoMinisterioAtual = null; // pessoa_id do supervisor do ministério aberto
```

#### 2.2 — Nova função de permissão (logo após `_podeEditar()`)

```javascript
function _podeEditarSetor() {
  if (_isGestor()) return true;
  if (_isLider()) {
    return _supervisorDoMinisterioAtual &&
           _supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id;
  }
  return false;
}
```

#### 2.3 — Atualizar `minMinAbrir(id)`

Na função existente `minMinAbrir(id)`, logo após a linha:
```javascript
const dados = await rMin.json();
const m = dados[0];
```

Adicionar (salva supervisor no estado antes de continuar):
```javascript
_supervisorDoMinisterioAtual = m.supervisor || null;
```

Ao final de `minMinAbrir`, onde já existe `await _carregarMembros(id)`, adicionar logo abaixo:
```javascript
await _carregarSetores(id);
```

#### 2.4 — Nova função `_carregarSetores(ministerioId)`

Adicionar após `_carregarMembros`:

```javascript
async function _carregarSetores(ministerioId) {
  const el  = document.getElementById('min-min-setor-list');
  const cnt = document.getElementById('min-min-setor-count');
  const btn = document.getElementById('min-min-btn-add-setor');
  if (!el) return;

  if (btn) btn.style.display = _podeEditarSetor() ? '' : 'none';

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ministerio_setores` +
      `?ministerio_id=eq.${ministerioId}` +
      `&select=id,nome,observacoes,ativo,lider_setorial` +
      `&order=nome.asc`,
      { headers: _hdr() }
    );
    const lista = r.ok ? await r.json() : [];
    const ativos = lista.filter(s => s.ativo !== false);
    if (cnt) cnt.textContent = `(${ativos.length})`;

    if (lista.length === 0) {
      el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:16px 0;text-align:center">Nenhum setor cadastrado neste ministério.</div>';
      return;
    }

    // Resolver nomes dos líderes em lote
    const liderIds = [...new Set(lista.filter(s => s.lider_setorial).map(s => s.lider_setorial))];
    const nomeLider = {};
    if (liderIds.length) {
      const rl = await fetch(
        `${SUPABASE_URL}/rest/v1/pessoas?id=in.(${liderIds.join(',')})&select=id,nome`,
        { headers: _hdr() }
      );
      const ps = rl.ok ? await rl.json() : [];
      ps.forEach(p => { nomeLider[p.id] = (p.nome || '').toUpperCase(); });
    }

    const podeAct = _podeEditarSetor();
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--bd1)">
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Setor</th>
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Líder Setorial</th>
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:600">Status</th>
          ${podeAct ? '<th style="padding:6px 8px;color:var(--tx3);font-weight:600">Ações</th>' : ''}
        </tr></thead>
        <tbody>${lista.map(s => {
          const nome   = escapeHtml(s.nome);
          const lider  = s.lider_setorial ? escapeHtml(nomeLider[s.lider_setorial] || '—') : '—';
          const ativo  = s.ativo !== false;
          const stTag  = ativo
            ? '<span style="font-size:11px;padding:2px 7px;background:var(--greenbg,#d1fae5);color:var(--green,#059669);border-radius:20px">Ativo</span>'
            : '<span style="font-size:11px;padding:2px 7px;background:#fee2e2;color:var(--rose);border-radius:20px">Inativo</span>';
          const tdAcoes = podeAct
            ? `<td style="padding:7px 8px;white-space:nowrap">
                 <button onclick="minMinEditarSetor('${s.id}')"
                   class="tbt" style="font-size:11px;padding:3px 8px;margin-right:4px">Editar</button>
                 <button onclick="minMinToggleSetorStatus('${s.id}',${!ativo})"
                   class="tbt" style="font-size:11px;padding:3px 8px;margin-right:4px">
                   ${ativo ? 'Inativar' : 'Reativar'}
                 </button>
                 <button onclick="minMinRemoverSetor('${s.id}')"
                   class="tbt" style="font-size:11px;padding:3px 8px;color:var(--rose);border-color:var(--rose)">
                   Remover
                 </button>
               </td>`
            : '';
          return `<tr style="border-bottom:1px solid var(--bd1)">
            <td style="padding:7px 8px;color:var(--tx1);font-weight:500">${nome}</td>
            <td style="padding:7px 8px;color:var(--tx2)">${lider}</td>
            <td style="padding:7px 8px">${stTag}</td>
            ${tdAcoes}
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  } catch (e) {
    console.error('_carregarSetores:', e);
    el.innerHTML = '<div style="color:var(--rose);font-size:13px;padding:16px 0">Erro ao carregar setores.</div>';
  }
}
```

#### 2.5 — Modal de setor: `_garantirModalSetor()`

Adicionar após `_garantirModalMembro`:

```javascript
function _garantirModalSetor() {
  let el = document.getElementById('min-setor-modal');
  if (el) return el;

  const corpo = `
    ${_fld('mst-nome', 'Nome do Setor', 'text', true)}
    ${_sel('mst-lider', 'Líder Setorial', '<option value="">Carregando...</option>', false)}
    <div>
      <label style="${_LB}">Observações</label>
      <textarea id="mst-obs" rows="3"
        style="${_INP};resize:vertical;height:auto;font-family:inherit"></textarea>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="mst-ativo" checked style="width:16px;height:16px;cursor:pointer">
      <label for="mst-ativo" style="font-size:13px;color:var(--tx2);cursor:pointer">Setor ativo</label>
    </div>
    ${_errEl('mst-err')}`;

  const footer = `<button id="mst-btn" onclick="_mstSalvar()"
    style="padding:9px 24px;border-radius:8px;border:none;background:var(--violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>`;

  return _modalWrap('min-setor-modal', 'Novo Setor', 'Ministerial · Setores', corpo, footer);
}
```

#### 2.6 — Abrir modal para novo setor

```javascript
async function minMinNovoSetor() {
  if (!_podeEditarSetor()) return;
  _setorEditandoId = null;
  const modal = _garantirModalSetor();
  document.getElementById('min-setor-modal-title').textContent = 'Novo Setor';
  document.getElementById('mst-nome').value  = '';
  document.getElementById('mst-obs').value   = '';
  document.getElementById('mst-ativo').checked = true;
  _showErr('mst-err', '');
  await _carregarPessoas();
  document.getElementById('mst-lider').innerHTML = _optionsPessoa('');
  modal.style.display = 'flex';
}
```

#### 2.7 — Abrir modal para editar setor

```javascript
async function minMinEditarSetor(id) {
  if (!_podeEditarSetor()) return;
  _setorEditandoId = id;
  const modal = _garantirModalSetor();
  document.getElementById('min-setor-modal-title').textContent = 'Editar Setor';
  _showErr('mst-err', '');

  const [r] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}&select=*`, { headers: _hdr() }),
    _carregarPessoas(),
  ]);
  const dados = r.ok ? await r.json() : [];
  const s = dados[0];
  if (!s) { alert('Setor não encontrado.'); return; }

  document.getElementById('mst-nome').value    = s.nome        || '';
  document.getElementById('mst-obs').value     = s.observacoes || '';
  document.getElementById('mst-ativo').checked = s.ativo !== false;
  document.getElementById('mst-lider').innerHTML = _optionsPessoa(s.lider_setorial || '');
  modal.style.display = 'flex';
}
```

#### 2.8 — Salvar setor (`_mstSalvar`)

```javascript
async function _mstSalvar() {
  const nome = (document.getElementById('mst-nome').value || '').trim();
  if (!nome) { _showErr('mst-err', 'Nome do setor é obrigatório.'); return; }

  const btn = document.getElementById('mst-btn');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const base = {
    nome,
    lider_setorial: document.getElementById('mst-lider').value || null,
    observacoes:    (document.getElementById('mst-obs').value || '').trim() || null,
    ativo:          document.getElementById('mst-ativo').checked,
  };

  try {
    let r;
    if (_setorEditandoId) {
      r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${_setorEditandoId}`, {
        method: 'PATCH', headers: _hdrJson(), body: JSON.stringify(base),
      });
    } else {
      const payload = Object.assign({ ministerio_id: _ministerioAtual }, base, _auditInsert());
      r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores`, {
        method: 'POST', headers: _hdrJson(), body: JSON.stringify(payload),
      });
    }
    if (!r.ok) throw new Error((await r.text()) || r.status);

    document.getElementById('min-setor-modal').style.display = 'none';
    await _carregarSetores(_ministerioAtual);
  } catch (e) {
    _showErr('mst-err', `Erro ao salvar: ${e.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}
```

#### 2.9 — Toggle status e remoção de setor

```javascript
async function minMinToggleSetorStatus(id, novoAtivo) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}`, {
      method: 'PATCH', headers: _hdrJson(), body: JSON.stringify({ ativo: novoAtivo }),
    });
    if (!r.ok) throw new Error(r.status);
    await _carregarSetores(_ministerioAtual);
  } catch (e) {
    alert('Erro ao atualizar status: ' + e.message);
  }
}

async function minMinRemoverSetor(id) {
  if (!confirm('Remover este setor permanentemente?')) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ministerio_setores?id=eq.${id}`, {
      method: 'DELETE', headers: _hdr(),
    });
    if (!r.ok) throw new Error(r.status);
    await _carregarSetores(_ministerioAtual);
  } catch (e) {
    alert('Erro ao remover: ' + e.message);
  }
}
```

#### 2.10 — Exports (adicionar ao bloco `window.*` existente no final do IIFE)

```javascript
window.minMinNovoSetor           = minMinNovoSetor;
window.minMinEditarSetor         = minMinEditarSetor;
window.minMinToggleSetorStatus   = minMinToggleSetorStatus;
window.minMinRemoverSetor        = minMinRemoverSetor;
window._mstSalvar                = _mstSalvar;
```

---

### Tarefa 3 — Atualizar `modules/departamentos/view.html`

No painel de detalhe `#min-min-painel-detalhe`, localizar o card de membros existente:

```html
<div class="card">
  <div class="ctit">Membros
    <span id="min-min-membro-count" ...></span>
    <span class="cact" id="min-min-btn-add-membro" ...>+ Adicionar</span>
  </div>
  <div id="min-min-membro-list">...</div>
</div>
```

**Antes** desse card, inserir o card de setores:

```html
<div class="card" style="margin-bottom:16px">
  <div class="ctit">Setores do Ministério
    <span id="min-min-setor-count" style="color:var(--tx3);font-weight:400;font-size:12px"></span>
    <span class="cact" id="min-min-btn-add-setor" style="display:none"
          onclick="minMinNovoSetor()">+ Novo Setor</span>
  </div>
  <div id="min-min-setor-list">
    <div style="color:var(--tx3);font-size:13px;padding:16px 0">Carregando...</div>
  </div>
</div>
```

---

## Restrições

1. **Não alterar** nenhuma função ou variável já existente em `ministerios.js` — apenas adicionar código novo e os dois pontos de integração indicados em 2.3 (atribuição de `_supervisorDoMinisterioAtual` e chamada de `_carregarSetores`).
2. **Não duplicar** `_hdr`, `_hdrJson`, `_modalWrap`, `_fld`, `_sel`, `_errEl`, `_LB`, `_INP` — já existem no IIFE.
3. O `textarea#mst-obs` deve usar `style="${_INP};resize:vertical;height:auto;font-family:inherit"` para herdar o tema visual.
4. `_auditInsert()` deve ser incluído **apenas no INSERT** (POST), nunca no PATCH — igual ao padrão de `_mmSalvar`.
5. O SQL em `ministerios-setores.sql` deve usar `IF NOT EXISTS` e `DO $$ BEGIN ... END $$` para ser idempotente (reexecutável sem erro).
6. O trigger `set_updated_at()` já existe no banco (criado por `ministerios-migration.sql`) — não recriar a função, apenas o trigger.

---

## Validação esperada

Após a implementação:

1. O painel de detalhe de qualquer ministério exibe o card "Setores do Ministério" acima do card "Membros".
2. Para gestores e supervisores do próprio ministério: botão "+ Novo Setor" visível, modal abre corretamente.
3. Salvar novo setor → aparece na lista imediatamente (sem reload da página).
4. Editar setor → modal pré-preenchido com os dados existentes.
5. Inativar/Reativar → status atualiza na tabela instantaneamente.
6. Remover → solicita confirmação, remove e recarrega a lista.
7. Para perfis sem permissão (ex: coordenador, membro comum): botão oculto, apenas visualização.
8. O SQL pode ser executado duas vezes sem erro.

---

## Arquivos a criar/alterar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/ministerios-setores.sql` | **Criar** |
| `modules/departamentos/ministerios.js` | **Alterar** (adicionar código) |
| `modules/departamentos/view.html` | **Alterar** (inserir card de setores) |

---

## Commit

Após concluir todas as tarefas:

```
git add supabase/migrations/ministerios-setores.sql modules/departamentos/ministerios.js modules/departamentos/view.html
git commit -m "feat: adiciona setores internos aos ministérios (v6.30.31)"
```
