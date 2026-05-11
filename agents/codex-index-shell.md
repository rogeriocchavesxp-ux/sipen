# Codex — Reduzir index.html para ~80 linhas

## Contexto

O `index.html` tem 550 linhas. O objetivo é deixá-lo com ~80 linhas — apenas o shell mínimo necessário para inicializar o sistema. Todo o HTML de UI deve ser extraído para arquivos em `views/`.

---

## Estado atual do index.html

Seções presentes:

| Seção | Linhas | Destino |
|---|---|---|
| `<head>` | 1–14 | Fica em index.html |
| Login screen `<div id="login-screen">` | 15–38 | → `views/login.html` |
| Sidebar `<aside class="sb">` | 39–429 | → `views/sidebar.html` |
| Main shell `<main class="main">` | 430–450 | Fica em index.html (é o container) |
| Modal tarefa `<div class="mo" id="modal">` | 452–479 | → `views/modals.html` (já existe — **append**) |
| Toast `<div class="toast" id="toast">` | 480–484 | `T()` cria dinamicamente |
| Script tags | 485–550 | Fica em index.html |

---

## Tarefas

### Tarefa 1 — Extrair login para `views/login.html`

Mover o bloco completo:
```html
<!-- ════ LOGIN SCREEN ════════════════════════ -->
<div id="login-screen">
  ...
</div>
```
Para o novo arquivo `views/login.html` (sem comentário wrapper, só o `<div>`).

Em `core/init.js`, no bloco que roda no `DOMContentLoaded`, adicionar o carregamento síncrono:
```javascript
(function() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "views/login.html", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300)
    document.body.insertAdjacentHTML("afterbegin", xhr.responseText);
})();
```
Deve ser inserido **antes** de qualquer referência a elementos do login (antes do `DOMContentLoaded` listener existente).

---

### Tarefa 2 — Extrair sidebar para `views/sidebar.html`

Mover o bloco completo:
```html
<!-- ═══════════ SIDEBAR ═══════════════════════ -->
<aside class="sb">
  ...
</aside>
```
Para `views/sidebar.html` (incluindo o comentário e a tag `<aside>`).

Adicionar em `core/init.js` o carregamento síncrono, logo após o carregamento do login:
```javascript
(function() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "views/sidebar.html", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300)
    document.body.insertAdjacentHTML("afterbegin", xhr.responseText);
})();
```

**Atenção:** o `<div class="sb-backdrop" id="sb-backdrop" onclick="sbClose()"></div>` que aparece logo antes do `<main>` também deve ir para `views/sidebar.html`, junto com a `<aside>`.

---

### Tarefa 3 — Mover modal de tarefa para `views/modals.html`

O arquivo `views/modals.html` já existe e já é carregado por `core/init.js` via:
```javascript
var xhr = new XMLHttpRequest();
xhr.open("GET", "views/modals.html?v=6.30.3", false);
xhr.send(null);
if (xhr.status >= 200 && xhr.status < 300) document.body.insertAdjacentHTML("beforeend", xhr.responseText);
```

Mover o bloco abaixo do `index.html` para o **início** de `views/modals.html`:
```html
<!-- ════ MODAL NOVA TAREFA ════════════════════════════════ -->
<div class="mo" id="modal" onclick="if(event.target===this)closeModal()">
  ...
</div>
```

Não alterar o restante de `views/modals.html`.

---

### Tarefa 4 — Toast: criar dinamicamente em `core/ui.js`

Em vez de manter o toast como HTML estático no `index.html`, fazer a função `T()` em `core/ui.js` criar o elemento se ele não existir.

Substituir o início de `T(t, s)` por:
```javascript
function T(t, s) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.id = "toast";
    el.innerHTML = '<div id="toast-t"></div><div class="toast-s" id="toast-s"></div>';
    document.body.appendChild(el);
  }
  document.getElementById("toast-t").textContent = t;
  document.getElementById("toast-s").textContent = s || "";
  // ... resto da função permanece igual
```

