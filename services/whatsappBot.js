import { generateEditedImageFromBuffer } from './geminiNodeService.js';
import { sendButtonActions, sendButtonList, sendImageMessage, sendTextMessage } from './zapiClient.js';
import * as ResponseManager from './responseManager.js';

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
  // Also check for button replies
  const buttonReply = payload?.buttonReply?.id || payload?.listReply?.id || '';

  return (caption || text || buttonReply || '').trim();
};

const getHotspot = () => ({ x: 512, y: 512 }); // Centro padrão

const updateSession = (phone, newBuffer, mimeType) => {
  const session = sessionStore.get(phone);
  if (!session) return;

  // Add current state to history before updating
  if (session.currentBuffer) {
    session.history.push({
      buffer: session.currentBuffer,
      mimeType: session.currentMimeType
    });
    // Limit history to last 5 states to save memory
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

  // Reset to original
  session.currentBuffer = session.originalBuffer;
  session.currentMimeType = session.originalMimeType;
  session.history = [];
  session.updatedAt = Date.now();
  sessionStore.set(phone, session);
  return true;
};

const processEdit = async ({ phone, prompt, replyTo }) => {
  const session = sessionStore.get(phone);
  if (!session) {
    await sendTextMessage(phone, ResponseManager.getSessionExpired(), { messageId: replyTo });
    return;
  }

  try {
    await sendTextMessage(phone, ResponseManager.getEditingStart(), { messageId: replyTo, delayTyping: 2 });

    // Use CURRENT buffer for iterative editing
    const editedImage = await generateEditedImageFromBuffer(
      session.currentBuffer,
      session.currentMimeType,
      prompt,
      session.hotspot || getHotspot()
    );

    // Convert base64 back to buffer for storage
    const base64Data = editedImage.replace(/^data:image\/\w+;base64,/, "");
    const newBuffer = Buffer.from(base64Data, 'base64');

    // Update session with new image
    updateSession(phone, newBuffer, session.currentMimeType);

    await sendImageMessage(
      phone,
      editedImage,
      ResponseManager.getEditingSuccess(),
      { messageId: replyTo }
    );

    // Send options after image
    const options = ResponseManager.getEditOptions();
    await sendButtonActions(phone, options.title, options.buttons);

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

      // Initialize new session
      sessionStore.set(phone, {
        originalBuffer: buffer,
        originalMimeType: mimeType,
        currentBuffer: buffer,
        currentMimeType: mimeType,
        history: [],
        hotspot: getHotspot(),
        updatedAt: Date.now(),
      });

      await sendTextMessage(phone, ResponseManager.getImageReceived(), { messageId: replyTo });

      if (prompt) {
        // If image came with caption, process immediately
        await processEdit({ phone, prompt, replyTo });
      } else {
        // Otherwise show menu
        const menu = ResponseManager.getMenuOptions();
        await sendButtonList(phone, menu.title, menu.buttons);
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

    // 1. Check for Special Commands
    if (lowerPrompt === 'undo' || lowerPrompt === 'desfazer') {
      if (undoLastEdit(phone)) {
        const session = sessionStore.get(phone);
        const dataUrl = `data:${session.currentMimeType};base64,${session.currentBuffer.toString('base64')}`;
        await sendImageMessage(phone, dataUrl, 'Desfeito! 🔙 Voltamos para a versão anterior.', { messageId: replyTo });
      } else {
        await sendTextMessage(phone, 'Não há nada para desfazer ou nenhuma sessão ativa.', { messageId: replyTo });
      }
      return;
    }

    if (lowerPrompt === 'reset' || lowerPrompt === 'reiniciar' || lowerPrompt === 'nova foto') {
      if (resetSession(phone)) {
        const session = sessionStore.get(phone);
        const dataUrl = `data:${session.currentMimeType};base64,${session.currentBuffer.toString('base64')}`;
        await sendImageMessage(phone, dataUrl, 'Reiniciado! 🔄 Voltamos para a foto original.', { messageId: replyTo });
      } else {
        await sendTextMessage(phone, 'Mande uma foto para começar!', { messageId: replyTo });
      }
      return;
    }

    if (lowerPrompt === 'help' || lowerPrompt === 'ajuda' || lowerPrompt === 'menu') {
      await sendTextMessage(phone, ResponseManager.getHelp(), { messageId: replyTo });
      return;
    }

    if (lowerPrompt === 'ideas' || lowerPrompt === 'ideias') {
      await sendTextMessage(phone, 'Tente pedir:\n- "Cyberpunk"\n- "Terno profissional"\n- "Fundo de praia"\n- "Estilo desenho 3D"', { messageId: replyTo });
      return;
    }

    // 2. Handle Greetings (only if no session or explicit greeting)
    const isGreeting = ['oi', 'ola', 'olá', 'hey'].some(w => lowerPrompt.includes(w));
    if (isGreeting && !hasSession) {
      await sendTextMessage(phone, ResponseManager.getGreeting(), { messageId: replyTo });
      return;
    }

    // 3. Handle Edit Request
    if (hasSession) {
      await processEdit({ phone, prompt, replyTo });
    } else {
      // No session, user sent text
      await sendTextMessage(phone, ResponseManager.getGreeting(), { messageId: replyTo });
    }
  }
};
