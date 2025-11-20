import React, { useState } from 'react';

interface Suggestion {
    emoji: string;
    label: string;
    prompt: string;
}

interface SuggestionChipsProps {
    suggestions: Suggestion[];
    onSelect: (prompt: string) => void;
    onCustomSubmit: (value: string) => void;
    placeholder?: string;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
    suggestions,
    onSelect,
    onCustomSubmit,
    placeholder = "Ou digite algo..."
}) => {
    const [customValue, setCustomValue] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleChipClick = (suggestion: Suggestion, index: number) => {
        setSelectedIndex(index);
        setTimeout(() => {
            onSelect(suggestion.prompt);
        }, 200);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customValue.trim()) {
            onCustomSubmit(customValue.trim());
        }
    };

    return (
        <div className="suggestion-chips-container">
            <div className="suggestion-chips">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        className={`suggestion-chip ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => handleChipClick(suggestion, index)}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <span className="chip-emoji">{suggestion.emoji}</span>
                        <span className="chip-label">{suggestion.label}</span>
                    </button>
                ))}
            </div>

            <form className="custom-input-form" onSubmit={handleCustomSubmit}>
                <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder={placeholder}
                    className="custom-input"
                />
                {customValue && (
                    <button type="submit" className="custom-submit">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </form>

            <style>{`
                .suggestion-chips-container {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                }

                .suggestion-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    justify-content: center;
                    max-width: 500px;
                }

                .suggestion-chip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 24px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    animation: chipEnter 0.4s ease-out forwards;
                    opacity: 0;
                    transform: translateY(10px);
                }

                @keyframes chipEnter {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .suggestion-chip:hover {
                    background: rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: scale(1.02);
                }

                .suggestion-chip.selected {
                    background: rgba(16, 185, 129, 0.3);
                    border-color: #10B981;
                    transform: scale(1.05);
                }

                .chip-emoji {
                    font-size: 18px;
                }

                .chip-label {
                    white-space: nowrap;
                }

                .custom-input-form {
                    width: 100%;
                    max-width: 400px;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .custom-input {
                    width: 100%;
                    padding: 14px 50px 14px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.2s;
                }

                .custom-input::placeholder {
                    color: rgba(255, 255, 255, 0.4);
                }

                .custom-input:focus {
                    border-color: rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.08);
                }

                .custom-submit {
                    position: absolute;
                    right: 8px;
                    background: #10B981;
                    border: none;
                    border-radius: 8px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                    transition: all 0.2s;
                    animation: fadeIn 0.2s ease;
                }

                .custom-submit:hover {
                    background: #059669;
                    transform: scale(1.05);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
