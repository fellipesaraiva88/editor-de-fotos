/**
 * Minimal Z-API client for sending messages back to WhatsApp.
 */

const getConfig = () => {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) {
    throw new Error(
      'Configure ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN para usar o bot do WhatsApp.'
    );
  }

  const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const commonHeaders = {
    'Content-Type': 'application/json',
    'Client-Token': clientToken,
  };

  return { baseUrl, commonHeaders };
};

export const sendTextMessage = async (phone, message, options = {}) => {
  const { baseUrl, commonHeaders } = getConfig();
  const payload = {
    phone,
    message,
    ...(options.delayMessage && { delayMessage: options.delayMessage }),
    ...(options.delayTyping && { delayTyping: options.delayTyping }),
    ...(options.messageId && { messageId: options.messageId }),
  };

  const response = await fetch(`${baseUrl}/send-text`, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar texto pelo Z-API: ${response.status} ${detail}`);
  }

  return response.json();
};

export const sendImageMessage = async (phone, imageDataUrl, caption, options = {}) => {
  const { baseUrl, commonHeaders } = getConfig();

  const payload = {
    phone,
    image: imageDataUrl,
    caption,
    viewOnce: false,
    ...(options.messageId && { messageId: options.messageId }),
  };

  const response = await fetch(`${baseUrl}/send-image`, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar imagem pelo Z-API: ${response.status} ${detail}`);
  }

  return response.json();
};
