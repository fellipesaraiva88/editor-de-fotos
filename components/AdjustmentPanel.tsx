
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Fundo Desfocado', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Melhorar Detalhes', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Luz Dourada', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Luz de Estúdio', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyAdjustment(activePrompt);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 md:gap-4 p-1 md:p-2">
      <h3 className="text-xs md:text-sm font-semibold text-neutral-400 uppercase tracking-wider text-center">Ajustes Profissionais</h3>

      <div className="grid grid-cols-2 gap-1.5 md:gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-neutral-800 border border-transparent text-neutral-300 font-medium py-2.5 md:py-3 px-2 rounded-lg transition-all hover:bg-neutral-700 active:scale-95 text-xs md:text-sm ${selectedPresetPrompt === preset.prompt ? 'border-white text-white bg-neutral-700' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
            type="text"
            value={customPrompt}
            onChange={handleCustomChange}
            placeholder="Ou digite seu ajuste..."
            className="flex-grow bg-neutral-900 border border-neutral-700 text-white rounded-lg p-2.5 md:p-3 focus:border-neutral-500 focus:outline-none transition text-xs md:text-sm"
            disabled={isLoading}
        />
      </div>

      {activePrompt && (
        <button
            onClick={handleApply}
            className="w-full btn-instagram text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition-transform active:scale-95 disabled:opacity-50 mt-1 md:mt-2 text-xs md:text-sm"
            disabled={isLoading || !activePrompt.trim()}
        >
            Aplicar Ajuste
        </button>
      )}
    </div>
  );
};

export default AdjustmentPanel;
