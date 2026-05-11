# Codex — Hierarquia de Permissões no Módulo de Ministérios

## Contexto

Projeto: SIPEN — SPA vanilla JS + Supabase (sem framework, sem bundler).

O módulo de Ministérios já tem o CRUD de ministérios e setores implementado.
**Esta tarefa refina exclusivamente as permissões** de acordo com a hierarquia real da igreja.

### O que já existe (não alterar a lógica, apenas o que está especificado abaixo)

```
modules/departamentos/ministerios.js  — módulo IIFE (~882 linhas)
modules/departamentos/view.html       — views do módulo
```

### Perfis em `USUARIO_ATUAL.perfil` (valores reais do sistema)

| Perfil | Nível |
|--------|-------|
| `ADMINISTRADOR_GERAL` | Controle total |
| `CONSELHO` | Gestão geral |
| `PASTORAL` | Gestão geral |
| `ADM_OPERACIONAL` | Gestão geral |
| `LIDER_MINISTERIO` | Pode ser supervisor de um ministério |
| `LIDER_AREA` | Pode ser supervisor de um ministério |

### Funções de permissão existentes (no topo do IIFE)

```javascript
function _isGestor() {
  return ['ADMINISTRADOR_GERAL','CONSELHO','PASTORAL','ADM_OPERACIONAL']
    .includes(USUARIO_ATUAL?.perfil);
}
function _isLider() {
  return USUARIO_ATUAL?.perfil === 'LIDER_MINISTERIO'
      || USUARIO_ATUAL?.perfil === 'LIDER_AREA';
}
function _podeEditar() { return _isGestor() || _isLider(); }
function _podeEditarSetor() {
  if (_isGestor()) return true;
  if (_isLider()) {
    return _supervisorDoMinisterioAtual &&
           _supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id;
  }
  return false;
}
```

### Estado existente

```javascript
let _ministerioAtual             = null; // UUID do ministério aberto
let _supervisorDoMinisterioAtual = null; // pessoa_id do supervisor do ministério aberto
                                         // (populado em minMinAbrir() ao carregar o ministério)
```

### Identificação de Supervisor

O supervisor não tem um perfil especial — é identificado comparando:
```
_supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id
```
`_supervisorDoMinisterioAtual` é populado em `minMinAbrir()` a partir de `m.supervisor` (campo UUID da tabela `ministerios`).

---

## Hierarquia de permissões a implementar

| Ação | Admin Geral | Supervisor do ministério aberto | Demais gestores | Coordenador / Líder |
|------|:-----------:|:-------------------------------:|:---------------:|:-------------------:|
| Criar novo ministério | ✅ | ✗ | ✗ | ✗ |
| Editar ministério (todos os campos) | ✅ | ✗ | ✗ | ✗ |
| Editar ministério (coordenador, descricao, tipo — exceto supervisor) | ✅ | ✅ | ✗ | ✗ |
| Definir / alterar o Supervisor do ministério | ✅ | ✗ | ✗ | ✗ |
| Criar / editar / excluir setores | ✅ | ✅ | ✗ | ✗ |
| Adicionar / remover membros | ✅ | ✅ | ✅ | ✗ |
| Visualizar ministério e setores | ✅ | ✅ | ✅ | ✅ |

---

## Tarefas

### Tarefa 1 — Adicionar helpers de permissão

Adicionar **após** a função `_podeEditarSetor()` existente:

```javascript
function _isAdminGeral() {
  return USUARIO_ATUAL?.perfil === 'ADMINISTRADOR_GERAL';
}
function _isSupervisorDoMinisterio() {
  return !!(_supervisorDoMinisterioAtual &&
            _supervisorDoMinisterioAtual === USUARIO_ATUAL?.pessoa_id);
}
function _podeEditarMinisterio() {
  return _isAdminGeral() || _isSupervisorDoMinisterio();
}
```

---

### Tarefa 2 — Restringir criação de ministério a Admin Geral

Em `minMinLoad()`, localizar:
```javascript
if (heroAct) heroAct.style.display = _isGestor() ? '' : 'none';
```
Substituir por:
```javascript
if (heroAct) heroAct.style.display = _isAdminGeral() ? '' : 'none';
```

---

### Tarefa 3 — Restringir botão "Editar" no detalhe do ministério

Em `minMinAbrir()`, localizar:
```javascript
const btnEditar = _isGestor()
  ? `<button onclick="minMinEditar('${m.id}')" class="tbt" ...>✏️ Editar</button>`
  : '';
```
Substituir a condição por `_podeEditarMinisterio()`:
```javascript
const btnEditar = _podeEditarMinisterio()
  ? `<button onclick="minMinEditar('${m.id}')" class="tbt" style="font-size:12px;padding:5px 12px">✏️ Editar</button>`
  : '';
```

---

### Tarefa 4 — Restringir guard de `minMinNovo()` e `minMinEditar()`

Em `minMinNovo()`, substituir:
```javascript
if (!_isGestor()) return;
```
Por:
```javascript
if (!_isAdminGeral()) return;
```

Em `minMinEditar(id)`, substituir:
```javascript
if (!_isGestor()) return;
```
Por:
```javascript
if (!_podeEditarMinisterio()) return;
```

---

### Tarefa 5 — Campo Supervisor: visível e editável apenas para Admin Geral

O modal de ministério (`_garantirModalMin()`) cria os campos estaticamente no primeiro uso.
O formulário precisa ocultar o campo `#mm-supervisor` quando o usuário NÃO for Admin Geral.

Após a modal ser garantida via `_garantirModalMin()` e **antes** de exibir `modal.style.display = 'flex'`, em **ambas** as funções (`minMinNovo` e `minMinEditar`), adicionar o controle de visibilidade do campo Supervisor.

