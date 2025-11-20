import React, { useState, useEffect } from 'react';

interface WizardQuestionProps {
    text: string;
    typingSpeed?: number;
}

export const WizardQuestion: React.FC<WizardQuestionProps> = ({
    text,
    typingSpeed = 50
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayedText('');
        setIsComplete(false);

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < text.length) {
                setDisplayedText(text.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                setIsComplete(true);
                clearInterval(interval);
            }
        }, typingSpeed);

        return () => clearInterval(interval);
    }, [text, typingSpeed]);

    return (
        <div className="wizard-question">
            <h1 className="wizard-question-text">
                {displayedText}
                {!isComplete && <span className="wizard-cursor">|</span>}
            </h1>

            <style>{`
                .wizard-question {
                    text-align: center;
                    margin-bottom: 48px;
                }

                .wizard-question-text {
                    font-size: 28px;
                    font-weight: 700;
                    color: white;
                    line-height: 1.3;
                    margin: 0;
                    min-height: 72px;
                }

                @media (min-width: 768px) {
                    .wizard-question-text {
                        font-size: 36px;
                        min-height: 94px;
                    }
                }

                .wizard-cursor {
                    animation: blink 0.8s infinite;
                    margin-left: 2px;
                }

                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};
