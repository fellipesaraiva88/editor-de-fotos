import React from 'react';

export const GeneratingLoader: React.FC = () => {
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
            <p className="loader-text">
                Gerando imagem<span className="dots"></span>
            </p>
            <p className="loader-subtext">
                Isso pode levar alguns segundos
            </p>

            <style>{`
                .generating-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                @media (min-width: 768px) {
                    .generating-loader {
                        gap: 24px;
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

                .loader-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: white;
                    margin: 0;
                }

                @media (min-width: 768px) {
                    .loader-text {
                        font-size: 24px;
                    }
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
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                    margin: 0;
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
