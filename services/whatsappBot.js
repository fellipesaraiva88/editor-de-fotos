import { generateEditedImageFromBuffer } from './geminiNodeService.js';
import { sendImageMessage, sendTextMessage } from './zapiClient.js';

const sessionStore = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const cleanupSessions = () => {
  const now = Date.now();
  for (const [phone, session] of sessionStore.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessionStore.delete(phone);
    }
  }
};

const downloadImage = async (url, fallbackMime) => {
  const headers = {};
  if (process.env.ZAPI_CLIENT_TOKEN) {
    headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get('content-type') || fallbackMime || 'image/jpeg';
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
};

const normalizePhone = (payload) => {
  const phone =
    payload?.phone ||
    payload?.participantPhone ||
    payload?.senderPhone ||
    payload?.from ||
    '';

  return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
};

const extractPrompt = (payload) => {
  const text = payload?.text?.message || '';
  const caption = payload?.image?.caption || '';
  return (caption || text || '').trim();
};

const getHotspot = () => ({ x: 512, y: 512 }); // Centro padrão

const processEdit = async ({ phone, prompt, replyTo }) => {
  const session = sessionStore.get(phone);
  if (!session) {
    await sendTextMessage(
      phone,
      'Me envie uma foto primeiro. Depois mande o texto do que deseja mudar.',
      { messageId: replyTo }
    );
    return;
  }

  try {
    await sendTextMessage(
      phone,
      'Recebi! Editando sua foto agora, já te envio o resultado 🚀',
      { messageId: replyTo, delayTyping: 3 }
    );

    const editedImage = await generateEditedImageFromBuffer(
      session.buffer,
      session.mimeType,
      prompt,
      session.hotspot || getHotspot()
    );

    await sendImageMessage(
      phone,
      editedImage,
      'Pronto! Se quiser outra variação, mande outro texto.',
      { messageId: replyTo }
    );
  } catch (error) {
    console.error('Falha ao processar edição', error);
    await sendTextMessage(
      phone,
      'Não consegui editar sua foto agora. Tente novamente em alguns segundos.',
      { messageId: replyTo }
    );
  }
};

export const handleZapiWebhook = async (payload) => {
  cleanupSessions();

  if (!payload || payload.fromMe) return;

  const phone = normalizePhone(payload);
  if (!phone) return;

  const prompt = extractPrompt(payload);
  const replyTo = payload?.messageId || undefined;
  const hasImage = Boolean(payload?.image?.imageUrl);

  if (hasImage) {
    try {
      const { buffer, mimeType } = await downloadImage(
        payload.image.imageUrl,
        payload.image.mimeType
      );

      sessionStore.set(phone, {
        buffer,
        mimeType,
        hotspot: getHotspot(),
        updatedAt: Date.now(),
      });

      if (prompt) {
        await processEdit({ phone, prompt, replyTo });
      } else {
        await sendTextMessage(
          phone,
          'Foto recebida! Agora me diga o que fazer (ex: trocar fundo para Paris, colocar terno, carro esportivo, etc).',
          { messageId: replyTo }
        );
      }
    } catch (error) {
      console.error('Erro ao baixar imagem', error);
      await sendTextMessage(
        phone,
        'Não consegui baixar sua foto. Envie novamente ou tente outro arquivo.',
        { messageId: replyTo }
      );
    }
    return;
  }

  if (prompt) {
    await processEdit({ phone, prompt, replyTo });
    return;
  }

  await sendTextMessage(
    phone,
    'Envie uma foto e depois escreva a instrução do que quer mudar nela.',
    { messageId: replyTo }
  );
};
