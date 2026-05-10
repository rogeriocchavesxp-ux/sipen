# Codex — Completar Arquitetura SIPEN

## Contexto do projeto

SIPEN é um sistema de gestão de igreja (IPPenha) construído em **JavaScript vanilla + HTML + CSS**, sem framework nem bundler. Backend é **Supabase** (REST API). Deploy é servir os arquivos estáticos diretamente.

A arquitetura foi parcialmente refatorada. Este prompt descreve o que **ainda falta implementar**.

### Estrutura atual

```
sipen/
├── index.html              (562 linhas — shell HTML puro)
├── sipen.css
├── core/
│   ├── router.js           (navegação: go, tog, T, MC, CRUMB, VIEW_AUTOLOAD)
│   ├── api.js              (Supabase layer + utilitários: escapeHtml, spinner, T, openCrudForm)
│   ├── auth.js             (login, permissões, USUARIO_ATUAL)
│   └── init.js             (session restore, sidebar toggle, carrega modals.html via XHR)
├── modules/
│   ├── agenda-core.js
│   ├── atas.js
│   ├── cnab.js
│   ├── config-whatsapp.js
│   ├── congregacoes-data.js
│   ├── congregacoes.js
│   ├── contratos.js
│   ├── demandas.js
│   ├── dept-admin.js
│   ├── estacionamento-controles.js
│   ├── financeiro.js
│   ├── membresia-core.js
│   ├── membresia.js
│   ├── ministerios.js
│   ├── pastoral.js
│   ├── pessoas-externas.js
│   ├── projetos.js
│   ├── rede-cuidado.js
│   └── whatsapp.js
├── views/
│   ├── main.html           (3.671 linhas — HTML de TODOS os módulos num arquivo só)
│   └── modals.html
└── pages/, scripts/, supabase/, logs/
```

---

## Tarefas a executar

### Tarefa 1 — Separar `core/ui.js`

Extrair de `core/api.js` as funções puramente de interface e colocar em `core/ui.js`:

- `T(t, s)` — toast notification
- `escapeHtml(v)` — sanitização HTML
- `escapeHtmlAttr(v)` — sanitização de atributos
- `safeJsonForHtml(obj)` — serialização segura para onclick
- `spinner()` — HTML do spinner animado
- `openModal()` / `closeModal()` / `submitTask()` — modal de nova tarefa
- `openCrudForm(tab, preset)` — formulário CRUD genérico
- `salvarRegistro(tab, recordId)` — salva form CRUD
- `deletarRegistro(tab, recordId)` — exclui registro
- Injeção do `@keyframes spin` via `styleEl`

Após extrair, remover essas funções de `core/api.js` e adicionar em `index.html`:
```html
<script src="core/ui.js"></script>
```
**antes** de `<script src="core/api.js"></script>`.

Verificar que `core/api.js` não chama nenhuma das funções movidas diretamente no corpo do arquivo (apenas dentro de funções, o que é permitido pois estarão disponíveis globalmente em runtime).

---

### Tarefa 2 — Reorganizar `modules/` em subpastas por domínio

Mover cada arquivo JS para uma subpasta com nome do domínio e renomear para `index.js`:

| Arquivo atual | Destino |
|---|---|
| `modules/agenda-core.js` | `modules/agenda/index.js` |
| `modules/atas.js` | `modules/conselho/atas.js` |
| `modules/cnab.js` | `modules/financeiro/cnab.js` |
| `modules/config-whatsapp.js` | `modules/whatsapp/config.js` |
| `modules/congregacoes-data.js` | `modules/congregacoes/data.js` |
| `modules/congregacoes.js` | `modules/congregacoes/index.js` |
| `modules/contratos.js` | `modules/juridico/contratos.js` |
| `modules/demandas.js` | `modules/demandas/index.js` |
| `modules/dept-admin.js` | `modules/departamentos/admin.js` |
| `modules/estacionamento-controles.js` | `modules/admin/estacionamento-controles.js` |
| `modules/financeiro.js` | `modules/financeiro/index.js` |
| `modules/membresia-core.js` | `modules/membresia/core.js` |
| `modules/membresia.js` | `modules/membresia/index.js` |
| `modules/ministerios.js` | `modules/departamentos/ministerios.js` |
| `modules/pastoral.js` | `modules/pastoral/index.js` |
| `modules/pessoas-externas.js` | `modules/admin/pessoas-externas.js` |
| `modules/projetos.js` | `modules/projetos/index.js` |
| `modules/rede-cuidado.js` | `modules/pastoral/rede-cuidado.js` |
| `modules/whatsapp.js` | `modules/whatsapp/index.js` |

