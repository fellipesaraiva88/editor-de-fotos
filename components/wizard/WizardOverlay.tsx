import React, { useState, useCallback } from 'react';
import { WizardQuestion } from './WizardQuestion';
import { SuggestionChips } from './SuggestionChips';
import { GeneratingLoader } from './GeneratingLoader';

interface WizardOverlayProps {
    originalImage: File;
    onComplete: (editedImageUrl: string) => void;
    onCancel: () => void;
    generateImage: (location: string, outfit: string) => Promise<string>;
}

type WizardStep = 'location' | 'transition' | 'outfit' | 'generating' | 'complete';

const locationSuggestions = [
    // Natureza & Aventura
    { emoji: '🏖️', label: 'Praia Tropical', prompt: 'numa praia tropical paradisíaca com água cristalina e coqueiros' },
    { emoji: '🏔️', label: 'Montanhas', prompt: 'nas montanhas com picos nevados e paisagem deslumbrante ao nascer do sol' },
    { emoji: '🌲', label: 'Floresta', prompt: 'numa floresta verde exuberante com raios de sol entre as árvores' },

    // Urbano & Lifestyle
    { emoji: '☕', label: 'Café Charmoso', prompt: 'num café ao ar livre charmoso com iluminação aconchegante' },
    { emoji: '🌆', label: 'Terraço Urbano', prompt: 'num terraço moderno ao entardecer com skyline da cidade ao fundo' },

    // Viagens & Cultura
    { emoji: '🇫🇷', label: 'Paris', prompt: 'em Paris com a Torre Eiffel iluminada ao fundo' },
    { emoji: '🇯🇵', label: 'Tóquio', prompt: 'em Tóquio à noite com luzes neon e estética moderna' },
    { emoji: '🗽', label: 'Nova York', prompt: 'em Nova York com a Times Square iluminada à noite' },

    // Luxo & Aspiracional
    { emoji: '🏎️', label: 'Com Ferrari', prompt: 'ao lado de uma Ferrari vermelha em cenário luxuoso' },
    { emoji: '✈️', label: 'Jato Particular', prompt: 'em frente a um jato particular em aeroporto privado' },
    { emoji: '🛥️', label: 'Iate', prompt: 'num iate de luxo com mar azul turquesa ao fundo' },
    { emoji: '🏰', label: 'Castelo', prompt: 'num castelo europeu histórico com arquitetura majestosa' },
];

const outfitSuggestions = [
    // Casual
    { emoji: '👕', label: 'Casual Moderno', prompt: 'usando roupas casuais modernas e estilosas' },
    { emoji: '🌴', label: 'Verão Leve', prompt: 'usando roupa leve de verão, estilo praia sofisticado' },
    { emoji: '🧢', label: 'Streetwear', prompt: 'usando streetwear estiloso com tênis de marca' },

    // Formal Masculino
    { emoji: '🤵', label: 'Terno Clássico', prompt: 'usando um terno elegante bem cortado' },
    { emoji: '👔', label: 'Social Casual', prompt: 'usando blazer sem gravata, estilo smart casual' },

    // Elegante Feminino
    { emoji: '👗', label: 'Vestido Elegante', prompt: 'usando um vestido elegante e sofisticado' },
    { emoji: '💃', label: 'Coquetel', prompt: 'usando vestido de coquetel com acessórios refinados' },
    { emoji: '👚', label: 'Casual Chique', prompt: 'usando look casual chique com peças de grife' },

    // Temáticos
    { emoji: '✨', label: 'Gala/Red Carpet', prompt: 'usando traje de gala impecável, estilo red carpet' },
    { emoji: '🧥', label: 'Inverno Estiloso', prompt: 'usando casaco elegante de inverno com cachecol' },
    { emoji: '🏍️', label: 'Rock/Leather', prompt: 'usando jaqueta de couro preta, estilo rockstar' },
    { emoji: '👑', label: 'Alta Costura', prompt: 'usando alta costura com joias e acessórios de luxo' },
];

