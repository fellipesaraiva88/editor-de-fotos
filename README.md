# Bot de IA para geração/edição de fotos no WhatsApp

Repositório dedicado ao bot que recebe fotos pelo WhatsApp, aplica edições/pedidos em linguagem natural via Gemini (OpenRouter) e responde com a imagem pronta usando sua instância do Z-API.

## O que ele faz
- Recebe uma foto e um prompt (“trocar fundo para Paris”, “colocar terno azul”, “carro esportivo ao lado”, “estilo cyberpunk”).
- Mantém o rosto fiel (protocolo de identidade) e aplica o pedido na imagem.
- Envia variações quando o usuário manda novos textos, reaproveitando a mesma foto por 30 minutos.
- UX pronta para WhatsApp: mensagens de onboarding, botões e respostas amigáveis.

## Stack
- Node.js + Express para o webhook em `/api/whatsapp/webhook`.
- OpenRouter (Gemini 2.5 Image) para geração/edição.
- Z-API para envio/recebimento das mensagens e mídia no WhatsApp.

## Pré-requisitos
- Node.js 18+
- Chave da OpenRouter (`OPENROUTER_API_KEY` ou `API_KEY`)
- Instância do Z-API (instance_id, token e client_token)
- URL pública HTTPS (pode usar túnel como `ngrok`/`cloudflared` ou um deploy)

## Configuração rápida
1) Instale dependências:
```
npm install
```
2) Copie e preencha as variáveis:
```
cp .env.example .env
# Edite .env com OPENROUTER_API_KEY, ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN, PORT (opcional)
```
3) Suba o servidor:
```
npm start
```
4) Aponte o webhook do Z-API para o endpoint do servidor:
```bash
curl -X PUT "https://api.z-api.io/instances/$ZAPI_INSTANCE_ID/token/$ZAPI_TOKEN/update-webhook-received" \
  -H "Client-Token: $ZAPI_CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"value\": \"https://sua-url.com/api/whatsapp/webhook\"}"
```

## Como usar no WhatsApp
1. Envie uma foto para o número conectado ao Z-API.  
2. Envie o texto do que deseja (ex.: “estilo golden hour”, “colocar Porsche vermelho ao lado”, “fundo na Times Square”).  
3. O bot responde com a imagem editada. Envie novos textos para variações; envie nova foto para reiniciar.

## Estrutura principal
- `server.js` – webhook Express e serve estático (quando houver build web).  
- `services/whatsappBot.js` – fluxo das mensagens, sessões e menus rápidos.  
- `services/geminiNodeService.js` – chamada ao modelo de imagem no OpenRouter.  
- `services/zapiClient.js` – cliente mínimo para envio de texto/imagem/botões no Z-API.

## Scripts úteis
- `npm start` – inicia o servidor do bot (usa `dist/` se você quiser expor a UI).  
- `npm run dev` – inicia a UI de debug/vitrine (opcional; foco do repo é o bot).  
- `npm run build` – build da UI (executado também no postinstall).

## Observações
- Sessões de foto expiram após 30 minutos sem atividade.  
- O modelo retorna imagens em base64; o bot envia no WhatsApp como mídia normal.  
- Configure `OPENROUTER_REFERER` se sua conta na OpenRouter exigir domínio específico.  
- Para produção, mantenha a URL HTTPS estável para não precisar reconfigurar o webhook.