Use `git mv` para preservar histórico em todos os arquivos.

Após mover, atualizar os `<script src="...">` no `index.html` com os novos caminhos.

**Atenção:** `congregacoes.js` importa dados de `congregacoes-data.js` via variável global. Não há `import/require` entre eles — é compartilhamento por escopo global. Não alterar essa lógica, apenas mover os arquivos.

---

### Tarefa 3 — Quebrar `views/main.html` em `modules/*/view.html`

Este é o principal. `views/main.html` tem 3.671 linhas contendo os `<div class="view" id="v-xxx">` de todos os módulos.

#### Mapeamento de views por módulo

Cada `<div class="view" id="v-PREFIXO-*">` pertence a um módulo. O arquivo de view deve conter **todas** as divs com aquele prefixo, sem a div wrapper externa (o router já injeta no `#page`).

| Prefixo dos IDs | Arquivo destino |
|---|---|
| `v-geral` | `modules/dashboard/view.html` |
| `v-admin-*`, `v-pext-*`, `v-admin-pessoas` | `modules/admin/view.html` |
| `v-fin-*`, `v-cnab-*` | `modules/financeiro/view.html` |
| `v-jur-*` | `modules/juridico/view.html` |
| `v-conselho-*`, `v-atas-*` | `modules/conselho/view.html` |
| `v-pastoral-*` | `modules/pastoral/view.html` |
| `v-min-*` | `modules/departamentos/view.html` |
| `v-agenda-*` | `modules/agenda/view.html` |
| `v-pgs-*` | `modules/pgs/view.html` |
| `v-infra-*` | `modules/infraestrutura/view.html` |
| `v-dem-*` | `modules/demandas/view.html` |
| `v-rel-*` | `modules/relatorios/view.html` |
| `v-memb-*` | `modules/membresia/view.html` |
| `v-proj-*` | `modules/projetos/view.html` |
| `v-diac-*` | `modules/diaconal/view.html` |
| `v-cong-*` | `modules/congregacoes/view.html` |
| `v-area-*` | `modules/area-membro/view.html` |
| `v-config-*` | `modules/config/view.html` |
| `v-generic` | `modules/shared/view.html` |

#### Como identificar os limites de cada div

Cada view começa com `<div class="view" id="v-NOME">` e termina com o `</div>` correspondente de fechamento. Use parser de indentação ou busca por `</div>` no mesmo nível. O arquivo `views/main.html` usa indentação de 2 espaços; as views estão todas no primeiro nível de indentação.

#### Como o router deve carregar as views

Atualmente `core/init.js` carrega `views/main.html` inteiro via XHR síncrono na inicialização. Após esta tarefa, o carregamento deve ser **lazy e assíncrono** — apenas quando o módulo é acessado pela primeira vez.

Atualizar a função `go(id)` em `core/router.js` para:

```javascript
const _viewCache = {};
const _VIEW_MAP = {
  "geral":       "modules/dashboard/view.html",
  "admin":       "modules/admin/view.html",
  "fin":         "modules/financeiro/view.html",
  "cnab":        "modules/financeiro/view.html",
  "jur":         "modules/juridico/view.html",
  "conselho":    "modules/conselho/view.html",
  "atas":        "modules/conselho/view.html",
  "pastoral":    "modules/pastoral/view.html",
  "min":         "modules/departamentos/view.html",
  "agenda":      "modules/agenda/view.html",
  "pgs":         "modules/pgs/view.html",
  "infra":       "modules/infraestrutura/view.html",
  "dem":         "modules/demandas/view.html",
  "rel":         "modules/relatorios/view.html",
  "memb":        "modules/membresia/view.html",
  "proj":        "modules/projetos/view.html",
  "diac":        "modules/diaconal/view.html",
  "cong":        "modules/congregacoes/view.html",
  "area":        "modules/area-membro/view.html",
  "config":      "modules/config/view.html",
};

async function _ensureViewLoaded(id) {
  const prefix = id.split("-")[0];
  const viewFile = _VIEW_MAP[prefix] || _VIEW_MAP["geral"];
  if (_viewCache[viewFile]) return;
  const html = await fetch(viewFile).then(r => r.text());
  document.getElementById("page").insertAdjacentHTML("beforeend", html);
  _viewCache[viewFile] = true;
}
```

