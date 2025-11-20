
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
    options?: { responseFormat?: { type: string }; modalities?: string[] }
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
            ...(options?.responseFormat && { response_format: options.responseFormat }),
            ...(options?.modalities && { modalities: options.modalities })
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
    }

    return response.json();
};

// Helper to extract image from OpenRouter response
const extractImageFromResponse = (response: any): string => {
    const message = response.choices?.[0]?.message;

    // Check for images array (OpenRouter image generation format)
    if (message?.images && Array.isArray(message.images)) {
        const imageData = message.images[0]?.image_url?.url;
        if (imageData) {
            return imageData;
        }
    }

    // Check content for image data
    const content = message?.content;
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

    // Check if the response contains base64 image data in text
    if (typeof content === 'string') {
        const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (base64Match) {
            return base64Match[0];
        }
    }

    throw new Error('O modelo não retornou uma imagem. Resposta: ' +
        (typeof content === 'string' ? content.substring(0, 200) : JSON.stringify(content).substring(0, 200)));
};


/**
 * Analyzes the uploaded image and generates 4 tailored editing suggestions in Portuguese.
 */
export const analyzeImageForSuggestions = async (originalImage: File): Promise<{ label: string, emoji: string, prompt: string }[]> => {
    console.log('Iniciando análise de IA para sugestões...');
    const imageData = await fileToBase64(originalImage);

    const prompt = `Analise esta imagem com atenção. Identifique o sujeito (gênero, estilo de roupa, pose) e o ambiente atual.

Com base nesta análise, gere 4 sugestões criativas de edição no estilo "Instagram Influencer de alto padrão".

As sugestões devem ser em categorias distintas:
1. Mudança de Local (Viagem/Luxo)
2. Upgrade de Roupa (Moda)
3. Cenário com Veículo/Lifestyle
4. Filtro Criativo/Artístico ou mudança de Iluminação

IMPORTANTE: Todas as labels e prompts devem estar em PORTUGUÊS.

Retorne APENAS um array JSON válido de objetos. Não use formatação markdown.
Formato: [{"label": "Título Curto (Max 15 chars)", "emoji": "Emoji Relevante", "prompt": "Prompt completo e detalhado para a edição, em português, seguindo regras de realismo."}]
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
            { responseFormat: { type: 'json_object' } }
        );

        const jsonText = response.choices?.[0]?.message?.content?.trim();
        if (!jsonText) return [];

        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    } catch (e) {
        console.error("Falha ao analisar imagem", e);
        return [];
    }
};

/**
 * Generates an edited image using generative AI based on a descriptive narrative.
 * Hotspot is now optional - used only when precise area targeting is needed.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit (in Portuguese).
 * @param hotspot Optional {x, y} coordinates for precise area targeting.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot?: { x: number, y: number }
): Promise<string> => {
    console.log('Iniciando edição generativa:', { userPrompt, hotspot });
    const imageData = await fileToBase64(originalImage);

    // Construir narrativa descritiva seguindo as melhores práticas do Nano Banana
    const targetInfo = hotspot
        ? `\n\n📍 ÁREA DE FOCO: Concentre a edição principal na região próxima às coordenadas (${hotspot.x}, ${hotspot.y}) da imagem.`
        : '';

    const prompt = `Você é um retocador fotográfico profissional de nível mundial especializado em edições realistas de alta qualidade.

🎯 SOLICITAÇÃO DO USUÁRIO:
"${userPrompt}"${targetInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 PROTOCOLO DE PRESERVAÇÃO DE IDENTIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **ROSTO É SAGRADO**:
   - Mantenha a estrutura facial EXATA: formato do rosto, nariz, olhos, boca
   - Preserve sinais, sardas, texturas naturais da pele
   - NUNCA aplique filtro de "pele plástica" lisa

2. **EXPRESSÃO BLOQUEADA**:
   - Linhas de sorriso, franzido de olhos, posição das sobrancelhas devem permanecer EXATAMENTE como estão

3. **FIDELIDADE FACIAL TOTAL**:
   - Maxilar, maçãs do rosto, linha do cabelo
   - Barba, bigode, pelos faciais
   - Óculos, piercings, acessórios faciais
   - ZERO mudanças na geometria do rosto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 REGRAS DE COMPOSIÇÃO E REALISMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Proporções e Escala:**
- Mantenha proporções humanas realistas
- Se adicionar veículos (carros de luxo, etc.), renderize o modelo ESPECÍFICO com precisão
- A pessoa NÃO deve parecer um gigante ao lado do carro
- Use escala realista humano-para-objeto

**Iluminação Cinematográfica:**
- Aplique "Golden Hour" ou iluminação cinematográfica profissional
- Ajuste a luz no rosto para combinar com o novo ambiente
- Mantenha sombras e reflexos naturais e coerentes

**Reflexos e Materiais:**
- Pintura de carros deve refletir o ambiente (céu, chão)
- Superfícies metálicas e vidros devem ter reflexos fotorrealistas

**Adaptação de Pose:**
- Se a cena exigir (ex: "sentado em um carro"), adapte a pose do corpo naturalmente
- Mantenha a conexão cabeça/pescoço realista

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CONTROLE DE ASPECTO E QUALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Preserve a proporção de aspecto (aspect ratio) da imagem original
- Use linguagem fotográfica e técnicas de edição profissional
- Mantenha texturas e detalhes de alta qualidade
- Evite artefatos artificiais ou distorções

📤 SAÍDA: Retorne APENAS a imagem editada final.`;

    console.log('Enviando para Gemini 2.5 Flash Image...');
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
        }],
        { modalities: ['image', 'text'] }
    );

    return extractImageFromResponse(response);
};

/**
 * Generates an image with a stylistic filter applied using generative AI.
 * Focuses on color grading and atmosphere while preserving identity.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter (in Portuguese).
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Iniciando geração de filtro: ${filterPrompt}`);
    const imageData = await fileToBase64(originalImage);

    const prompt = `Você é um especialista em edição fotográfica e color grading cinematográfico.

🎨 SOLICITAÇÃO DE FILTRO:
"${filterPrompt}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 REGRAS DE PRESERVAÇÃO (CRÍTICO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIDADE INTOCÁVEL:**
- NÃO altere características faciais
- Mantenha a pessoa EXATAMENTE como ela é
- Preserve estrutura facial, expressão, e detalhes únicos

**FOCO DO FILTRO:**
Esta é uma edição de ATMOSFERA E COR, não de conteúdo.
- Modifique apenas: color grading, temperatura de cor, saturação, contraste
- Aplique mood/atmosfera através de ajustes de luz e cor
- Use técnicas de cinema e fotografia profissional

**EFEITOS PERMITIDOS:**
✓ Correção de cor e balanço de branco
✓ Ajustes de exposição e contraste
✓ Vinheta, bloom, grain cinematográfico
✓ LUTs e presets de color grading
✓ Efeitos de iluminação atmosférica

**PROIBIDO:**
✗ Alterar geometria facial ou corporal
✗ Modificar a composição ou elementos da cena
✗ Adicionar ou remover objetos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 QUALIDADE TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Mantenha a proporção de aspecto original
- Preserve detalhes e nitidez da imagem
- Use transições suaves de cor
- Evite posterização e artefatos

📤 SAÍDA: Retorne APENAS a imagem final com o filtro aplicado.`;

    console.log('Enviando para Gemini 2.5 Flash Image...');
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
        }],
        { modalities: ['image', 'text'] }
    );

    return extractImageFromResponse(response);
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment (in Portuguese).
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Iniciando geração de ajuste global: ${adjustmentPrompt}`);
    const imageData = await fileToBase64(originalImage);

    const prompt = `Você é um especialista em edição fotográfica profissional.