export const WizardOverlay: React.FC<WizardOverlayProps> = ({
    originalImage,
    onComplete,
    onCancel,
    generateImage
}) => {
    const [step, setStep] = useState<WizardStep>('location');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedOutfit, setSelectedOutfit] = useState('');
    const [isVisible, setIsVisible] = useState(true);

    const handleLocationSelect = useCallback((prompt: string) => {
        setSelectedLocation(prompt);
        setStep('transition');
        setTimeout(() => {
            setStep('outfit');
        }, 1500);
    }, []);

    const handleOutfitSelect = useCallback(async (prompt: string) => {
        setSelectedOutfit(prompt);
        setStep('generating');

        try {
            const result = await generateImage(selectedLocation, prompt);
            onComplete(result);
        } catch (error) {
            console.error('Error generating image:', error);
            setStep('location');
        }
    }, [selectedLocation, generateImage, onComplete]);

    const handleCustomSubmit = useCallback((value: string) => {
        if (step === 'location') {
            handleLocationSelect(value);
        } else if (step === 'outfit') {
            handleOutfitSelect(value);
        }
    }, [step, handleLocationSelect, handleOutfitSelect]);

    const handleBackToLocation = useCallback(() => {
        setStep('location');
        setSelectedLocation('');
    }, []);

    if (!isVisible) return null;

    return (
        <div className="wizard-overlay">
            <button className="wizard-close" onClick={onCancel}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <div className="wizard-progress">
                <div
                    className="wizard-progress-bar"
                    style={{ width: step === 'location' ? '33%' : step === 'transition' ? '50%' : step === 'outfit' ? '66%' : '100%' }}
                />
            </div>

            <div className="wizard-content">
                {step === 'location' && (
                    <div className="wizard-step" key="location">
                        <p className="wizard-step-indicator">Etapa 1 de 2</p>
                        <WizardQuestion text="Para onde a gente te leva hoje?" />
                        <p className="wizard-subtitle">Escolha o cenário dos seus sonhos</p>
                        <SuggestionChips
                            suggestions={locationSuggestions}
                            onSelect={handleLocationSelect}
                            onCustomSubmit={handleCustomSubmit}
                            placeholder="Ou digite um lugar dos sonhos..."
                        />
                    </div>
                )}

                {step === 'transition' && (
                    <div className="wizard-step wizard-transition" key="transition">
                        <div className="transition-icon">✨</div>
                        <p className="transition-text">Perfeito! Agora vamos completar o visual...</p>
                    </div>
                )}

                {step === 'outfit' && (
                    <div className="wizard-step" key="outfit">
                        <p className="wizard-step-indicator">Etapa 2 de 2</p>
                        <WizardQuestion text="Com que estilo você quer arrasar?" />
                        <p className="wizard-subtitle">Vista-se para impressionar</p>
                        <SuggestionChips
                            suggestions={outfitSuggestions}
                            onSelect={handleOutfitSelect}
                            onCustomSubmit={handleCustomSubmit}
                            placeholder="Ou descreva o look perfeito..."
                        />
                        <button className="wizard-back-button" onClick={handleBackToLocation}>
                            ← Mudar localização
                        </button>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="wizard-step" key="generating">
                        <GeneratingLoader />
                    </div>
                )}
            </div>

            <style>{`
                .wizard-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.4s ease-out;
                    padding: 16px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .wizard-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                    transition: background 0.2s;
                }

                @media (min-width: 768px) {
                    .wizard-close {
                        top: 20px;
                        right: 20px;
                        width: 44px;
                        height: 44px;
                    }
                }

                .wizard-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .wizard-progress {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .wizard-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #10B981, #3B82F6);
                    transition: width 0.4s ease-out;
                }

                .wizard-content {
                    width: 100%;
                    max-width: 650px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                @media (min-width: 768px) {
                    .wizard-content {
                        padding: 20px;
                    }
                }

                .wizard-step {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: slideUp 0.4s ease-out;
                }

                .wizard-step-indicator {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                }

                @media (min-width: 768px) {
                    .wizard-step-indicator {
                        font-size: 12px;
                        margin-bottom: 12px;
                    }
                }

                .wizard-subtitle {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.6);
                    margin-top: -8px;
                    margin-bottom: 20px;
                }

                @media (min-width: 768px) {
                    .wizard-subtitle {
                        font-size: 14px;
                        margin-bottom: 28px;
                    }
                }

                .wizard-back-button {
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .wizard-back-button:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.4);
                    color: white;
                }

                .wizard-transition {
                    justify-content: center;
                    min-height: 200px;
                }

                .transition-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                    animation: pulse 1s ease-in-out infinite;
                }

                .transition-text {
                    font-size: 18px;
                    color: white;
                    font-weight: 500;
                    animation: fadeIn 0.5s ease-out;
                }

                @media (min-width: 768px) {
                    .transition-icon {
                        font-size: 64px;
                        margin-bottom: 24px;
                    }
                    .transition-text {
                        font-size: 24px;
                    }
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};