Chamar `await _ensureViewLoaded(id)` no início da função `go(id)` antes de manipular as classes `.on`.

#### Remover o carregamento síncrono de main.html

Em `core/init.js`, remover o bloco:
```javascript
var xhr = new XMLHttpRequest();
xhr.open("GET", "views/main.html?v=6.30.30", false);
xhr.send(null);
if (xhr.status >= 200 && xhr.status < 300) mount.innerHTML = xhr.responseText;
```

Substituir por uma chamada assíncrona que carrega apenas a view inicial (`geral`):
```javascript
_ensureViewLoaded("geral").then(() => go("geral"));
```

O arquivo `views/main.html` pode ser mantido como backup durante a transição, mas não deve mais ser carregado.

---

## Restrições importantes

1. **Não alterar lógica** — apenas mover/reorganizar código. Nenhuma função deve ser modificada.
2. **Preservar escopo global** — todas as funções expostas via `window.*` ou declaradas no escopo global devem continuar acessíveis globalmente após a extração.
3. **Usar `git mv`** para mover arquivos JS (preserva histórico).
4. **Testar após cada tarefa** — o projeto deve funcionar em `http://localhost:3000` após cada etapa. Usar `npx serve . -p 3000` para servir.
5. **Não instalar dependências** — zero npm packages novos.
6. **Não alterar `sipen.css`**, `views/modals.html`, `pages/`, `scripts/`, `supabase/`.
7. **Commit após cada tarefa** com mensagem descritiva.

---

## Ordem de execução recomendada

1. Tarefa 1 (extrair ui.js) — menor risco, sem dependências externas
2. Tarefa 2 (subpastas modules/) — mover arquivos + atualizar index.html
3. Tarefa 3 (quebrar main.html + router lazy) — maior risco, fazer por último

---

## Validação final esperada

Estrutura ao concluir:

```
sipen/
├── index.html
├── sipen.css
├── core/
│   ├── router.js
│   ├── api.js
│   ├── ui.js         ← novo
│   ├── auth.js
│   └── init.js
└── modules/
    ├── agenda/
    │   ├── index.js
    │   └── view.html
    ├── admin/
    │   ├── estacionamento-controles.js
    │   ├── pessoas-externas.js
    │   └── view.html
    ├── area-membro/
    │   └── view.html
    ├── config/
    │   └── view.html
    ├── congregacoes/
    │   ├── data.js
    │   ├── index.js
    │   └── view.html
    ├── conselho/
    │   ├── atas.js
    │   └── view.html
    ├── dashboard/
    │   └── view.html
    ├── demandas/
    │   ├── index.js
    │   └── view.html
    ├── departamentos/
    │   ├── admin.js
    │   ├── ministerios.js
    │   └── view.html
    ├── diaconal/
    │   └── view.html
    ├── financeiro/
    │   ├── cnab.js
    │   ├── index.js
    │   └── view.html
    ├── infraestrutura/
    │   └── view.html
    ├── juridico/
    │   ├── contratos.js
    │   └── view.html
    ├── membresia/
    │   ├── core.js
    │   ├── index.js
    │   └── view.html
    ├── pastoral/
    │   ├── index.js
    │   ├── rede-cuidado.js
    │   └── view.html
    ├── pgs/
    │   └── view.html
    ├── projetos/
    │   ├── index.js
    │   └── view.html
    ├── relatorios/
    │   └── view.html
    ├── shared/
    │   └── view.html
    └── whatsapp/
        ├── config.js
        └── index.js
```
