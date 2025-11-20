<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1f0Cbr_s0R3fkEsDhWbgX1gAVTCgekrQE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Integração WhatsApp (Z-API)

A mesma mecânica de edição agora pode ser usada via WhatsApp usando sua instância do Z-API.

1. Configure variáveis de ambiente no deploy/terminal:
   - `OPENROUTER_API_KEY` (ou `API_KEY`)
   - `ZAPI_INSTANCE_ID`
   - `ZAPI_TOKEN`
   - `ZAPI_CLIENT_TOKEN`
2. Suba o servidor (`npm start`) com uma URL HTTPS acessível publicamente (o Z-API exige HTTPS para webhooks).
3. Aponte o webhook de recebimento do Z-API para `https://sua-url.com/api/whatsapp/webhook`, exemplo:
   ```bash
   curl -X PUT "https://api.z-api.io/instances/$ZAPI_INSTANCE_ID/token/$ZAPI_TOKEN/update-webhook-received" \
     -H "Client-Token: $ZAPI_CLIENT_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"value\": \"https://sua-url.com/api/whatsapp/webhook\"}"
   ```
4. Uso pelo WhatsApp:
   - Envie uma foto para o número conectado ao Z-API.
   - Envie o texto do que quer mudar (ex.: “trocar fundo para Paris”, “colocar terno azul”, “carro esportivo ao lado”).
   - O bot responde com a imagem editada usando o mesmo modelo/prompt da versão web.