Remover o bloco do toast do `index.html`:
```html
<!-- ════ TOAST ══════════════════════════════ -->
<div class="toast" id="toast">
  <div id="toast-t">Ação realizada</div>
  <div class="toast-s" id="toast-s"></div>
</div>
```

---

### Tarefa 5 — Resultado final do index.html

Após as 4 tarefas, o `index.html` deve ficar assim:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SIPEN v6.30.30 — Sistema Integrado da IPPenha</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<link rel="stylesheet" href="sipen.css?v=6.30.3">
</head>
<body>

<main class="main">
  <div class="topbar">
    <button class="sb-ham" id="sb-ham" onclick="sbToggle()">&#9776;</button>
    <div class="crumb" id="crumb">
      <span class="c-pg">Dashboard Geral</span>
      <span class="c-sub">/ IPPenha · visão executiva consolidada</span>
    </div>
    <div class="trr">
      <button class="tbt" onclick="T('WhatsApp','Serviço de notificações ativo — IPPenha')">◎ WhatsApp</button>
      <button class="tbt" onclick="openModal()">+ Nova Tarefa</button>
      <button class="tbt" onclick="T('3 alertas','Contratos a vencer e OS atrasadas')">🔔 3 <span class="ndot"></span></button>
    </div>
  </div>
  <div class="band" id="band" style="--mc:var(--gmd)"></div>
  <div class="page" id="page"></div>
</main>

<script src="core/router.js"></script>
<script src="core/ui.js"></script>
<script src="core/api.js"></script>
<script src="modules/admin/estacionamento-controles.js"></script>
<script src="core/auth.js"></script>
<script src="modules/pastoral/index.js"></script>
<script src="core/init.js"></script>

<!-- módulos de feature -->
<script src="modules/congregacoes/data.js?v=6.30.28"></script>
<script src="modules/congregacoes/index.js?v=6.30.28"></script>
<script src="modules/financeiro/index.js?v=6.30.17"></script>
<script src="modules/demandas/index.js?v=6.30.17"></script>
<script src="modules/juridico/contratos.js"></script>
<script src="modules/conselho/atas.js"></script>
<script src="modules/agenda/index.js?v=6.30.27"></script>
<script src="modules/membresia/core.js?v=6.30.3"></script>
<script src="modules/membresia/index.js"></script>
<script src="modules/departamentos/ministerios.js?v=2"></script>
<script src="modules/pastoral/rede-cuidado.js?v=1"></script>
<script src="modules/projetos/index.js?v=6.30.17"></script>
<script src="modules/admin/pessoas-externas.js?v=6.30.27"></script>
<script src="modules/financeiro/cnab.js?v=6.30.17"></script>
<script src="modules/whatsapp/index.js?v=6.30.30"></script>
<script src="modules/whatsapp/config.js?v=6.30.30"></script>
<script src="modules/departamentos/admin.js?v=6.30.30"></script>

</body>
</html>
```

---

## Restrições

1. **Não alterar lógica** — apenas mover HTML e adaptar `T()` para criação dinâmica.
2. **Carregamento síncrono** para login e sidebar — devem estar no DOM antes dos scripts de feature rodarem.
3. **Ordem de inserção no `<body>`:** login → sidebar → main (já existe) → conteúdo dinâmico.
4. Os `onclick` inline do sidebar e login (`doLogin()`, `tog()`, `go()`, `sbClose()`) continuam funcionando pois as funções são globais.
5. Testar após cada tarefa em `http://localhost:3000` — especialmente login, navegação e toast.
6. Commit após concluir todas as tarefas.

---

## Validação esperada

```
wc -l index.html  →  ~80 linhas
```

Arquivos novos/alterados:
- `views/login.html` (novo)
- `views/sidebar.html` (novo)
- `views/modals.html` (append do modal de tarefa no início)
- `core/ui.js` (T() com criação dinâmica do toast)
- `core/init.js` (carregamento de login.html e sidebar.html)
- `index.html` (~80 linhas)
