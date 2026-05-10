# Deploy WhatsApp / Evolution API

## 1. Banco de dados
Execute no Supabase Dashboard > SQL Editor:
```
supabase-whatsapp.sql
```

## 2. Secret da Evolution API
No terminal (com Supabase CLI instalado):
```bash
supabase secrets set EVOLUTION_API_KEY=sua_chave_aqui
```
Ou pelo Dashboard > Settings > Edge Functions > Secrets.

## 3. Deploy das Edge Functions
```bash
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-status
```

## 4. Configurar instância no banco
Após executar o SQL, inserir os dados reais da instância:
```sql
INSERT INTO whatsapp_config (instance_name, api_url)
VALUES ('ippenha', 'https://evo.seudominio.com.br');
```

## 5. Teste via curl
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/whatsapp-send \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"para_numero":"5511999999999","mensagem":"Teste SIPEN","modulo":"COMUNICACAO"}'
```

## Uso em qualquer módulo JS do SIPEN
```javascript
// Envio simples
await WA.send({
  para:      membro.telefone,
  nome:      membro.nome,
  mensagem:  "Olá! Sua solicitação foi recebida.",
  modulo:    "DEMANDAS",
  referenciaT:  "demanda",
  referenciaId: demanda.id
})

// Com template
const tpl = await WA.buscarTemplate("LEMBRETE_EVENTO")
if (tpl) {
  const msg = WA.renderTemplate(tpl.corpo, { nome: membro.nome, data: "10/06", hora: "19h" })
  await WA.send({ para: membro.telefone, nome: membro.nome, mensagem: msg, modulo: "AGENDA" })
}

// Status da instância
const s = await WA.status()
console.log(s.conectado, s.estado) // true, "open"
```
