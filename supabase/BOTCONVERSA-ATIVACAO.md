# WhatsApp SIPEN via BotConversa — Guia de Ativação

Integração sem VPS, sem Docker, sem servidor próprio.
O BotConversa gerencia a conexão com o WhatsApp Business API (Meta-oficial).

---

## Por que BotConversa no lugar da Evolution API?

| Critério             | Evolution API         | BotConversa           |
|----------------------|-----------------------|-----------------------|
| Infraestrutura       | VPS/Docker obrigatório | Nenhuma — SaaS        |
| Custo de servidor    | R$ 30–100/mês         | Zero                  |
| Risco de ban         | Alto (unofficial)     | Zero (Meta-oficial)   |
| Configuração         | Complexa              | 3 cliques             |
| Confiabilidade       | Depende do servidor   | Alta disponibilidade  |

---

## ETAPA 1 — Criar conta no BotConversa

1. Acesse **https://botconversa.com.br** e crie uma conta
2. Conecte seu número WhatsApp Business:
   - No painel, vá em **Configurações → WhatsApp**
   - Siga o fluxo de conexão oficial (Meta Business)
   - Seu número será verificado pela Meta
3. Anote a **Webhook Integration Key**:
   - Painel BotConversa → **Configurações → Integrações → Webhook Integration**
   - Clique em **"Copiar chave"**

> **Plano necessário**: O plano gratuito pode ter limitações de envio.
> Para uso em produção (mensagens a membros), verifique os limites do plano escolhido.

---

## ETAPA 2 — Configurar o Supabase

### 2.1 — Executar o SQL de migração

Acesse **https://supabase.com/dashboard** → seu projeto → **SQL Editor**

Execute o arquivo:
```
supabase/patches/botconversa-migration.sql
```
(copie o conteúdo e cole no SQL Editor, depois clique em Run)

### 2.2 — Adicionar o secret da API

No Supabase Dashboard:
- Vá em **Settings → Edge Functions → Secrets**
- Clique em **"Add new secret"**

| Nome                   | Valor                        |
|------------------------|------------------------------|
| `BOTCONVERSA_API_KEY`  | Sua Webhook Integration Key  |

> **Opcional:** Se o endpoint da API for diferente do padrão, adicione também:
> - Nome: `BOTCONVERSA_API_URL`
> - Valor: URL do endpoint (verifique no Swagger: backend.botconversa.com.br/swagger)

### 2.3 — Fazer deploy das Edge Functions

Execute no terminal (uma vez):
```bash
brew install supabase/tap/supabase   # se ainda não instalado
supabase login
supabase link --project-ref erhwryfzpycahgsohhbh
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-status
```

---

## ETAPA 3 — Verificar no SIPEN

1. Acesse o SIPEN e faça login
2. No menu lateral: **Sistema → WhatsApp**
3. O painel deve mostrar:
   - **Conexão**: 🟢 Configurado
   - **Provedor**: BotConversa
4. Clique em **"Enviar Teste"**, informe seu número e envie
5. Se a mensagem chegar: tudo funcionando

---

## Endpoint da API (para referência técnica)

O SIPEN usa por padrão:
```
POST https://backend.botconversa.com.br/api/v1/webhooks/send-message/
Headers:
  api-key: {BOTCONVERSA_API_KEY}
  Content-Type: application/json
Body:
  { "phone": "5511999999999", "message": "texto" }
```

> **Importante:** Verifique o endpoint exato no Swagger da sua conta
> (backend.botconversa.com.br/swagger → autorize com sua chave → localize o endpoint de envio).
> Se for diferente, configure via secret `BOTCONVERSA_API_URL`.

---

## Janela de 24 horas (limitação do WhatsApp Business API)

O WhatsApp Business API (Meta) tem uma regra importante:
- Mensagens **dentro de 24h** após o membro ter falado com o número: **livres**
- Mensagens **fora da janela de 24h**: precisam usar **templates aprovados pela Meta**

Para contornar isso na IPPenha:
1. Peça aos membros que mandem uma mensagem para o número WhatsApp do SIPEN (ex: "Olá")
2. Isso abre a janela de 24h para comunicações livres
3. Para lembretes automáticos (eventos, pautas), crie templates no BotConversa e aguarde aprovação da Meta (~24h)

---

## Como integrar um módulo futuro

Em qualquer módulo do SIPEN:
```javascript
await WA.send({
  para:        membro.telefone,
  nome:        membro.nome,
  mensagem:    "Sua solicitação foi recebida.",
  modulo:      "DEMANDAS",
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
    data: "22/06", hora: "19h"
  });
  await WA.send({ para: membro.telefone, nome: membro.nome, mensagem: msg, modulo: "AGENDA" });
}
```

---

## Resumo do status

| Componente                          | Status               |
|-------------------------------------|----------------------|
| Painel WhatsApp no SIPEN            | ✅ Pronto            |
| Edge Function whatsapp-send         | ✅ BotConversa       |
| Edge Function whatsapp-status       | ✅ BotConversa       |
| Histórico de mensagens              | ✅ Pronto            |
| Templates de mensagem               | ✅ Pronto            |
| Módulos integráveis (via WA.send)   | ✅ Pronto            |
| Conta BotConversa                   | ⚠️ Criar (Etapa 1)  |
| Secret BOTCONVERSA_API_KEY          | ⚠️ Configurar (2.2) |
| Deploy das Edge Functions           | ⚠️ Executar (2.3)   |
| SQL de migração                     | ⚠️ Executar (2.1)   |
