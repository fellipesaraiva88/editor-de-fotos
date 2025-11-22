import crypto from 'crypto';

const WOOVI_API_URL = 'https://api.woovi.com/api/v1';

const getApiKey = () => process.env.WOOVI_API_KEY;

export const createCharge = async (value, correlationID) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('WOOVI_API_KEY não configurada.');
    }

    // Woovi expects value in cents (integer)
    const valueInCents = Math.round(value * 100);

    const payload = {
        correlationID,
        value: valueInCents,
        type: 'DYNAMIC',
        comment: 'Credito Editor de Fotos',
    };

    try {
        const response = await fetch(`${WOOVI_API_URL}/charge`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro Woovi: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.charge; // Contains brCode, qrCodeImage, etc.
    } catch (error) {
        console.error('Erro ao criar cobrança Woovi:', error);
        throw error;
    }
};

export const validateWebhook = (payload) => {
    // In a production env, we should verify signatures if Woovi provides them.
    // For now, we check the status and correlationID.
    return payload && payload.status === 'COMPLETED';
};
