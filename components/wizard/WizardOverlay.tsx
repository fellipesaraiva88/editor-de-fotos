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

type WizardStep = 'location' | 'outfit' | 'generating' | 'complete';

const locationSuggestions = [
    { emoji: '🏝️', label: 'Praia paradisíaca', prompt: 'on a beautiful tropical beach with crystal clear water and palm trees' },
    { emoji: '🌆', label: 'Dubai', prompt: 'in Dubai with the Burj Khalifa and luxury buildings in the background' },
    { emoji: '🗼', label: 'Paris', prompt: 'in Paris with the Eiffel Tower in the background' },
    { emoji: '🏔️', label: 'Montanhas', prompt: 'in the mountains with snow-capped peaks and beautiful nature' },
    { emoji: '🌃', label: 'Nova York', prompt: 'in New York City with Times Square lights at night' },
    { emoji: '🏎️', label: 'Com Ferrari', prompt: 'next to a red Ferrari in a luxurious setting' },
];

const outfitSuggestions = [
    { emoji: '👔', label: 'Terno elegante', prompt: 'wearing an elegant black suit with a tie' },
    { emoji: '👗', label: 'Vestido de gala', prompt: 'wearing a stunning evening gown' },
    { emoji: '🏖️', label: 'Roupa de praia', prompt: 'wearing stylish beach wear' },
    { emoji: '🎽', label: 'Casual chique', prompt: 'wearing casual chic designer clothes' },
    { emoji: '💼', label: 'Executivo', prompt: 'wearing professional business attire' },
    { emoji: '👑', label: 'Luxo', prompt: 'wearing luxury designer brands with accessories' },
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
    const [customInput, setCustomInput] = useState('');
    const [isVisible, setIsVisible] = useState(true);

    const handleLocationSelect = useCallback((prompt: string) => {
        setSelectedLocation(prompt);
        setTimeout(() => {
            setStep('outfit');
        }, 300);
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
                    style={{ width: step === 'location' ? '33%' : step === 'outfit' ? '66%' : '100%' }}
                />
            </div>

            <div className="wizard-content">
                {step === 'location' && (
                    <div className="wizard-step" key="location">
                        <WizardQuestion text="Onde você gostaria de estar?" />
                        <SuggestionChips
                            suggestions={locationSuggestions}
                            onSelect={handleLocationSelect}
                            onCustomSubmit={handleCustomSubmit}
                            placeholder="Ou digite um lugar..."
                        />
                    </div>
                )}

                {step === 'outfit' && (
                    <div className="wizard-step" key="outfit">
                        <WizardQuestion text="Como quer estar vestido?" />
                        <SuggestionChips
                            suggestions={outfitSuggestions}
                            onSelect={handleOutfitSelect}
                            onCustomSubmit={handleCustomSubmit}
                            placeholder="Ou descreva a roupa..."
                        />
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
                    background: rgba(0, 0, 0, 0.92);
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
                    height: 3px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .wizard-progress-bar {
                    height: 100%;
                    background: #10B981;
                    transition: width 0.4s ease-out;
                }

                .wizard-content {
                    width: 100%;
                    max-width: 600px;
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
