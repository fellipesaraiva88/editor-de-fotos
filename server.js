import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleZapiWebhook } from './services/whatsappBot.js';

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

// Handle SPA routing - all routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
