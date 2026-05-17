# WhatsApp SIPEN — Guia de Ativação Completo

O SIPEN já tem todo o código pronto. Você precisa executar 3 etapas.

---

## ETAPA 1 — Criar conta na Evolution API Cloud

A Evolution API Cloud é a solução mais simples: sem VPS, sem Docker, sem servidor.

### 1.1 — Criar conta
Acesse: https://app.evolution-api.com
Crie uma conta gratuita (plano gratuito permite 1 instância).

### 1.2 — Criar instância
Dentro do painel, clique em **"Nova Instância"**.
- Nome da instância: `ippenha` (ou qualquer nome, sem espaços)
- Anote o nome que você escolheu — precisará dele depois.

### 1.3 — Conectar o WhatsApp (escanear QR Code)
Após criar a instância, clique nela e depois em **"Conectar"**.
Um QR Code aparecerá na tela.
- Abra o WhatsApp no celular que será usado como remetente
- Vá em **Configurações > Dispositivos Conectados > Conectar Dispositivo**
- Escaneie o QR Code

Após escanear, o status muda para **"open"** (conectado).

### 1.4 — Coletar as credenciais
Você vai precisar de:
- **URL da API**: algo como `https://api.evolution-api.com` (aparece no painel deles)
- **API Key da instância**: clique na instância → "API Key" → copie
- **Nome da instância**: o nome que você digitou no passo 1.2

---

## ETAPA 2 — Configurar o Supabase

### 2.1 — Executar os SQLs no banco

Acesse: https://supabase.com/dashboard → seu projeto → **SQL Editor**

Execute os seguintes arquivos, nesta ordem:

**Arquivo 1:** `supabase/migrations/supabase-whatsapp.sql`
(copie o conteúdo do arquivo e cole no SQL Editor, depois clique em Run)

**Arquivo 2:** `supabase/patches/whatsapp-rls-fix.sql`
(idem — copie e cole, depois Run)

### 2.2 — Adicionar o Secret da Evolution API

No Supabase Dashboard:
- Vá em **Settings → Edge Functions → Secrets**
- Clique em **"Add new secret"**
- Nome: `EVOLUTION_API_KEY`
- Valor: a API Key copiada no passo 1.4
- Salvar

### 2.3 — Fazer deploy das Edge Functions

Você precisa instalar o Supabase CLI no seu computador (uma vez):
```
brew install supabase/tap/supabase
```

Depois, na pasta raiz do projeto SIPEN (`/Users/air/Desktop/desenvolvimento/sipen`), execute:
```
supabase login
supabase link --project-ref erhwryfzpycahgsohhbh
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-status
```

> O `project-ref` é o ID do seu projeto Supabase.
> Aparece na URL do dashboard: `supabase.com/dashboard/project/AQUI`

---

## ETAPA 3 — Configurar no SIPEN

Após as etapas acima, acesse o SIPEN normalmente:

1. Faça login
2. No menu lateral, role até **Sistema → WhatsApp**
3. Na seção **"Instância Evolution API"**, preencha:
   - **URL da API**: cole a URL da Evolution API (ex: `https://api.evolution-api.com`)
   - **Nome da Instância**: cole o nome que você definiu (ex: `ippenha`)
4. Clique em **"Salvar Configuração"**
5. Clique em **"↻ Atualizar"** — o status deve mudar para 🟢 Conectado
6. Clique em **"Enviar Teste"**, informe seu próprio número e envie

Se a mensagem chegar no celular: **tudo funcionando**.

---

## Resumo do que foi entregue

| Componente | Status |
|---|---|
| Painel WhatsApp no SIPEN | ✅ Pronto |
| Tabelas no banco (histórico, templates, config) | ✅ Pronto |
| Edge Function `whatsapp-send` (proxy seguro) | ✅ Pronto |
| Edge Function `whatsapp-status` | ✅ Pronto |
| Integração futura (Agenda, Demandas, Membresia, etc.) | ✅ Pronto via `WA.send()` |
| SQL do banco | ⚠️ Execute o passo 2.1 |
| Deploy das Edge Functions | ⚠️ Execute o passo 2.3 |
| Conta na Evolution API | ⚠️ Execute o passo 1 |

---

## Como integrar qualquer módulo futuro

Em qualquer módulo do SIPEN, para enviar uma mensagem:

```javascript
await WA.send({
  para:        membro.telefone,      // número com DDD
  nome:        membro.nome,          // nome do destinatário
  mensagem:    "Sua solicitação foi recebida.",
  modulo:      "DEMANDAS",           // módulo de origem
  referenciaT: "demanda",
  referenciaId: demanda.id
});
```

Com template:
```javascript
const tpl = await WA.buscarTemplate("LEMBRETE_EVENTO");
if (tpl) {
  const msg = WA.renderTemplate(tpl.corpo, {
    nome: membro.nome,
    evento: "Culto de Ação de Graças",
    data: "22/06",
    hora: "19h"
  });
  await WA.send({ para: membro.telefone, nome: membro.nome, mensagem: msg, modulo: "AGENDA" });
}
```

O envio é registrado automaticamente no histórico e pode ser consultado no painel.

---

## Dados que você precisa fornecer

| Dado | Onde pegar | Onde colocar |
|---|---|---|
| URL da API Evolution | Painel da Evolution API Cloud | SIPEN → Configurações → WhatsApp |
| Nome da instância | Você escolhe ao criar | SIPEN → Configurações → WhatsApp |
| API Key | Painel da Evolution API Cloud | Supabase → Settings → Secrets → EVOLUTION_API_KEY |
