import React, { useState, useEffect, useRef } from 'react';
import { RhythmPattern, OmnichordState, DelayDivision, WaveformType } from '../types';

interface KnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  labelColor?: string;
  labelSize?: 'xs' | 'sm' | 'base';
}

const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  onChange, 
  color = 'orange-600', 
  size = 'md', 
  labelColor = 'text-orange-950/80',
  labelSize = 'xs'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = startY.current - e.clientY;
      const newValue = Math.min(1, Math.max(0, startValue.current + delta / 150));
      onChange(newValue);
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const rotation = -135 + value * 270;
  const sizeClass = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const labelSizeClass = labelSize === 'sm' ? 'text-[11px]' : labelSize === 'base' ? 'text-[13px]' : 'text-[9.5px]';

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div 
        onMouseDown={handleMouseDown}
        className={`${sizeClass} rounded-full retro-knob relative cursor-ns-resize shadow-[0_4px_8px_rgba(0,0,0,0.4)] border-2 border-[#1a1a1a]`}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] rounded-full bg-[#222]"
          style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        >
          <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-${color} rounded-full shadow-[0_0_8px_currentColor]`} />
        </div>
      </div>
      {label && (
        <label className={`${labelSizeClass} font-black tracking-widest mt-0.5 text-center leading-tight uppercase ${labelColor}`}>
          {label}
        </label>
      )}
    </div>
  );
};

interface ControlPanelProps {
  state: OmnichordState;
  onChange: (updates: Partial<OmnichordState>) => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ state, onChange, onReset }) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'FX' | 'SOUND' | 'DRUMS'>('MAIN');

  const applyTubePreset = (preset: 'clean' | 'soft' | 'warm' | 'hot') => {
    let drive = 0;
    let wet = 0;
    let enabled = true;
    
    switch(preset) {
      case 'clean': enabled = false; drive = 0; wet = 0; break;
      case 'soft': drive = 0.2; wet = 0.35; break;
      case 'warm': drive = 0.45; wet = 0.5; break;
      case 'hot': drive = 0.85; wet = 0.7; break;
    }
    onChange({ tubePreset: preset, tubeEnabled: enabled, tubeDrive: drive, tubeWet: wet });
  };

  return (
    <div className="flex flex-col h-fit max-h-[880px] bg-[#dcd0b8] rounded-[2.5rem] border-[4px] border-[#bdae93] shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)] text-orange-950 font-black uppercase tracking-tight overflow-hidden">
      
      <div className="flex border-b border-black/5 bg-black/5">
        {(['MAIN', 'DRUMS', 'FX', 'SOUND'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-black tracking-[0.1em] transition-all ${
              activeTab === tab ? 'bg-[#dcd0b8] text-orange-950 border-b-2 border-orange-800' : 'text-orange-900/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'MAIN' ? (
          <>
            {/* CHORD SECTION */}
            <div className="bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 leading-none block mb-1">CHORD SECTION</span>
                <div className="grid grid-cols-2 gap-2 justify-items-center">
                   <Knob label="CHORD VOL" size="sm" value={state.chordVolume} onChange={(v) => onChange({ chordVolume: v })} />
                   <Knob label="CHORD CUT" size="sm" value={state.chordCutoff} onChange={(v) => onChange({ chordCutoff: v })} />
                </div>
            </div>

            {/* HARP SECTION */}
            <div className="bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 leading-none">HARP MODULE</span>
                    <div className="flex gap-1">
                        {[-2, -1, 0, 1].map(oct => (
                            <button 
                                key={oct}
                                onClick={() => onChange({ harpOctave: oct })}
                                className={`w-6 h-6 rounded text-[9px] flex items-center justify-center border-2 transition-all ${state.harpOctave === oct ? 'bg-orange-600 text-white border-orange-800' : 'bg-white/50 border-orange-900/20'}`}
                            >
                                {oct > 0 ? `+${oct}` : oct}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-1 justify-items-center items-end">
                    <Knob label="VOL" size="sm" value={state.harpVolume} onChange={(v) => onChange({ harpVolume: v })} />
                    <Knob label="CUT" size="sm" value={state.harpCutoff} onChange={(v) => onChange({ harpCutoff: v })} />
                    <Knob label="SUSTAIN" size="sm" value={state.sustain} onChange={(v) => onChange({ sustain: v })} />
                    <div className="flex flex-col items-center gap-1 pb-1">
                        <span className="text-[8px] opacity-60">OCTAVE</span>
                        <div className="text-[11px] bg-black/10 px-2 py-0.5 rounded border border-black/5">{state.harpOctave}</div>
                    </div>
                </div>
            </div>

            {/* BASS SECTION */}
            <div className="bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 leading-none block">BASS MODULE</span>
                <div className="grid grid-cols-3 gap-2 justify-items-center items-center">
                    <Knob label="BASS VOL" size="sm" value={state.bassVolume} onChange={(v) => onChange({ bassVolume: v })} />
                    <button 
                        onClick={() => onChange({ bassEnabled: !state.bassEnabled })} 
                        className={`w-full h-12 rounded-xl border-2 shadow-sm transition-all flex flex-col items-center justify-center ${state.bassEnabled ? 'bg-orange-800 border-orange-950 text-white' : 'bg-black/10 border-black/20 text-black/40'}`}
                    >
                        <span className="text-[10px] font-black leading-none mb-0.5">BASS</span>
                        <span className="text-[8px] font-bold opacity-70 uppercase">{state.bassEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <Knob label="" size="sm" value={state.bassWaveformMix} onChange={(v) => onChange({ bassWaveformMix: v })} />
                        <span className="text-[8px] font-black opacity-60 mt-1 uppercase text-center leading-tight">SINE / SAW</span>
                    </div>
                </div>
            </div>

            {/* TUBE SECTION */}
            <div className="bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20 space-y-3">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 leading-none">MASTER TUBE</span>
                 <button 
                  onClick={() => onChange({ tubeEnabled: !state.tubeEnabled })}
                  className={`w-12 h-6 rounded-full p-1 transition-all border-2 border-orange-900/20 ${state.tubeEnabled ? 'bg-orange-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all transform shadow-sm ${state.tubeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 justify-items-center py-1">
                <Knob label="DRIVE" size="sm" color="orange-500" value={state.tubeDrive} onChange={(v) => onChange({ tubeDrive: v })} />
                <Knob label="WET / DRY" size="sm" color="orange-500" value={state.tubeWet} onChange={(v) => onChange({ tubeWet: v })} />
              </div>
              <div className="flex gap-1">
                {(['clean', 'soft', 'warm', 'hot'] as const).map(p => (
                  <button 
                    key={p} 
                    onClick={() => applyTubePreset(p)}
                    className={`flex-1 py-1 rounded text-[9px] font-black border-2 transition-all ${state.tubePreset === p ? 'bg-orange-600 text-white border-orange-800' : 'bg-orange-900/5 border-orange-900/10 hover:bg-orange-100'}`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : activeTab === 'DRUMS' ? (
          <div className="flex flex-col gap-4 py-1">
             <div className="flex flex-col bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20 gap-2">
                <div className="flex justify-between items-center px-2">
                    <label className="text-[11px] font-black opacity-60 tracking-widest">TEMPO BPM</label>
                    <input 
                      type="number" 
                      min="40" 
                      max="240" 
                      value={state.tempo} 
                      onChange={(e) => onChange({ tempo: Math.min(240, Math.max(40, parseInt(e.target.value) || 40)) })}
                      className="w-16 bg-black/15 text-orange-900 text-center py-1 rounded border-2 border-orange-950/20 text-[13px] font-black outline-none"
                    />
                </div>
                <div className="flex justify-center">
                    <Knob label="" size="sm" value={(state.tempo - 40) / 200} onChange={(v) => onChange({ tempo: Math.round(40 + v * 200) })} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2 justify-items-center bg-orange-950/5 p-3 rounded-2xl border-[3px] border-orange-950/20">
                <Knob label="DRUMS VOL" size="sm" value={state.rhythmVolume} onChange={(v) => onChange({ rhythmVolume: v })} />
                <Knob label="DRUM CUT" size="sm" value={state.rhythmCutoff} onChange={(v) => onChange({ rhythmCutoff: v })} />
             </div>

             <div className="grid grid-cols-2 gap-x-2 gap-y-3 justify-items-center">
                {Object.values(RhythmPattern).filter(p => p !== RhythmPattern.NONE).map(p => (
                  <button key={p} onClick={() => onChange({ rhythm: state.rhythm === p ? RhythmPattern.NONE : p })} className={`w-full py-2.5 rounded-xl border-2 text-[11px] font-black uppercase transition-all ${state.rhythm === p ? 'bg-orange-800 text-white border-orange-950 shadow-inner' : 'bg-[#eee3ce] border-[#bdae93]'}`}>
                    {p}
                  </button>
                ))}
             </div>
          </div>
        ) : activeTab === 'FX' ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-[#1a1a1a] p-4 rounded-3xl border-2 border-cyan-500/50 space-y-4">
              <div className="flex flex-col gap-2 border-b-2 border-cyan-500/20 pb-2">
                 <h3 className="text-[11px] text-cyan-400 italic font-black uppercase tracking-widest">WALHAHA DELAY</h3>
                 <div className="grid grid-cols-5 gap-1">
                    {['1/4', '1/4D', '1/4T', '1/8', '1/8D', '1/8T', '1/16', '1/16D', '1/16T', '1/3', '1/5'].map(div => (
                      <button 
                        key={div} 
                        onClick={() => onChange({ delayDivision: div as DelayDivision })} 
                        className={`px-1 py-1 rounded text-[9px] font-black border-2 transition-all ${state.delayDivision === div ? 'bg-cyan-500 text-black border-cyan-400' : 'text-cyan-500 border-cyan-900/30'}`}
                      >
                        {div}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-2 justify-items-center">
                 <Knob label="FEEDBACK" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.delayFeedback} onChange={(v) => onChange({ delayFeedback: v })} />
                 <Knob label="TONE" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.delayTone} onChange={(v) => onChange({ delayTone: v })} />
                 <Knob label="SPREAD" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.delaySpread} onChange={(v) => onChange({ delaySpread: v })} />
              </div>
              <div className="pt-2 border-t-2 border-cyan-500/10 grid grid-cols-3 gap-1">
                <Knob label="CHORD MIX" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.chordDelaySend} onChange={(v) => onChange({ chordDelaySend: v })} />
                <Knob label="HARP MIX" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.harpDelaySend} onChange={(v) => onChange({ harpDelaySend: v })} />
                <Knob label="DRUM MIX" size="sm" color="cyan-400" labelColor="text-cyan-400" value={state.rhythmDelaySend} onChange={(v) => onChange({ rhythmDelaySend: v })} />
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-3xl border-2 border-purple-500/50 space-y-4">
               <div className="border-b-2 border-purple-500/20 pb-2">
                  <h3 className="text-[11px] text-purple-400 italic font-black uppercase tracking-widest">HALDADA REVERB</h3>
               </div>
               <div className="grid grid-cols-3 gap-2 justify-items-center">
                 <Knob label="SIZE" size="sm" color="purple-400" labelColor="text-purple-400" value={state.reverbSize} onChange={(v) => onChange({ reverbSize: v })} />
                 <Knob label="DAMP" size="sm" color="purple-400" labelColor="text-purple-400" value={state.reverbDamp} onChange={(v) => onChange({ reverbDamp: v })} />
                 <Knob label="COLOR" size="sm" color="purple-400" labelColor="text-purple-400" value={state.reverbColor} onChange={(v) => onChange({ reverbColor: v })} />
               </div>
               <div className="pt-2 border-t-2 border-purple-500/10 grid grid-cols-3 gap-1">
                <Knob label="CHORD MIX" size="sm" color="purple-400" labelColor="text-purple-400" value={state.chordReverbSend} onChange={(v) => onChange({ chordReverbSend: v })} />
                <Knob label="HARP MIX" size="sm" color="purple-400" labelColor="text-purple-400" value={state.harpReverbSend} onChange={(v) => onChange({ harpReverbSend: v })} />
                <Knob label="DRUM MIX" size="sm" color="purple-400" labelColor="text-purple-400" value={state.rhythmReverbSend} onChange={(v) => onChange({ rhythmReverbSend: v })} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-2">
             <div className="bg-[#1a1a1a] p-5 rounded-3xl border-2 border-orange-400/30 space-y-4">
                <div className="space-y-2">
                   <h3 className="text-[12px] text-amber-300 tracking-widest text-center uppercase font-black">OSC WAVEFORMS</h3>
                   <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] text-center text-amber-300/70 font-black uppercase">CHORD</span>
                        <div className="grid grid-cols-1 gap-1">
                          {['sine', 'triangle', 'square', 'sawtooth'].map(w => (
                            <button key={w} onClick={() => onChange({ chordWaveform: w as WaveformType })} className={`py-1.5 rounded text-[10px] font-black border-2 transition-all ${state.chordWaveform === w ? 'bg-orange-600 text-black border-orange-400' : 'text-orange-800 border-orange-900/40 hover:text-orange-500'}`}>{w}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] text-center text-amber-300/70 font-black uppercase">HARP</span>
                        <div className="grid grid-cols-1 gap-1">
                          {['sine', 'triangle', 'square', 'sawtooth'].map(w => (
                            <button key={w} onClick={() => onChange({ harpWaveform: w as WaveformType })} className={`py-1.5 rounded text-[10px] font-black border-2 transition-all ${state.harpWaveform === w ? 'bg-orange-600 text-black border-orange-400' : 'text-orange-800 border-orange-900/40 hover:text-orange-500'}`}>{w}</button>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col gap-2 pt-4 border-t-2 border-orange-600/10">
                   <h3 className="text-[11px] text-amber-300 tracking-widest text-center uppercase font-black">VIBRATO / LFO</h3>
                   <div className="grid grid-cols-2 gap-4 justify-items-center">
                      <Knob label="AMOUNT" size="sm" color="orange-400" labelColor="text-amber-300/80" value={state.vibratoAmount} onChange={(v) => onChange({ vibratoAmount: v })} />
                      <Knob label="RATE" size="sm" color="orange-400" labelColor="text-amber-300/80" value={state.vibratoRate / 20} onChange={(v) => onChange({ vibratoRate: v * 20 })} />
                   </div>
                </div>
             </div>
             <button onClick={onReset} className="px-8 py-3 bg-[#800] text-white text-[14px] font-black tracking-widest rounded-full uppercase shadow-lg hover:brightness-110 active:translate-y-0.5 transition-all">Factory Reset</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;