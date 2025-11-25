import React, { useState, useEffect } from 'react';

const engagementMessages = [
    {
        main: "Criando sua transformação",
        sub: "Nossa IA está analisando sua imagem..."
    },
    {
        main: "Aplicando o cenário",
        sub: "Ajustando iluminação e perspectiva..."
    },
    {
        main: "Refinando os detalhes",
        sub: "Preservando sua identidade com perfeição..."
    },
    {
        main: "Ajustando as roupas",
        sub: "Garantindo que tudo fique natural..."
    },
    {
        main: "Quase lá",
        sub: "Finalizando os últimos retoques..."
    },
    {
        main: "Preparando o resultado",
        sub: "Você vai amar o que vem por aí..."
    }
];

export const GeneratingLoader: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Rotacionar mensagens a cada 2.5 segundos
        const messageInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % engagementMessages.length);
        }, 2500);

        // Simular progresso suave
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 92) return prev; // Para em 92% até terminar de verdade
                const increment = Math.random() * 3 + 1;
                return Math.min(prev + increment, 92);
            });
        }, 400);

        return () => {
            clearInterval(messageInterval);
            clearInterval(progressInterval);
        };
    }, []);

    const currentMessage = engagementMessages[messageIndex];

    return (
        <div className="generating-loader">
            <div className="loader-spinner">
                <svg viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            <div className="loader-progress-container">
                <div className="loader-progress-bar">
                    <div
                        className="loader-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="loader-progress-text">{Math.floor(progress)}%</p>
            </div>

            <p className="loader-text" key={messageIndex}>
                {currentMessage.main}<span className="dots"></span>
            </p>
            <p className="loader-subtext" key={`sub-${messageIndex}`}>
                {currentMessage.sub}
            </p>

            <style>{`
                .generating-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                }

                @media (min-width: 768px) {
                    .generating-loader {
                        gap: 20px;
                        padding: 30px;
                    }
                }

                .loader-spinner {
                    width: 50px;
                    height: 50px;
                    color: #10B981;
                }

                @media (min-width: 768px) {
                    .loader-spinner {
                        width: 60px;
                        height: 60px;
                    }
                }

                .loader-spinner svg {
                    animation: rotate 1.5s linear infinite;
                }

                .loader-spinner circle {
                    stroke-dasharray: 90, 150;
                    stroke-dashoffset: 0;
                    animation: dash 1.5s ease-in-out infinite;
                }

                @keyframes rotate {
                    100% { transform: rotate(360deg); }
                }

                @keyframes dash {
                    0% {
                        stroke-dasharray: 1, 150;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-dasharray: 90, 150;
                        stroke-dashoffset: -35;
                    }
                    100% {
                        stroke-dasharray: 90, 150;
                        stroke-dashoffset: -124;
                    }
                }

                .loader-progress-container {
                    width: 100%;
                    max-width: 280px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                @media (min-width: 768px) {
                    .loader-progress-container {
                        max-width: 320px;
                    }
                }

                .loader-progress-bar {
                    width: 100%;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .loader-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10B981, #3B82F6);
                    border-radius: 3px;
                    transition: width 0.4s ease-out;
                }

                .loader-progress-text {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 600;
                    margin: 0;
                }

                .loader-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: white;
                    margin: 0;
                    animation: textFade 0.4s ease-out;
                }

                @media (min-width: 768px) {
                    .loader-text {
                        font-size: 22px;
                    }
                }

                @keyframes textFade {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .dots::after {
                    content: '';
                    animation: dots 1.5s steps(4, end) infinite;
                }

                @keyframes dots {
                    0% { content: ''; }
                    25% { content: '.'; }
                    50% { content: '..'; }
                    75% { content: '...'; }
                    100% { content: ''; }
                }

                .loader-subtext {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.5);
                    margin: 0;
                    animation: textFade 0.4s ease-out;
                    text-align: center;
                }

                @media (min-width: 768px) {
                    .loader-subtext {
                        font-size: 14px;
                    }
                }
            `}</style>
        </div>
    );
};
