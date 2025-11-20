
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Helper function to convert a File object to base64
const fileToBase64 = async (file: File): Promise<{ mimeType: string; data: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { mimeType, data };
};

// Helper to call OpenRouter API
const callOpenRouter = async (
    model: string,
    messages: any[],
    responseFormat?: { type: string }
): Promise<any> => {
    const apiKey = process.env.API_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error('API Key não configurada. Configure OPENROUTER_API_KEY.');
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Saraiva.EDIT'
        },
        body: JSON.stringify({
            model,
            messages,
            ...(responseFormat && { response_format: responseFormat })
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
    }

    return response.json();
};


/**
 * Analyzes the uploaded image and generates 4 tailored editing suggestions.
 */
export const analyzeImageForSuggestions = async (originalImage: File): Promise<{ label: string, emoji: string, prompt: string }[]> => {
    console.log('Starting AI Analysis for suggestions...');
    const imageData = await fileToBase64(originalImage);

    const prompt = `Analyze this image carefully. Identify the subject (gender, clothing style, pose) and the current environment.
    Based on this analysis, generate 4 creative, high-end "Instagram Influencer" style editing suggestions.

    The suggestions should be distinct categories:
    1. A Location Change (Travel/Luxury)
    2. An Outfit Upgrade (Fashion)
    3. A Vehicle/Lifestyle scenario
    4. A Creative/Artistic Filter or Lighting change.

    Return ONLY a valid JSON array of objects. Do not use markdown formatting.
    Format: [{"label": "Short Title (Max 15 chars)", "emoji": "Relevant Emoji", "prompt": "Full detailed prompt for the edit, adhering to realism rules."}]
    `;

    try {
        const response = await callOpenRouter(
            'google/gemini-2.0-flash-001',
            [{
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${imageData.mimeType};base64,${imageData.data}`
                        }
                    },
                    { type: 'text', text: prompt }
                ]
            }],
            { type: 'json_object' }
        );

        const jsonText = response.choices?.[0]?.message?.content?.trim();
        if (!jsonText) return [];

        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    } catch (e) {
        console.error("Failed to analyze image", e);
        return [];
    }
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const imageData = await fileToBase64(originalImage);

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

    console.log('Sending image and prompt to the model...');
    const response = await callOpenRouter(
        'google/gemini-2.5-flash-preview-image',
        [{
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${imageData.mimeType};base64,${imageData.data}`
                    }
                },
                { type: 'text', text: prompt }
            ]
        }]
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('O modelo não retornou uma resposta.');
    }

    // Check if response is an array with image data
    if (Array.isArray(content)) {
        const imagePart = content.find((part: any) => part.type === 'image_url' || part.image_url);
        if (imagePart?.image_url?.url) {
            return imagePart.image_url.url;
        }
    }

    // Check if the response contains base64 image data
    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) {
        return base64Match[0];
    }

    // If no image, throw error
    throw new Error('O modelo não conseguiu gerar a imagem editada. Resposta: ' + (typeof content === 'string' ? content.substring(0, 200) : JSON.stringify(content).substring(0, 200)));
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const imageData = await fileToBase64(originalImage);

    const prompt = `You are an expert photo editor AI. Apply a stylistic filter.
User Request: "${filterPrompt}"
CRITICAL: Do not alter facial features. Keep the person exactly as they are. Only change color grading and atmosphere.
Output: Return ONLY the final filtered image.`;

    console.log('Sending image and filter prompt to the model...');
    const response = await callOpenRouter(
        'google/gemini-2.5-flash-preview-image',
        [{
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${imageData.mimeType};base64,${imageData.data}`
                    }
                },
                { type: 'text', text: prompt }
            ]
        }]
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('O modelo não retornou uma resposta.');
    }

    if (Array.isArray(content)) {
        const imagePart = content.find((part: any) => part.type === 'image_url' || part.image_url);
        if (imagePart?.image_url?.url) {
            return imagePart.image_url.url;
        }
    }

    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) {
        return base64Match[0];
    }

    throw new Error('O modelo não conseguiu aplicar o filtro.');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const imageData = await fileToBase64(originalImage);

    const prompt = `You are an expert photo editor AI. Apply a global adjustment.
User Request: "${adjustmentPrompt}"

Rules:
- IDENTITY LOCK: Do not change the person's face.
- The adjustment must be natural and photorealistic.
Output: Return ONLY the final adjusted image.`;

    console.log('Sending image and adjustment prompt to the model...');
    const response = await callOpenRouter(
        'google/gemini-2.5-flash-preview-image',
        [{
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${imageData.mimeType};base64,${imageData.data}`
                    }
                },
                { type: 'text', text: prompt }
            ]
        }]
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('O modelo não retornou uma resposta.');
    }

    if (Array.isArray(content)) {
        const imagePart = content.find((part: any) => part.type === 'image_url' || part.image_url);
        if (imagePart?.image_url?.url) {
            return imagePart.image_url.url;
        }
    }

    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) {
        return base64Match[0];
    }

    throw new Error('O modelo não conseguiu aplicar o ajuste.');
};
