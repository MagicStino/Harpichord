import React, { useRef, useEffect, useState } from 'react';
import { ChordDefinition } from '../types';

interface SonicStringsProps {
  currentChord: ChordDefinition | null;
  useTouchpad: boolean;
  onTrigger: (index: number) => void;
}

const SonicStrings: React.FC<SonicStringsProps> = ({ currentChord, useTouchpad, onTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStrings, setActiveStrings] = useState<number[]>([]);

  // 14 strings for 4 octaves as requested
  const stringsCount = 14;

  const handlePointerEnter = (e: React.PointerEvent, index: number) => {
    if (useTouchpad) return;
    onTrigger(index);
    setActiveStrings(prev => [...prev, index]);
    setTimeout(() => setActiveStrings(prev => prev.filter(s => s !== index)), 150);
  };

  const strings = Array.from({ length: stringsCount }).map((_, i) => i);

  return (
    <div 
      ref={containerRef}
      className={`relative w-44 h-[420px] sonic-strings-plate rounded-2xl border-[6px] border-[#8d7d5d] overflow-hidden transition-all shadow-xl ${
        useTouchpad ? 'brightness-110 ring-4 ring-amber-400' : 'hover:brightness-105'
      }`}
    >
      <div className="absolute inset-0 flex flex-col justify-around py-2 opacity-40 pointer-events-none">
        {strings.map(i => (
          <div key={i} className="h-[2px] w-full bg-black/30 shadow-inner" />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-stretch">
        {strings.map(i => (
          <div 
            key={i} 
            className="flex-1 cursor-pointer relative group"
            onPointerEnter={(e) => handlePointerEnter(e, (stringsCount - 1) - i)}
          >
            <div 
              className={`absolute inset-0 transition-all duration-200 pointer-events-none ${
                activeStrings.includes((stringsCount - 1) - i) 
                  ? 'bg-gradient-to-r from-transparent via-white/40 to-transparent scale-y-110 opacity-100' 
                  : 'opacity-0'
              }`}
            />
            <div className={`h-[1px] w-full absolute top-1/2 -translate-y-1/2 transition-colors ${
                currentChord ? 'bg-amber-900/20' : 'bg-black/5'
            }`} />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col justify-around pointer-events-none px-4">
        {strings.map(i => (
          <div key={i} className="flex justify-between items-center opacity-10">
            <span className="text-[6px] font-black font-mono">{((stringsCount - 1) - i).toString().padStart(2, '0')}</span>
            <div className="w-1 h-1 rounded-full bg-black" />
          </div>
        ))}
      </div>

      {useTouchpad && (
        <div className="absolute top-6 right-6 flex items-center gap-3">
            <span className="text-[9px] font-black text-red-900 uppercase tracking-tighter">TOUCHPAD</span>
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_10px_red] animate-pulse" />
        </div>
      )}

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-25">
         <span className="branding-text text-2xl tracking-tighter">HARPICHORD</span>
         <span className="text-[8px] font-black tracking-[0.4em] mt-1 italic">DX SYSTEM</span>
      </div>

      {!currentChord && !useTouchpad && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#c4b598]/30 backdrop-blur-[2px] z-20">
          <div className="bg-amber-950/80 text-white p-4 rounded-xl border border-white/20 shadow-2xl">
            <span className="text-[10px] uppercase font-black tracking-widest block text-center leading-tight">Select Chord<br/>First</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SonicStrings;
