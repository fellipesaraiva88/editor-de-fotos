import { generateEditedImageFromBuffer } from './geminiNodeService.js';
import { sendImageMessage, sendTextMessage } from './zapiClient.js';
import * as ResponseManager from './responseManager.js';
import * as UserService from './userService.js';
import * as WooviService from './wooviService.js';

const sessionStore = new Map();
const pendingPayments = new Map(); // Track pending payments for follow-ups
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

// Enhanced payment flow with better copy
const handlePaymentRequired = async (phone, replyTo, isReturningUser = false) => {
  try {
    // Use different copy for returning users
    const paymentMessage = isReturningUser
      ? ResponseManager.getPaymentReturningUser()
      : ResponseManager.getPaymentRequired();

    await sendTextMessage(phone, paymentMessage, { messageId: replyTo });

    // Generate Pix Charge
    const correlationID = `${phone}-${Date.now()}`;
    const charge = await WooviService.createCharge(0.99, correlationID);

    if (charge && charge.brCode) {
      // Send humanized Pix instructions
      await sendTextMessage(phone, ResponseManager.getPaymentPixIntro(), { messageId: replyTo });

      await sendTextMessage(phone, ResponseManager.getPaymentPixCode(), { messageId: replyTo });
      await sendTextMessage(phone, charge.brCode);

      if (charge.qrCodeImage) {
        await sendImageMessage(phone, charge.qrCodeImage, ResponseManager.getPaymentPixQR(), { messageId: replyTo });
      }

      await sendTextMessage(phone, ResponseManager.getPaymentConfirmationWait(), { messageId: replyTo });

      // Track pending payment for follow-ups
      pendingPayments.set(phone, {
        correlationID,
        createdAt: Date.now(),
        followUpsSent: 0
      });

      // Schedule follow-up messages (3 minutes and 10 minutes)
      schedulePaymentFollowUps(phone, replyTo);
    }
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    await sendTextMessage(phone, ResponseManager.getPaymentError(), { messageId: replyTo });
  }
};

// Schedule follow-up messages for abandoned payments
const schedulePaymentFollowUps = (phone, replyTo) => {
  // 3-minute follow-up
  setTimeout(async () => {
    const pending = pendingPayments.get(phone);
    if (pending && pending.followUpsSent === 0) {
      pending.followUpsSent = 1;
      pendingPayments.set(phone, pending);
      await sendTextMessage(phone, ResponseManager.getPaymentAbandoned3Min(), { messageId: replyTo });
    }
  }, 3 * 60 * 1000);

  // 10-minute follow-up
  setTimeout(async () => {
    const pending = pendingPayments.get(phone);
    if (pending && pending.followUpsSent === 1) {
      pending.followUpsSent = 2;
      pendingPayments.set(phone, pending);
      await sendTextMessage(phone, ResponseManager.getPaymentAbandoned10Min(), { messageId: replyTo });
      // Remove from pending after final follow-up
      setTimeout(() => pendingPayments.delete(phone), 60 * 1000);
    }
  }, 10 * 60 * 1000);
};

// Handle package purchase
const handlePackagePurchase = async (phone, replyTo) => {
  try {
    const correlationID = `pkg-${phone}-${Date.now()}`;
    const charge = await WooviService.createCharge(3.99, correlationID);

    if (charge && charge.brCode) {
      await sendTextMessage(phone, '🎨 *PACOTE CRIATIVO* - 5 edições por R$ 3,99\n\nVou gerar o Pix agora:', { messageId: replyTo });

      await sendTextMessage(phone, ResponseManager.getPaymentPixCode(), { messageId: replyTo });
      await sendTextMessage(phone, charge.brCode);

      if (charge.qrCodeImage) {
        await sendImageMessage(phone, charge.qrCodeImage, ResponseManager.getPaymentPixQR(), { messageId: replyTo });
      }

      await sendTextMessage(phone, ResponseManager.getPaymentConfirmationWait(), { messageId: replyTo });

      // Track as package purchase
      pendingPayments.set(phone, {
        correlationID,
        createdAt: Date.now(),
        followUpsSent: 0,
        isPackage: true,
        credits: 5
      });
    }
  } catch (error) {
    console.error('Erro ao gerar pagamento do pacote:', error);
    await sendTextMessage(phone, ResponseManager.getPaymentError(), { messageId: replyTo });
  }
};

