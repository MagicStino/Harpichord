export type ChordType = 'major' | 'minor' | '7th';

export interface ChordDefinition {
  root: string;
  label: string;
  intervals: number[];
  key: string;
  modeName: string; // Added for LCD display
}

export enum RhythmPattern {
  NONE = 'None',
  ROCK1 = 'Rock 1',
  ROCK2 = 'Rock 2',
  DISCO = 'Disco',
  EIGHT_BEAT = '8 Beat',
  SIXTEEN_BEAT = '16 Beat',
  COUNTRY = 'Country',
  SHUFFLE = 'Shuffle',
  HIPHOP = 'Hip Hop',
  BLUES = 'Blues',
  WALTZ = 'Waltz',
  JAZZ_WALTZ = 'Jazz Waltz',
  LATIN = 'Latin',
  BOSSA = 'Bossa Nova',
  REGGAE = 'Reggae',
  TANGO = 'Tango'
}

export type DelayDivision = '1/4' | '1/4D' | '1/4T' | '1/8' | '1/8D' | '1/8T' | '1/16' | '1/16D' | '1/16T' | '1/3' | '1/5';
export type WaveformType = 'square' | 'sawtooth' | 'triangle' | 'sine';

export interface OmnichordState {
  currentChord: ChordDefinition | null;
  chordPage: number; // 0, 1, or 2
  chordVolume: number;
  harpVolume: number;
  rhythmVolume: number;
  bassVolume: number;
  sustain: number;
  tempo: number;
  rhythm: RhythmPattern;
  isPlaying: boolean;
  useTouchpad: boolean;
  octave: number;
  harpOctave: number; // -2 to +2
  chordCutoff: number;
  harpCutoff: number;
  rhythmCutoff: number;
  bassEnabled: boolean;
  bassWaveformMix: number; // 0 = Sine, 1 = Square
  
  // Master Tube Saturation
  tubeEnabled: boolean;
  tubeDrive: number;
  tubeWet: number;
  tubePreset: 'clean' | 'soft' | 'warm' | 'hot';
  
  // FX Parameters
  delayDivision: DelayDivision;
  delayFeedback: number;
  delayTone: number; 
  delaySpread: number;
  
  reverbSize: number;
  reverbDamp: number;
  reverbWidth: number; 
  reverbColor: number;
  
  // Individual Sends (Mix Ratios)
  chordDelaySend: number;
  chordReverbSend: number;
  harpDelaySend: number;
  harpReverbSend: number;
  rhythmDelaySend: number;
  rhythmReverbSend: number;

  // Sound Tweak Parameters
  chordWaveform: WaveformType;
  harpWaveform: WaveformType;
  vibratoAmount: number;
  vibratoRate: number;
}