
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isLoading: boolean;
  isCropping: boolean;
}

type AspectRatio = 'Livre' | 'Quadrado' | 'Stories';

const CropPanel: React.FC<CropPanelProps> = ({ onApplyCrop, onSetAspect, isLoading, isCropping }) => {
  const [activeAspect, setActiveAspect] = useState<AspectRatio>('Livre');
  
  const handleAspectChange = (aspect: AspectRatio, value: number | undefined) => {
    setActiveAspect(aspect);
    onSetAspect(value);
  }

  const aspects: { name: AspectRatio, value: number | undefined }[] = [
    { name: 'Livre', value: undefined },
    { name: 'Quadrado', value: 1 / 1 },
    { name: 'Stories', value: 9 / 16 },
  ];

  return (
    <div className="w-full flex flex-col items-center gap-3 md:gap-4 p-2 md:p-4">
      <h3 className="text-xs md:text-sm font-semibold text-neutral-400 uppercase tracking-wider">Cortar Imagem</h3>
      <p className="text-[10px] md:text-xs text-neutral-500 -mt-2 md:-mt-3">Arraste na imagem para definir o corte.</p>

      <div className="flex items-center gap-1.5 md:gap-2">
        {aspects.map(({ name, value }) => (
          <button
            key={name}
            onClick={() => handleAspectChange(name, value)}
            disabled={isLoading}
            className={`px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              activeAspect === name
              ? 'bg-white text-black shadow-sm'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <button
        onClick={onApplyCrop}
        disabled={isLoading || !isCropping}
        className="w-full max-w-xs mt-1 md:mt-2 btn-instagram text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition-transform active:scale-95 disabled:opacity-50 disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs md:text-sm"
      >
        Confirmar Corte
      </button>
    </div>
  );
};

export default CropPanel;