⚙️ AJUSTE GLOBAL SOLICITADO:
"${adjustmentPrompt}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 BLOQUEIO DE IDENTIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRÍTICO:**
- NÃO modifique o rosto da pessoa
- Preserve características faciais EXATAS
- Mantenha expressão e estrutura facial
- Conserve detalhes únicos (sinais, sardas, textura de pele)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 AJUSTES PERMITIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Técnicos:**
- Brilho, contraste, exposição
- Nitidez, clareza, definição
- Sombras, highlights, midtones
- Balanço de branco e temperatura

**Artísticos:**
- Saturação e vibrance
- Tons de cor e matiz
- Vinheta e efeitos de borda
- Grain e textura cinematográfica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 REQUISITOS DE QUALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Ajuste deve ser NATURAL e fotorrealista
- Evite over-processing (excesso de edição)
- Mantenha proporção de aspecto original
- Preserve detalhes e texturas importantes
- Use transições suaves, sem artefatos

📤 SAÍDA: Retorne APENAS a imagem final ajustada.`;

    console.log('Enviando para Gemini 2.5 Flash Image...');
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
        }],
        { modalities: ['image', 'text'] }
    );

    return extractImageFromResponse(response);
};

/**
 * Generates an edited image based on location and outfit prompts from the wizard.
 * Uses descriptive narrative approach for best Nano Banana results.
 * @param originalImage The original image file.
 * @param locationPrompt The location/background prompt (in Portuguese).
 * @param outfitPrompt The outfit/clothing prompt (in Portuguese).
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateWizardImage = async (
    originalImage: File,
    locationPrompt: string,
    outfitPrompt: string
): Promise<string> => {
    console.log('Iniciando geração wizard:', { locationPrompt, outfitPrompt });
    const imageData = await fileToBase64(originalImage);

    const prompt = `Você é um retocador fotográfico profissional de nível mundial especializado em transformações realistas de alta qualidade.

