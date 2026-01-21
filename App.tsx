import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { OmnichordState, ChordDefinition, RhythmPattern, DelayDivision } from './types';
import { 
  MAJOR_CHORDS, MINOR_CHORDS, DOM7_CHORDS,
  MIN7_CHORDS, MAJ7_CHORDS, ADD9_CHORDS,
  SUS4_CHORDS, POWER_CHORDS, DIM_CHORDS,
  HARP_KEYS 
} from './constants';
import { audioEngine } from './services/audioEngine';
import { midiService } from './services/midiService';
import ChordGrid from './components/ChordGrid';
import SonicStrings from './components/SonicStrings';
import ControlPanel from './components/ControlPanel';

const STORAGE_KEY = 'harpichord_v1_state';

const INITIAL_STATE: OmnichordState = {
  currentChord: null,
  chordPage: 0,
  chordVolume: 0.25,
  harpVolume: 0.50,
  rhythmVolume: 0.8,
  bassVolume: 0.5,
  sustain: 0.4,
  tempo: 120,
  rhythm: RhythmPattern.NONE,
  isPlaying: false,
  useTouchpad: false,
  octave: 0,
  chordCutoff: 0.35,
  harpCutoff: 0.7,   
  rhythmCutoff: 1.0,
  bassEnabled: false,
  // Tube Saturation
  tubeEnabled: false,
  tubeDrive: 0.2,
  tubeWet: 0.4,
  tubePreset: 'soft',
  // FX Defaults
  delayDivision: '1/8',
  delayFeedback: 0.4,
  delayTone: 0.5,
  delaySpread: 0.3,
  reverbSize: 0.6,
  reverbDamp: 0.3,
  reverbWidth: 0.5,
  reverbColor: 0.2,
  // Individual Sends (Dry/Wet Ratios)
  chordDelaySend: 0.0,
  chordReverbSend: 0.1,
  harpDelaySend: 0.3,
  harpReverbSend: 0.3,
  rhythmDelaySend: 0.1,
  rhythmReverbSend: 0.05,
  // Sound
  chordWaveform: 'square',
  harpWaveform: 'triangle',
  vibratoAmount: 0,
  vibratoRate: 5,
};

