/**
 * Server-side Gemini/OpenRouter helpers for WhatsApp automations.
 * Mirrors the prompts used in the front-end editor but works with Buffer inputs.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const getApiKey = () => process.env.API_KEY || process.env.OPENROUTER_API_KEY;

const callOpenRouter = async (model, messages, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY (or API_KEY) não configurada.');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://saraiva.edit/whatsapp',
      'X-Title': 'Saraiva.EDIT WhatsApp Bot',
    },
    body: JSON.stringify({
      model,
      messages,
      ...(options.responseFormat && { response_format: options.responseFormat }),
      ...(options.modalities && { modalities: options.modalities }),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter API error: ${response.status} ${detail}`);
  }

  return response.json();
};

const extractImageFromResponse = (response) => {
  const message = response?.choices?.[0]?.message;
  if (message?.images && Array.isArray(message.images)) {
    const imageData = message.images[0]?.image_url?.url;
    if (imageData) return imageData;
  }

  const content = message?.content;
  if (!content) throw new Error('O modelo não retornou uma resposta.');

  if (Array.isArray(content)) {
    const imagePart = content.find(
      (part) => part.type === 'image_url' || part.image_url
    );
    if (imagePart?.image_url?.url) return imagePart.image_url.url;
  }

  if (typeof content === 'string') {
    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) return base64Match[0];
  }

  throw new Error(
    'O modelo não retornou uma imagem. Resposta: ' +
      (typeof content === 'string'
        ? content.substring(0, 200)
        : JSON.stringify(content).substring(0, 200))
  );
};

const bufferToDataUrl = (buffer, mimeType) =>
  `data:${mimeType || 'image/png'};base64,${buffer.toString('base64')}`;

/**
 * Generates an edited image based on the same prompt used in the web editor.
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimeType - Image mime type
 * @param {string} userPrompt - Requested edit
 * @param {{x:number, y:number}} hotspot - Focal point for the edit
 * @returns {Promise<string>} Data URL with the edited image
 */
export const generateEditedImageFromBuffer = async (
  buffer,
  mimeType,
  userPrompt,
  hotspot
) => {
  const dataUrl = bufferToDataUrl(buffer, mimeType);

  const prompt = `You are a world-class high-end photo retoucher AI.
User Request (Portuguese): "${userPrompt}"
Target Point: (${hotspot.x}, ${hotspot.y})

**PROTOCOL: BIOMETRIC IDENTITY LOCK**
1.  **FACE IS SACRED:** Do NOT regenerate the face from scratch. You must preserve the exact facial structure, nose shape, eye shape, and mouth.
2.  **PRESERVE IMPERFECTIONS:** Keep moles, freckles, and unique skin textures. Do NOT apply a generic "smooth plastic" filter unless explicitly asked.
3.  **EXPRESSION LOCK:** The facial expression (smile lines, eye squint, brow position) MUST remain exactly as is.

**AUTOMOTIVE & LUXURY RULES:**
- If a car is requested (Ferrari, Porsche, etc.), render the SPECIFIC model accurately.
- **SCALE:** The person should not be a giant next to the car. Keep realistic human-to-car proportions.
- **REFLECTIONS:** Car paint must reflect the environment (sky, ground) to look photorealistic.
- **LIGHTING:** Use "Golden Hour" or "Cinematic" lighting for high production value.

**EDITING RULES:**
- **Environment Change:** If the user changes the background, adjust the *lighting* on the face to match the new scene, but do not warp the features.
- **Pose Adaptation:** If the scene requires it (e.g. "sitting in a car"), adapt the body pose naturally, but keep the head/neck connection realistic.

Output: Return ONLY the edited image as base64.`;

  const response = await callOpenRouter(
    'google/gemini-2.5-flash-preview-image',
    [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    { modalities: ['image', 'text'] }
  );

  return extractImageFromResponse(response);
};