🎬 TRANSFORMAÇÃO SOLICITADA:

📍 **LOCALIZAÇÃO:** Coloque a pessoa ${locationPrompt}
👔 **ROUPA:** Mude as roupas para ${outfitPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 PROTOCOLO CRÍTICO - BLOQUEIO BIOMÉTRICO DE IDENTIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. ROSTO É SAGRADO:**
   - Preserve a estrutura facial EXATA: formato do rosto, nariz, olhos, boca
   - Mantenha a expressão facial original COMPLETAMENTE
   - Preserve sinais, sardas, texturas naturais da pele

**2. FIDELIDADE FACIAL TOTAL:**
   - Maxilar, maçãs do rosto, linha do cabelo: IGUAIS
   - Barba, bigode, pelos faciais: INALTERADOS
   - Óculos, piercings, acessórios faciais: MANTIDOS
   - ZERO mudanças na geometria ou proporções faciais

**3. CARACTERÍSTICAS ÚNICAS:**
   - Textura de pele e poros devem ser preservados
   - NÃO aplique filtro de "pele plástica" lisa
   - Mantenha imperfeições naturais que tornam a pessoa única

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 REGRAS DE QUALIDADE E REALISMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Iluminação Cinematográfica:**
- Use iluminação profissional de alta qualidade que combine com o novo ambiente
- Aplique "Golden Hour" ou iluminação natural apropriada ao local
- Crie sombras e reflexos realistas e coerentes
- A luz deve afetar a roupa e o ambiente, mas preservar o rosto naturalmente

**Integração Natural:**
- A pessoa deve parecer NATURALMENTE posicionada no cenário
- A roupa deve vestir o corpo da pessoa de forma natural e realista
- Mantenha proporções e escala humanas corretas
- Adapte a pose do corpo se necessário, mantendo naturalidade

**Roupas e Vestimenta:**
- As roupas devem ter textura, caimento e dobras realistas
- Devem se ajustar ao tipo de corpo da pessoa
- Considere como a roupa interage com a pose e movimento
- Use materiais e tecidos apropriados ao contexto

**Composição Fotográfica:**
- Use linguagem fotográfica profissional
- Mantenha ou melhore a qualidade da composição
- Preserve a proporção de aspecto (aspect ratio) original
- Evite distorções ou artefatos artificiais

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OBJETIVO FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Criar uma imagem fotorrealista de alta qualidade onde:
✓ A mesma pessoa (rosto 100% preservado)
✓ Está no novo local especificado
✓ Vestindo a nova roupa especificada
✓ Tudo parece natural e profissionalmente fotografado

📤 SAÍDA: Retorne APENAS a imagem editada final.`;

    console.log('Enviando requisição wizard para o modelo...');
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
        }],
        { modalities: ['image', 'text'] }
    );

    return extractImageFromResponse(response);
};
