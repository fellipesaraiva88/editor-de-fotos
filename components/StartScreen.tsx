
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon } from './icons';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div
      className={`w-full max-w-md mx-auto text-center p-4 md:p-6 mt-4 md:mt-10 transition-all duration-300 rounded-xl ${isDraggingOver ? 'bg-neutral-900 border-2 border-dashed border-neutral-600' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onFileSelect(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-col items-center gap-6 md:gap-8 animate-fade-in">

        <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              Crie. Edite. <span className="text-gradient">Transforme.</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm px-2 md:px-4">
              Edição profissional com IA. Mude roupas, cenários e luzes digitando o que você imagina.
            </p>
        </div>

        <div className="w-full">
            <label htmlFor="image-upload-start" className="cursor-pointer group relative flex items-center justify-center w-full py-3 md:py-4 px-4 md:px-6 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-all active:scale-95 border border-neutral-700 text-sm md:text-base">
                <UploadIcon className="w-4 h-4 md:w-5 md:h-5 mr-2 text-neutral-300" />
                Selecionar da Galeria
            </label>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 w-full mt-2 md:mt-4">
            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <MagicWandIcon className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                </div>
                <span className="text-[10px] md:text-xs text-neutral-400 font-medium">Retoque</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <PaletteIcon className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                </div>
                <span className="text-[10px] md:text-xs text-neutral-400 font-medium">Filtros</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <SunIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                </div>
                <span className="text-[10px] md:text-xs text-neutral-400 font-medium">Luzes</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