#### Em `minMinNovo()` — adicionar após `_showErr('mm-err', '')`:
```javascript
// Supervisor só editável pelo Admin Geral
const supWrap = document.getElementById('mm-supervisor')?.closest('div');
if (supWrap) supWrap.style.display = _isAdminGeral() ? '' : 'none';
```

#### Em `minMinEditar(id)` — adicionar após `document.getElementById('mm-ativo').checked = m.ativo !== false`:
```javascript
// Supervisor só editável pelo Admin Geral
const supWrap = document.getElementById('mm-supervisor')?.closest('div');
if (supWrap) supWrap.style.display = _isAdminGeral() ? '' : 'none';
```

---

### Tarefa 6 — Payload de salvar ministério: proteger campo supervisor

Em `_mmSalvar()`, localizar a construção do objeto `base`:
```javascript
const base = {
  nome,
  descricao:   ...,
  tipo:        ...,
  supervisor:  document.getElementById('mm-supervisor').value  || null,
  conselheiro: document.getElementById('mm-conselheiro').value || null,
  coordenador: document.getElementById('mm-coordenador').value || null,
  ativo:       document.getElementById('mm-ativo').checked,
};
```

Substituir por:
```javascript
const base = {
  nome,
  descricao:   (document.getElementById('mm-desc').value || '').trim() || null,
  tipo:        document.getElementById('mm-tipo').value        || null,
  conselheiro: document.getElementById('mm-conselheiro').value || null,
  coordenador: document.getElementById('mm-coordenador').value || null,
  ativo:       document.getElementById('mm-ativo').checked,
};
// Supervisor só é enviado no payload se o usuário for Admin Geral
if (_isAdminGeral()) {
  base.supervisor = document.getElementById('mm-supervisor').value || null;
}
```

---

### Tarefa 7 — Badge de papel no detalhe do ministério

No header do ministério (`minMinAbrir()`), após renderizar `btnEditar`, adicionar um badge
indicando o papel do usuário logado em relação a este ministério.

Adicionar esta função auxiliar **dentro** de `minMinAbrir()` (escopo local):

```javascript
const _badgePapel = () => {
  if (_isAdminGeral())            return '<span style="font-size:11px;padding:2px 8px;background:var(--violetbg);color:var(--violet);border-radius:20px;font-weight:600">Admin Geral</span>';
  if (_isSupervisorDoMinisterio()) return '<span style="font-size:11px;padding:2px 8px;background:rgba(74,156,245,0.12);color:var(--sky,#3a9af5);border-radius:20px;font-weight:600">Supervisor</span>';
  if (USUARIO_ATUAL?.pessoa_id && USUARIO_ATUAL.pessoa_id === m.coordenador) return '<span style="font-size:11px;padding:2px 8px;background:rgba(58,170,92,0.12);color:var(--gmd);border-radius:20px;font-weight:600">Coordenador</span>';
  return '';
};
```

Inserir `${_badgePapel()}` na linha do nome do ministério no `header.innerHTML`, ao lado do título:
```html
<div style="font-size:18px;font-weight:800;color:var(--tx1)">${escapeHtml(m.nome)}
  ${m.ativo === false ? '<span style="...">Inativo</span>' : ''}
</div>
${_badgePapel()}
${btnEditar}
```

Exemplo de posicionamento (substituir o bloco de `align-items` que envolve nome + btnEditar):
```javascript
`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
  <div style="font-size:18px;font-weight:800;color:var(--tx1)">${escapeHtml(m.nome)}
    ${m.ativo === false ? '<span style="font-size:11px;padding:2px 8px;background:#fee2e2;color:var(--rose);border-radius:20px;margin-left:4px">Inativo</span>' : ''}
  </div>
  ${_badgePapel()}
  ${btnEditar}
</div>`
```

---

## Restrições

1. **Não alterar** `_podeEditarSetor()`, `_carregarSetores()`, nem o CRUD de setores — já está correto.
2. **Não alterar** a lógica de `_podeEditar()` (usada para membros) — permanece `_isGestor() || _isLider()`.
3. O campo `#mm-conselheiro` permanece editável por todos que podem abrir o form (admin e supervisor).
4. O campo `#mm-coordenador` permanece editável por admin e supervisor.
5. `_badgePapel()` deve ser uma função local dentro de `minMinAbrir()` (não exposta globalmente).
6. Não usar `innerHTML` de forma insegura — todos os dados de usuário/ministério passam por `escapeHtml()`.

---

## Validação esperada

1. **Admin Geral** vê "+ Novo Ministério" na lista e pode editar todos os campos incluindo Supervisor.
2. **CONSELHO / PASTORAL / ADM_OPERACIONAL** NÃO veem "+ Novo Ministério" e NÃO veem botão Editar.
3. **Supervisor do ministério** (pessoa_id === ministério.supervisor) vê botão "✏️ Editar", abre o form SEM o campo Supervisor (oculto), pode alterar nome/tipo/descrição/coordenador.
4. **Supervisor tentando alterar supervisor via API**: o payload nunca inclui `supervisor` — protegido em `_mmSalvar()`.
5. Badge correto aparece no detalhe: "Admin Geral", "Supervisor", "Coordenador" ou nenhum.
6. Setores: comportamento inalterado — admin e supervisor do ministério podem criar/editar/excluir.

---

## Arquivos a alterar

| Arquivo | Ação |
|---------|------|
| `modules/departamentos/ministerios.js` | Alterar (adicionar helpers + ajustar guards + payload) |

Nenhum outro arquivo precisa ser alterado.

---

## Commit

```
git add modules/departamentos/ministerios.js
git commit -m "feat: refina hierarquia de permissões ministeriais (v6.30.32)"
```