// Get appropriate success message based on edit count
const getSuccessMessage = (phone) => {
  const status = UserService.getStatus(phone);
  const totalEdits = status.totalEdits || 0;

  if (totalEdits === 1) {
    return ResponseManager.getFirstEditComplete();
  } else if (totalEdits === 2 && status.freeRemaining === 0) {
    return ResponseManager.getSecondEditComplete();
  }
  return ResponseManager.getEditingSuccess();
};

const processEdit = async ({ phone, prompt, replyTo }) => {
  const session = sessionStore.get(phone);
  if (!session) {
    await sendTextMessage(phone, ResponseManager.getSessionExpired(), { messageId: replyTo });
    return;
  }

  // CHECK CREDITS
  if (!UserService.hasCredit(phone)) {
    const status = UserService.getStatus(phone);
    const isReturningUser = status.totalPurchases > 0;
    await handlePaymentRequired(phone, replyTo, isReturningUser);
    return;
  }

  // Check for low credit warning (1 credit remaining, already paid before)
  const statusBefore = UserService.getStatus(phone);
  if (statusBefore.credits === 1 && statusBefore.totalPurchases > 0) {
    await sendTextMessage(phone, ResponseManager.getPaymentLowCreditWarning(), { messageId: replyTo });
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

    // Get contextual success message
    const successMessage = getSuccessMessage(phone);

    await sendImageMessage(
      phone,
      editedImage,
      successMessage,
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
    const lowerPrompt = prompt.toLowerCase().trim();

    // Undo command
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

    // Reset command
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

    // Help command
    if (['help', 'ajuda', 'menu', 'opcoes', 'opções'].includes(lowerPrompt)) {
      await sendTextMessage(phone, ResponseManager.getHelp(), { messageId: replyTo });
      const status = UserService.getStatus(phone);
      await sendTextMessage(phone, ResponseManager.getCreditStatus(status.credits, status.freeRemaining));
      return;
    }

    // Credit status command
    if (['saldo', 'creditos', 'créditos', 'status'].includes(lowerPrompt)) {
      const status = UserService.getStatus(phone);
      await sendTextMessage(phone, ResponseManager.getCreditStatus(status.credits, status.freeRemaining));
      return;
    }

    // Package purchase command
    if (['pacote', 'package', '1', '1️⃣'].includes(lowerPrompt)) {
      await handlePackagePurchase(phone, replyTo);
      return;
    }

    // Single credit command (when offered package)
    if (['1 crédito', '1 credito', '2', '2️⃣'].includes(lowerPrompt)) {
      const status = UserService.getStatus(phone);
      const isReturningUser = status.totalPurchases > 0;
      await handlePaymentRequired(phone, replyTo, isReturningUser);
      return;
    }

    // Greeting detection
    const isGreeting = ['oi', 'ola', 'olá', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'eai', 'e ai'].some(w => lowerPrompt.includes(w));
    if (isGreeting && !hasSession) {
      await sendTextMessage(phone, ResponseManager.getGreeting(), { messageId: replyTo });
      return;
    }

    // Process edit if session exists
    if (hasSession) {
      await processEdit({ phone, prompt, replyTo });
    } else {
      await sendTextMessage(phone, ResponseManager.getNoSessionMessage(), { messageId: replyTo });
    }
  }
};

// Export for webhook handler to confirm payments
export const handlePaymentConfirmation = async (phone, isPackage = false, credits = 1) => {
  // Remove from pending payments
  pendingPayments.delete(phone);

  // Add credits
  UserService.addCredits(phone, credits);

  // Send success message
  const successMessage = isPackage
    ? ResponseManager.getPaymentPackageSuccess()
    : ResponseManager.getPaymentSuccess();

  await sendTextMessage(phone, successMessage);
};