const App: React.FC = () => {
  const [state, setState] = useState<OmnichordState>(INITIAL_STATE);
  const [initialized, setInitialized] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const lastZone = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, ...parsed, currentChord: null, isPlaying: false, useTouchpad: false }));
      } catch (e) {
        console.warn("Autoload corrupted:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const { currentChord, isPlaying, useTouchpad, rhythm, ...savable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savable));
  }, [state, initialized]);

  const updateScale = useCallback(() => {
    const baseW = 1780; 
    const baseH = 1000; 
    const padding = 20;
    const ratio = Math.min((window.innerWidth - padding) / baseW, (window.innerHeight - padding) / baseH);
    setScale(Math.max(0.3, ratio)); 
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const syncEngine = useCallback((s: OmnichordState) => {
    audioEngine.setChordVolume(s.chordVolume);
    audioEngine.setHarpVolume(s.harpVolume);
    audioEngine.setRhythmVolume(s.rhythmVolume);
    audioEngine.setBassVolume(s.bassVolume);
    audioEngine.setSustain(s.sustain);
    audioEngine.setTempo(s.tempo);
    audioEngine.setOctave(s.octave);
    audioEngine.setChordCutoff(s.chordCutoff);
    audioEngine.setHarpCutoff(s.harpCutoff);
    audioEngine.setRhythmCutoff(s.rhythmCutoff);
    audioEngine.setBassEnabled(s.bassEnabled);
    audioEngine.setTubeAmp(s.tubeEnabled, s.tubeDrive, s.tubeWet);
    audioEngine.setChordWaveform(s.chordWaveform);
    audioEngine.setHarpWaveform(s.harpWaveform);
    audioEngine.setVibrato(s.vibratoAmount, s.vibratoRate);
    audioEngine.updateDelay(s.delayDivision, s.delayFeedback, s.delayTone, s.delaySpread);
    audioEngine.updateReverb(s.reverbSize, s.reverbDamp, s.reverbWidth, s.reverbColor);
    audioEngine.setSends({
      chordDelay: s.chordDelaySend, chordReverb: s.chordReverbSend,
      harpDelay: s.harpDelaySend, harpReverb: s.harpReverbSend,
      rhythmDelay: s.rhythmDelaySend, rhythmReverb: s.rhythmReverbSend,
    });
  }, []);

  const handleChordPress = useCallback((chord: ChordDefinition | null) => {
    if (!chord) return;
    initAudio(); 
    audioEngine.playChord(chord);
    midiService.sendChord(chord);
    setState(prev => ({ ...prev, currentChord: chord }));
  }, [initialized, state]); 

  const handleHarpTrigger = useCallback((index: number) => {
    if (state.currentChord) {
      audioEngine.playHarpNote(state.currentChord, index);
      midiService.sendHarpNote(index);
    }
  }, [state.currentChord]);

  const initAudio = useCallback(() => {
    if (!initialized) {
      audioEngine.init();
      syncEngine(state);
      midiService.init(
        (chord) => handleChordPress(chord as ChordDefinition),
        (index) => handleHarpTrigger(index)
      ).then(() => { if (midiService.error) setMidiError(midiService.error); });
      setInitialized(true);
    }
  }, [initialized, state, syncEngine]);

  useEffect(() => {
    const timer = setTimeout(() => { initAudio(); }, 3000);
    return () => clearTimeout(timer);
  }, [initAudio]);

  const handleKillChord = useCallback(() => {
    audioEngine.stopChord(true);
    audioEngine.stopRhythm();
    midiService.sendChord(null);
    setState(prev => ({ ...prev, currentChord: null, rhythm: RhythmPattern.NONE }));
  }, []);

  const handleStateChange = useCallback((updates: Partial<OmnichordState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (updates.chordVolume !== undefined) audioEngine.setChordVolume(newState.chordVolume);
      if (updates.harpVolume !== undefined) audioEngine.setHarpVolume(newState.harpVolume);
      if (updates.rhythmVolume !== undefined) audioEngine.setRhythmVolume(newState.rhythmVolume);
      if (updates.bassVolume !== undefined) audioEngine.setBassVolume(newState.bassVolume);
      if (updates.sustain !== undefined) audioEngine.setSustain(newState.sustain);
      if (updates.tempo !== undefined) {
        audioEngine.setTempo(newState.tempo);
        audioEngine.updateDelay(newState.delayDivision, newState.delayFeedback, newState.delayTone, newState.delaySpread);
        if (newState.rhythm !== RhythmPattern.NONE) audioEngine.startRhythm(newState.rhythm);
      }
      if (updates.rhythm !== undefined) {
        if (newState.rhythm === RhythmPattern.NONE) audioEngine.stopRhythm();
        else audioEngine.startRhythm(newState.rhythm);
      }
      if (updates.octave !== undefined) {
        audioEngine.setOctave(newState.octave);
        if (newState.currentChord) audioEngine.playChord(newState.currentChord);
      }
      if (updates.chordCutoff !== undefined) audioEngine.setChordCutoff(newState.chordCutoff);
      if (updates.harpCutoff !== undefined) audioEngine.setHarpCutoff(newState.harpCutoff);
      if (updates.rhythmCutoff !== undefined) audioEngine.setRhythmCutoff(newState.rhythmCutoff);
      if (updates.bassEnabled !== undefined) {
          audioEngine.setBassEnabled(newState.bassEnabled);
          if (newState.currentChord) audioEngine.playChord(newState.currentChord);
      }
      if (updates.tubeEnabled !== undefined || updates.tubeDrive !== undefined || updates.tubeWet !== undefined) {
          audioEngine.setTubeAmp(newState.tubeEnabled, newState.tubeDrive, newState.tubeWet);
      }
      if (updates.chordWaveform !== undefined) {
          audioEngine.setChordWaveform(newState.chordWaveform);
          if (newState.currentChord) audioEngine.playChord(newState.currentChord);
      }
      if (updates.harpWaveform !== undefined) {
          audioEngine.setHarpWaveform(newState.harpWaveform);
          if (newState.currentChord) audioEngine.playChord(newState.currentChord);
      }
      if (updates.vibratoAmount !== undefined || updates.vibratoRate !== undefined) {
          audioEngine.setVibrato(newState.vibratoAmount, newState.vibratoRate);
          if (newState.currentChord) audioEngine.playChord(newState.currentChord);
      }
      if (updates.delayDivision !== undefined || updates.delayFeedback !== undefined || updates.delayTone !== undefined || updates.delaySpread !== undefined) {
          audioEngine.updateDelay(newState.delayDivision, newState.delayFeedback, newState.delayTone, newState.delaySpread);
      }
      if (updates.reverbSize !== undefined || updates.reverbDamp !== undefined || updates.reverbWidth !== undefined || updates.reverbColor !== undefined) {
          audioEngine.updateReverb(newState.reverbSize, newState.reverbDamp, newState.reverbWidth, newState.reverbColor);
      }
      const sendKeys = ['chordDelaySend', 'chordReverbSend', 'harpDelaySend', 'harpReverbSend', 'rhythmDelaySend', 'rhythmReverbSend'];
      if (sendKeys.some(k => updates.hasOwnProperty(k))) {
          audioEngine.setSends({
            chordDelay: newState.chordDelaySend, chordReverb: newState.chordReverbSend,
            harpDelay: newState.harpDelaySend, harpReverb: newState.harpReverbSend,
            rhythmDelay: newState.rhythmDelaySend, rhythmReverb: newState.rhythmReverbSend,
          });
      }
      return newState;
    });
  }, []);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
    syncEngine(INITIAL_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, [syncEngine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio(); 
      if (e.key === 'Tab') {
        e.preventDefault();
        setState(prev => ({ ...prev, chordPage: (prev.chordPage + 1) % 3 }));
        return;
      }
      if (e.key === 'Escape') { setState(prev => ({ ...prev, useTouchpad: false })); return; }

      const key = e.key.toUpperCase();
      let currentSetChords: ChordDefinition[] = [];
      switch (state.chordPage) {
        case 1: currentSetChords = [...MIN7_CHORDS, ...MAJ7_CHORDS, ...ADD9_CHORDS]; break;
        case 2: currentSetChords = [...SUS4_CHORDS, ...POWER_CHORDS, ...DIM_CHORDS]; break;
        default: currentSetChords = [...MAJOR_CHORDS, ...MINOR_CHORDS, ...DOM7_CHORDS];
      }

      const chordMatch = currentSetChords.find(c => {
          const cKey = c.key.toUpperCase();
          if (cKey === 'SHIFT' && e.shiftKey) return true;
          if (cKey === 'ENTER' && e.key === 'Enter') return true;
          if (cKey === 'CONTROL' && (e.ctrlKey || e.metaKey)) return true;
          return cKey === key || c.key === e.key;
      });

      if (chordMatch) {
        e.preventDefault();
        handleChordPress(chordMatch);
        return;
      }

      if (HARP_KEYS.includes(e.key)) {
        handleHarpTrigger(HARP_KEYS.indexOf(e.key));
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.chordPage, handleChordPress, handleHarpTrigger, initAudio]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!state.useTouchpad) return;
      const zonesCount = 14; 
      const zone = Math.floor((e.clientY / window.innerHeight) * zonesCount);
      if (zone !== lastZone.current && zone >= 0 && zone < zonesCount) {
        handleHarpTrigger((zonesCount - 1) - zone);
        lastZone.current = zone;
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [state.useTouchpad, handleHarpTrigger]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] overflow-hidden select-none">
      {!initialized && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl">
          <div className="flex flex-col items-center animate-pulse duration-[3000ms]">
            <h1 className="branding-text text-8xl text-amber-600 mb-2 tracking-tighter uppercase font-black italic">HARPICHORD</h1>
            <span className="text-amber-700/40 text-[11px] font-black uppercase tracking-[0.8em] mb-12">V4.08 • 2026</span>
            <div className="w-28 h-28 flex items-center justify-center rounded-full border-4 border-amber-600 bg-black">
               <div className="w-4 h-4 rounded-full bg-amber-600 animate-ping" />
            </div>
          </div>
          <p className="mt-16 text-amber-600/20 text-[10px] uppercase tracking-[1em] font-black">BOOTING CORE...</p>
        </div>
      )}

      {state.useTouchpad && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] pointer-events-none flex flex-col items-center gap-1">
            <div className="bg-amber-600 text-black px-8 py-2.5 rounded-full border-2 border-amber-400 font-black text-[12px] uppercase tracking-widest animate-pulse shadow-[0_0_30px_rgba(217,119,6,0.5)]">
                SENSORY TOUCHPAD ACTIVE • STRUM MOUSE VERTICALLY
            </div>
        </div>
      )}

      {/* SCALE WRAPPER - Increased height and width, border-16px for thinner outer chrome */}
      <div 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'center center',
          width: '1780px',
          height: '1000px',
          flexShrink: 0
        }} 
        className="omnichord-body pt-10 pb-16 px-16 rounded-[7.5rem] border-[16px] border-[#c4b598] relative transition-all shadow-[0_120px_240px_rgba(0,0,0,1)] flex flex-col justify-between"
      >
        {/* SMALLER TOP DECORATION BUMPER */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1060px] h-4 bg-black/5 rounded-b-[2rem] border-b border-black/5" />
        
        {/* COMPACT HEADER - Moved up (pt-0) */}
        <div className="flex justify-between items-start w-full px-24 pt-0">
          <div className="flex flex-col">
            {/* HARPICHORD TITLE - 20% Smaller (text-7xl to text-6xl) */}
            <span className="branding-text text-6xl tracking-[-0.08em] opacity-90 leading-none">HARPICHORD</span>
            <span className="text-[12px] font-black tracking-[0.5em] text-amber-900/40 uppercase mt-2 italic">STIJN DE RYCK • 2026</span>
          </div>
          <div className="flex items-center gap-10 bg-black/10 px-10 py-4 rounded-full border border-black/10 shadow-inner">
            <div className={`w-7 h-7 rounded-full border-2 border-black/40 transition-all duration-700 ${initialized ? 'bg-green-600 shadow-[0_0_40px_rgba(22,163,74,0.8)]' : 'bg-green-950'}`} />
            <div className="w-0.5 h-10 bg-black/15 rounded-full" />
            <div className="flex flex-col justify-center">
                {/* VERSION ONLY */}
                <span className="text-[11px] font-black text-amber-900/60 tracking-[0.3em] uppercase leading-none">VERSION V4.08</span>
            </div>
          </div>
        </div>

        {/* INTERFACE MODULES - Hard Horizontal Buffer (px-96) for spacious layout */}
        <div className="flex w-full gap-16 items-stretch justify-center px-96 flex-1 mt-4">
          <div className="w-[30%] min-w-[440px]">
            <ControlPanel state={state} onChange={handleStateChange} onReset={handleReset} />
          </div>

          <div className="flex-1 flex flex-col gap-10 items-center justify-center">
            <div className="w-full h-full bg-[#dcd0b8] rounded-[5rem] border-[12px] border-[#bdae93] shadow-[inset_0_25px_50px_rgba(0,0,0,0.2)] flex items-center justify-center p-8">
              <ChordGrid 
                activeChord={state.currentChord} 
                currentPage={state.chordPage}
                onPress={handleChordPress} 
                onRelease={() => {}} 
                onSetPage={(p) => handleStateChange({ chordPage: p })}
              />
            </div>
            
            <div className="flex items-center gap-12 mt-4">
                <div className="w-48 h-[1.5px] bg-amber-900/20" />
                <button onClick={handleKillChord} className="w-[90px] h-[90px] rounded-full bg-[#b00] border-[10px] border-[#800] shadow-[0_12px_0_#500] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center cursor-pointer group relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[14px] font-black text-white uppercase text-center leading-tight tracking-widest group-active:scale-90 transition-transform relative z-10">RESET<br/><span className="text-[11px] opacity-60 font-bold">KILL</span></span>
                </button>
                <div className="w-48 h-[1.5px] bg-amber-900/20" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-10">
             <SonicStrings currentChord={state.currentChord} useTouchpad={state.useTouchpad} onTrigger={handleHarpTrigger} />
             <button onClick={() => handleStateChange({ useTouchpad: !state.useTouchpad })} className={`w-[90px] h-[90px] rounded-[2rem] border-[10px] transition-all flex items-center justify-center cursor-pointer shadow-[0_12px_0_#222] active:translate-y-2 active:shadow-none group ${state.useTouchpad ? 'bg-amber-600 border-amber-800' : 'bg-[#1a1a1a] border-[#0a0a0a]'}`}>
                <div className="flex flex-col items-center leading-none text-white group-active:scale-90 transition-transform">
                    <span className={`text-[12px] font-black tracking-widest mb-2 ${state.useTouchpad ? 'text-black' : 'opacity-40'}`}>TOUCH</span>
                    <span className={`text-[12px] font-black tracking-widest ${state.useTouchpad ? 'text-black' : ''}`}>PAD</span>
                </div>
             </button>
          </div>
        </div>

        {/* CLEAN FOOTER */}
        <div className="pb-10 flex justify-end px-48 opacity-40">
            <div className="flex gap-10">
                <div className="w-8 h-8 rounded-full bg-amber-900/20" />
                <div className="w-8 h-8 rounded-full bg-amber-900/20" />
                <div className="w-8 h-8 rounded-full bg-amber-900/20" />
            </div>
        </div>
      </div>
      <Analytics />
    </div>
  );
};

export default App;