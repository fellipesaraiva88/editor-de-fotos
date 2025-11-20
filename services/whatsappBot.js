import { generateEditedImageFromBuffer } from './geminiNodeService.js';
import { sendButtonActions, sendImageMessage, sendTextMessage } from './zapiClient.js';

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

const isGreetingOrHelp = (text) => {
  const normalized = text.toLowerCase();
  return [
    'oi',
    'ola',
    'olá',
    'hey',
    'eae',
    'fala',
    'bom dia',
    'boa tarde',
    'boa noite',
    'menu',
    'ajuda',
    'como funciona',
    'tutorial',
  ].some((kw) => normalized.includes(kw));
};

const friendlyIntro = () =>
  [
    'Oi! Eu sou o estúdio de IA que edita sua foto via WhatsApp 👋',
    'Como funciona:',
    '1) Me mande uma foto',
    '2) Diga o que quer (ex: fundo Paris, colocar terno, carro esportivo ao lado, estilo cyberpunk, filtro golden hour)',
    '3) Eu devolvo a versão editada e você pode pedir variações',
  ].join('\n');

const sendMenuButtons = async (phone, replyTo) => {
  const buttons = [
    { id: 'send_photo', text: 'Enviar foto', type: 'REPLY' },
    { id: 'ideas', text: 'Ideias de edição', type: 'REPLY' },
    { id: 'cars', text: 'Ver carros/luxo', type: 'REPLY' },
  ];

  try {
    await sendButtonActions(
      phone,
      'Escolha uma opção rápida ou mande sua mensagem:',
      buttons
    );
    } catch (error) {
      console.error('Falha ao enviar botões', error);
      await sendTextMessage(
        phone,
        'Você pode: 1) Enviar foto 2) Pedir ideias 3) Pedir veículo/luxo.',
        { messageId: replyTo }
      );
    }
  };

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
  const hasAudio = Boolean(payload?.audio?.audioUrl);
  const hasSession = sessionStore.has(phone);

  if (hasAudio) {
    await sendTextMessage(
      phone,
      'Recebi seu áudio! Para editar a foto, me mande em texto o que você quer que eu faça ou envie uma foto nova.',
      { messageId: replyTo }
    );
    await sendMenuButtons(phone, replyTo);
    return;
  }

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
      await sendMenuButtons(phone, replyTo);
      return;
    }

    if (prompt) {
      if (isGreetingOrHelp(prompt) && !hasSession) {
        await sendTextMessage(phone, friendlyIntro(), { messageId: replyTo });
        await sendMenuButtons(phone, replyTo);
        return;
      }

      if (!hasSession) {
        await sendTextMessage(
          phone,
          `${friendlyIntro()}\n\nPode mandar a foto aqui mesmo e depois o que deseja mudar.`,
          { messageId: replyTo }
        );
        await sendMenuButtons(phone, replyTo);
        return;
      }

      await processEdit({ phone, prompt, replyTo });
      return;
    }

  await sendTextMessage(
    phone,
    `${friendlyIntro()}\n\nEstou pronta para receber sua foto 😉`,
    { messageId: replyTo }
  );
  await sendMenuButtons(phone, replyTo);
};
