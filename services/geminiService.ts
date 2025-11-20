
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
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
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Analyzes the uploaded image and generates 4 tailored editing suggestions.
 */
export const analyzeImageForSuggestions = async (originalImage: File): Promise<{ label: string, emoji: string, prompt: string }[]> => {
    console.log('Starting AI Analysis for suggestions...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Flash is faster for text analysis
            contents: { parts: [originalImagePart, { text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) return [];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to analyze image", e);
        return []; // Fail gracefully with empty array
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    
    // Prompt updated with BIOMETRIC LOCK and HIGH-END AUTOMOTIVE protocols.
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

Output: Return ONLY the edited image.`;

    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Apply a stylistic filter.
User Request: "${filterPrompt}"
CRITICAL: Do not alter facial features. Keep the person exactly as they are. Only change color grading and atmosphere.
Output: Return ONLY the final filtered image.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Apply a global adjustment.
User Request: "${adjustmentPrompt}"

Rules:
- IDENTITY LOCK: Do not change the person's face.
- The adjustment must be natural and photorealistic.
Output: Return ONLY the final adjusted image.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};
