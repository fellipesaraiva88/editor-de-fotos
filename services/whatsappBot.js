import { generateEditedImageFromBuffer } from './geminiNodeService.js';
import { sendImageMessage, sendTextMessage } from './zapiClient.js';
import * as ResponseManager from './responseManager.js';
import * as UserService from './userService.js';
import * as WooviService from './wooviService.js';

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
  const buttonReply = payload?.buttonReply?.id || payload?.listReply?.id || '';

  return (caption || text || buttonReply || '').trim();
};

const getHotspot = () => ({ x: 512, y: 512 });

const updateSession = (phone, newBuffer, mimeType) => {
  const session = sessionStore.get(phone);
  if (!session) return;

  if (session.currentBuffer) {
    session.history.push({
      buffer: session.currentBuffer,
      mimeType: session.currentMimeType
    });
    if (session.history.length > 5) session.history.shift();
  }

  session.currentBuffer = newBuffer;
  session.currentMimeType = mimeType;
  session.updatedAt = Date.now();
  sessionStore.set(phone, session);
};

const undoLastEdit = (phone) => {
  const session = sessionStore.get(phone);
  if (!session || session.history.length === 0) return false;

  const previousState = session.history.pop();
  session.currentBuffer = previousState.buffer;
  session.currentMimeType = previousState.mimeType;
  session.updatedAt = Date.now();
  sessionStore.set(phone, session);
  return true;
};

const resetSession = (phone) => {
  const session = sessionStore.get(phone);
  if (!session) return false;

  session.currentBuffer = session.originalBuffer;
  session.currentMimeType = session.originalMimeType;
  session.history = [];
  session.updatedAt = Date.now();
  sessionStore.set(phone, session);
  return true;
};

const handlePaymentRequired = async (phone, replyTo) => {
  try {
    await sendTextMessage(phone, ResponseManager.getPaymentRequired(), { messageId: replyTo });

    // Generate Pix Charge
    // Correlation ID is phone + timestamp to be unique
    const correlationID = `${phone}-${Date.now()}`;
    const charge = await WooviService.createCharge(0.99, correlationID);

    if (charge && charge.brCode) {
      await sendTextMessage(phone, `Copie e cole o código abaixo no seu banco:`, { messageId: replyTo });
      await sendTextMessage(phone, charge.brCode);

      if (charge.qrCodeImage) {
        await sendImageMessage(phone, charge.qrCodeImage, 'Ou escaneie este QR Code:', { messageId: replyTo });
      }
    }
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    await sendTextMessage(phone, 'Tive um erro ao gerar o pagamento. Tente novamente mais tarde.', { messageId: replyTo });
  }
};

const processEdit = async ({ phone, prompt, replyTo }) => {
  const session = sessionStore.get(phone);
  if (!session) {
    await sendTextMessage(phone, ResponseManager.getSessionExpired(), { messageId: replyTo });
    return;
  }

  // CHECK CREDITS
  if (!UserService.hasCredit(phone)) {
    await handlePaymentRequired(phone, replyTo);
    return;
  }

  try {
    await sendTextMessage(phone, ResponseManager.getEditingStart(), { messageId: replyTo, delayTyping: 2 });

    const editedImage = await generateEditedImageFromBuffer(
      session.currentBuffer,
      session.currentMimeType,
      prompt,
      session.hotspot || getHotspot()
    );

    // CONSUME CREDIT ONLY AFTER SUCCESSFUL GENERATION
    UserService.consumeCredit(phone);

    const base64Data = editedImage.replace(/^data:image\/\w+;base64,/, "");
    const newBuffer = Buffer.from(base64Data, 'base64');

    updateSession(phone, newBuffer, session.currentMimeType);

    await sendImageMessage(
      phone,
      editedImage,
      ResponseManager.getEditingSuccess(),
      { messageId: replyTo }
    );

  } catch (error) {
    console.error('Falha ao processar edição', error);
    await sendTextMessage(phone, ResponseManager.getEditingFailure(), { messageId: replyTo });
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

  // --- HANDLE AUDIO ---
  if (hasAudio) {
    await sendTextMessage(phone, ResponseManager.getAudioReceived(), { messageId: replyTo });
    return;
  }

  // --- HANDLE NEW IMAGE ---
  if (hasImage) {
    try {
      const { buffer, mimeType } = await downloadImage(
        payload.image.imageUrl,
        payload.image.mimeType
      );

      sessionStore.set(phone, {
        originalBuffer: buffer,
        originalMimeType: mimeType,
        currentBuffer: buffer,
        currentMimeType: mimeType,
        history: [],
        hotspot: getHotspot(),
        updatedAt: Date.now(),
      });

      if (prompt) {
        await sendTextMessage(phone, ResponseManager.getImageReceived(), { messageId: replyTo });
        await processEdit({ phone, prompt, replyTo });
      } else {
        await sendTextMessage(phone, ResponseManager.getImageReceived(), { messageId: replyTo });
      }
    } catch (error) {
      console.error('Erro ao baixar imagem', error);
      await sendTextMessage(
        phone,
        'Não consegui baixar sua foto. 😕 Tente enviar novamente.',
        { messageId: replyTo }
      );
    }
    return;
  }

  // --- HANDLE TEXT / COMMANDS ---
  if (prompt) {
    const lowerPrompt = prompt.toLowerCase();

    if (['undo', 'desfazer', 'voltar'].includes(lowerPrompt)) {
      if (undoLastEdit(phone)) {
        const session = sessionStore.get(phone);
        const dataUrl = `data:${session.currentMimeType};base64,${session.currentBuffer.toString('base64')}`;
        await sendImageMessage(phone, dataUrl, 'Desfeito! 🔙 Voltamos para a versão anterior.', { messageId: replyTo });
      } else {
        await sendTextMessage(phone, 'Não há nada para desfazer ou nenhuma sessão ativa.', { messageId: replyTo });
      }
      return;
    }

    if (['reset', 'reiniciar', 'original', 'começar de novo'].includes(lowerPrompt)) {
      if (resetSession(phone)) {
        const session = sessionStore.get(phone);
        const dataUrl = `data:${session.currentMimeType};base64,${session.currentBuffer.toString('base64')}`;
        await sendImageMessage(phone, dataUrl, 'Reiniciado! 🔄 Voltamos para a foto original.', { messageId: replyTo });
      } else {
        await sendTextMessage(phone, 'Mande uma foto para começar!', { messageId: replyTo });
      }
      return;
    }

    if (['help', 'ajuda', 'menu', 'opcoes', 'opções'].includes(lowerPrompt)) {
      await sendTextMessage(phone, ResponseManager.getHelp(), { messageId: replyTo });
      const status = UserService.getStatus(phone);
      await sendTextMessage(phone, ResponseManager.getCreditStatus(status.credits, status.freeRemaining));
      return;
    }

    if (['saldo', 'creditos', 'créditos'].includes(lowerPrompt)) {
      const status = UserService.getStatus(phone);
      await sendTextMessage(phone, ResponseManager.getCreditStatus(status.credits, status.freeRemaining));
      return;
    }

    const isGreeting = ['oi', 'ola', 'olá', 'hey', 'bom dia', 'boa tarde', 'boa noite'].some(w => lowerPrompt.includes(w));
    if (isGreeting && !hasSession) {
      await sendTextMessage(phone, ResponseManager.getGreeting(), { messageId: replyTo });
      return;
    }

    if (hasSession) {
      await processEdit({ phone, prompt, replyTo });
    } else {
      await sendTextMessage(phone, ResponseManager.getNoSessionMessage(), { messageId: replyTo });
    }
  }
};
