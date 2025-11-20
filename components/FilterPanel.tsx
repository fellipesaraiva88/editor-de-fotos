
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface FilterPanelProps {
  onApplyFilter: (prompt: string) => void;
  isLoading: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApplyFilter, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Retrô', prompt: 'Apply a vintage film aesthetic with grain and washed out colors.' },
    { name: 'P&B Alto Contraste', prompt: 'Apply a high contrast black and white artistic filter.' },
    { name: 'Neon', prompt: 'Apply a vibrant cyberpunk aesthetic with neon pink and blue glow.' },
    { name: 'Polaroid', prompt: 'Apply a warm, soft vintage polaroid style filter.' },
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
      onApplyFilter(activePrompt);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-2">
      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider text-center">Filtros Criativos</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-neutral-800 border border-transparent text-neutral-300 font-medium py-3 px-2 rounded-lg transition-all hover:bg-neutral-700 active:scale-95 text-sm ${selectedPresetPrompt === preset.prompt ? 'border-white text-white bg-neutral-700' : ''}`}
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
            placeholder="Ou descreva um filtro..."
            className="flex-grow bg-neutral-900 border border-neutral-700 text-white rounded-lg p-3 focus:border-neutral-500 focus:outline-none transition text-sm"
            disabled={isLoading}
        />
      </div>
      
      {activePrompt && (
         <button
            onClick={handleApply}
            className="w-full btn-instagram text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 disabled:opacity-50 mt-2"
            disabled={isLoading || !activePrompt.trim()}
          >
            Aplicar Filtro
          </button>
      )}
    </div>
  );
};

export default FilterPanel;
