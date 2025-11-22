import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleZapiWebhook } from './services/whatsappBot.js';
import * as WooviService from './services/wooviService.js';
import * as UserService from './services/userService.js';
import { sendTextMessage } from './services/zapiClient.js';
import * as ResponseManager from './services/responseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON for webhooks and API calls
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// WhatsApp (Z-API) webhook endpoint
app.post('/api/whatsapp/webhook', async (req, res) => {
  res.status(200).json({ received: true });
  try {
    await handleZapiWebhook(req.body);
  } catch (error) {
    console.error('Erro ao processar webhook do Z-API', error);
  }
});

// Woovi (Pix) webhook endpoint
app.post('/api/woovi/webhook', async (req, res) => {
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    // Woovi sends an array of events or a single event object depending on configuration
    // We handle the 'event' object usually found in body.event or body directly
    const event = payload.event || payload;

    if (WooviService.validateWebhook(event)) {
      // correlationID format: phone-timestamp
      const correlationID = event.correlationID;
      if (correlationID) {
        const phone = correlationID.split('-')[0];
        if (phone) {
          // Add 1 credit
          UserService.addCredits(phone, 1);
          console.log(`Pagamento recebido para ${phone}. Crédito adicionado.`);

          // Notify user
          await sendTextMessage(phone, ResponseManager.getPaymentSuccess());
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar webhook do Woovi', error);
  }
});

// Handle SPA routing - all routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
