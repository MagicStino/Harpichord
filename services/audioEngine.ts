import { ChordDefinition, RhythmPattern, DelayDivision, WaveformType } from '../types';

class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private chordSource: GainNode | null = null;
  private harpSource: GainNode | null = null;
  private rhythmSource: GainNode | null = null;
  private bassSource: GainNode | null = null;
  private rhythmFilterBus: BiquadFilterNode | null = null;

  private masterTubeIn: GainNode | null = null;
  private masterTubeDry: GainNode | null = null;
  private masterTubeWet: GainNode | null = null;
  private masterTubeAmp: WaveShaperNode | null = null;
  private masterTubeOut: GainNode | null = null;

  private chordDry: GainNode | null = null;
  private chordDelaySend: GainNode | null = null;
  private chordReverbSend: GainNode | null = null;
  
  private harpDry: GainNode | null = null;
  private harpDelaySend: GainNode | null = null;
  private harpReverbSend: GainNode | null = null;
  
  private rhythmDry: GainNode | null = null;
  private rhythmDelaySend: GainNode | null = null;
  private rhythmReverbSend: GainNode | null = null;

  private delayNodeL: DelayNode | null = null;
  private delayNodeR: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private delayOutput: GainNode | null = null;
  private delayMerger: ChannelMergerNode | null = null;

  private reverbNodes: DelayNode[] = [];
  private reverbGains: GainNode[] = [];
  private reverbFilter: BiquadFilterNode | null = null;
  private reverbPanner: StereoPannerNode | null = null;
  private reverbOutput: GainNode | null = null;

  private chordOscillators: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode }[] = [];
  private bassOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  
  private activeBassGainSine: GainNode | null = null;
  private activeBassGainSaw: GainNode | null = null;
  
  private sustainValue: number = 0.5;
  private chordAttack: number = 0.05;
  private chordRelease: number = 0.2;
  private tempo: number = 120;
  private rhythmInterval: number | null = null;
  private octaveShift: number = 0;
  private harpOctaveShift: number = 0;
  private chordCutoff: number = 0.5;
  private harpCutoff: number = 0.8;
  private rhythmCutoff: number = 1.0;
  private bassEnabled: boolean = false;
  private bassWaveformMix: number = 0;

  private chordWaveform: WaveformType = 'square';
  private harpWaveform: WaveformType = 'triangle';
  private vibratoAmount: number = 0;
  private vibratoRate: number = 5;

  private firstChordPlayed: boolean = false;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await this.ctx.resume();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.masterGain = this.ctx.createGain();
    // Initially silent
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.masterTubeIn = this.ctx.createGain();
    this.masterTubeDry = this.ctx.createGain();
    this.masterTubeWet = this.ctx.createGain();
    this.masterTubeAmp = this.ctx.createWaveShaper();
    this.masterTubeOut = this.ctx.createGain();
    this.masterTubeAmp.curve = this.makeDistortionCurve(0.2);

    this.masterTubeIn.connect(this.masterTubeDry);
    this.masterTubeIn.connect(this.masterTubeAmp);
    this.masterTubeAmp.connect(this.masterTubeWet);
    this.masterTubeDry.connect(this.masterTubeOut);
    this.masterTubeWet.connect(this.masterTubeOut);

    this.chordSource = this.ctx.createGain();
    this.harpSource = this.ctx.createGain();
    this.rhythmSource = this.ctx.createGain();
    this.bassSource = this.ctx.createGain();
    
    this.rhythmFilterBus = this.ctx.createBiquadFilter();
    this.rhythmFilterBus.type = 'lowpass';
    this.rhythmFilterBus.frequency.value = 20000;
    this.rhythmSource.connect(this.rhythmFilterBus);

    this.chordDry = this.ctx.createGain();
    this.chordDelaySend = this.ctx.createGain();
    this.chordReverbSend = this.ctx.createGain();
    this.chordSource.connect(this.chordDry);
    this.chordSource.connect(this.chordDelaySend);
    this.chordSource.connect(this.chordReverbSend);

    this.harpDry = this.ctx.createGain();
    this.harpDelaySend = this.ctx.createGain();
    this.harpReverbSend = this.ctx.createGain();
    this.harpSource.connect(this.harpDry);
    this.harpSource.connect(this.harpDelaySend);
    this.harpSource.connect(this.harpReverbSend);

    this.rhythmDry = this.ctx.createGain();
    this.rhythmDelaySend = this.ctx.createGain();
    this.rhythmReverbSend = this.ctx.createGain();
    this.rhythmFilterBus.connect(this.rhythmDry);
    this.rhythmFilterBus.connect(this.rhythmDelaySend);
    this.rhythmFilterBus.connect(this.rhythmReverbSend);

    this.delayNodeL = this.ctx.createDelay(4.0);
    this.delayNodeR = this.ctx.createDelay(4.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayMerger = this.ctx.createChannelMerger(2);
    this.delayOutput = this.ctx.createGain();

    [this.chordDelaySend, this.harpDelaySend, this.rhythmDelaySend].forEach(n => n.connect(this.delayFilter!));
    this.delayFilter.connect(this.delayNodeL);
    this.delayFilter.connect(this.delayNodeR);
    this.delayNodeL.connect(this.delayFeedback);
    this.delayNodeR.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayFilter);
    this.delayNodeL.connect(this.delayMerger, 0, 0);
    this.delayNodeR.connect(this.delayMerger, 0, 1);
    this.delayMerger.connect(this.delayOutput);
    this.delayOutput.connect(this.masterGain);

    this.reverbFilter = this.ctx.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbPanner = this.ctx.createStereoPanner();
    this.reverbOutput = this.ctx.createGain();

    const times = [0.033, 0.037, 0.041, 0.043, 0.047, 0.051, 0.059, 0.067];
    times.forEach(t => {
      const d = this.ctx!.createDelay(1.0);
      d.delayTime.value = t;
      const g = this.ctx!.createGain();
      g.gain.value = 0.7;
      [this.chordReverbSend!, this.harpReverbSend!, this.rhythmReverbSend!].forEach(n => n.connect(d));
      d.connect(g);
      g.connect(d); 
      g.connect(this.reverbFilter!);
      this.reverbNodes.push(d);
      this.reverbGains.push(g);
    });
    this.reverbFilter.connect(this.reverbPanner);
    this.reverbPanner.connect(this.reverbOutput);
    this.reverbOutput.connect(this.masterGain);

    [this.chordDry, this.harpDry, this.rhythmDry, this.bassSource].forEach(n => n.connect(this.masterGain!));

    this.masterGain.connect(this.masterTubeIn);
    this.masterTubeOut.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    
    this.compressor.threshold.setValueAtTime(-26, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(1.5, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
  }

  private makeDistortionCurve(amount: number) {
    const k = amount * 40; 
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = i * 2 / n_samples - 1;
      curve[i] = ( (3 + k) * x * 20 * (Math.PI / 180) ) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setTubeAmp(enabled: boolean, drive: number, wet: number) {
    if (!this.ctx || !this.masterTubeDry || !this.masterTubeWet || !this.masterTubeAmp) return;
    const now = this.ctx.currentTime;
    this.masterTubeAmp.curve = this.makeDistortionCurve(drive);
    if (enabled) {
      this.masterTubeDry.gain.setTargetAtTime(1 - wet, now, 0.05);
      this.masterTubeWet.gain.setTargetAtTime(wet, now, 0.05);
    } else {
      this.masterTubeDry.gain.setTargetAtTime(1, now, 0.05);
      this.masterTubeWet.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  setChordVolume(v: number) { this.chordSource?.gain.setTargetAtTime(v * 0.25, this.ctx!.currentTime, 0.05); }
  setHarpVolume(v: number) { this.harpSource?.gain.setTargetAtTime(v * 0.50, this.ctx!.currentTime, 0.05); }
  setRhythmVolume(v: number) { this.rhythmSource?.gain.setTargetAtTime(v * 1.8, this.ctx!.currentTime, 0.05); }
  setBassVolume(v: number) { this.bassSource?.gain.setTargetAtTime(v * 0.8, this.ctx!.currentTime, 0.05); }
  
  setSustain(s: number) { this.sustainValue = s; }
  setChordAttack(v: number) { this.chordAttack = Math.max(0.001, v); }
  setChordRelease(v: number) { this.chordRelease = Math.max(0.01, v); }
  setTempo(t: number) { this.tempo = t; }
  setOctave(o: number) { this.octaveShift = o; }
  setHarpOctave(o: number) { this.harpOctaveShift = o; }
  setBassEnabled(enabled: boolean) { this.bassEnabled = enabled; }
  
  setBassWaveformMix(mix: number) { 
    this.bassWaveformMix = mix; 
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.activeBassGainSine) this.activeBassGainSine.gain.setTargetAtTime(0.5 * (1 - mix), now, 0.05);
    if (this.activeBassGainSaw) this.activeBassGainSaw.gain.setTargetAtTime(0.25 * mix, now, 0.05);
  }
  
  setChordCutoff(v: number) {
    this.chordCutoff = v;
    const freq = 100 + (v * 4000);
    if (this.ctx) this.chordOscillators.forEach(({ filter }) => filter.frequency.setTargetAtTime(freq, this.ctx!.currentTime, 0.1));
  }
  setHarpCutoff(v: number) { this.harpCutoff = v; }
  setRhythmCutoff(v: number) {
    this.rhythmCutoff = v;
    if (this.rhythmFilterBus && this.ctx) {
      const freq = 100 + (v * 19000);
      this.rhythmFilterBus.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }
  }

  setChordWaveform(w: WaveformType) { this.chordWaveform = w; }
  setHarpWaveform(w: WaveformType) { this.harpWaveform = w; }
  setVibrato(amount: number, rate: number) { this.vibratoAmount = amount; this.vibratoRate = rate; }

  updateDelay(division: DelayDivision, feedback: number, tone: number, spread: number) {
    if (!this.delayNodeL || !this.delayNodeR || !this.delayFeedback || !this.delayFilter) return;
    const beatSec = 60 / this.tempo;
    let mult = 1.0;
    switch(division) {
      case '1/4': mult = 1.0; break;
      case '1/4D': mult = 1.5; break;
      case '1/4T': mult = 0.6666; break;
      case '1/8': mult = 0.5; break;
      case '1/8D': mult = 0.75; break;
      case '1/8T': mult = 0.3333; break;
      case '1/16': mult = 0.25; break;
      case '1/16D': mult = 0.375; break;
      case '1/16T': mult = 0.1666; break;
      case '1/3': mult = 0.3333; break;
      case '1/5': mult = 0.2; break;
    }
    const time = beatSec * mult;
    this.delayNodeL.delayTime.setTargetAtTime(time, this.ctx!.currentTime, 0.1);
    this.delayNodeR.delayTime.setTargetAtTime(time * (1 + spread * 0.1), this.ctx!.currentTime, 0.1);
    
    const scaledFeedback = Math.pow(feedback, 2.5);
    this.delayFeedback.gain.setTargetAtTime(scaledFeedback, this.ctx!.currentTime, 0.1);
    this.delayFilter.frequency.setTargetAtTime(200 + (tone * 14000), this.ctx!.currentTime, 0.1);
  }

  updateReverb(size: number, damp: number, width: number, color: number) {
    if (!this.reverbFilter || !this.reverbPanner) return;
    this.reverbFilter.frequency.setTargetAtTime(200 + (1.0 - damp) * 19000, this.ctx!.currentTime, 0.1);
    this.reverbFilter.Q.setTargetAtTime(color * 8, this.ctx!.currentTime, 0.1);
    const decay = 0.3 + size * 0.68; 
    this.reverbGains.forEach(g => g.gain.setTargetAtTime(decay, this.ctx!.currentTime, 0.1));
    this.reverbPanner.pan.setTargetAtTime((width - 0.5) * 2, this.ctx!.currentTime, 0.1);
  }

  setSends(params: {
    chordDelay: number; chordReverb: number;
    harpDelay: number; harpReverb: number;
    rhythmDelay: number; rhythmReverb: number;
  }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const calcDry = (d: number, r: number) => clamp(1.0 - d - r);

    this.chordDry?.gain.setTargetAtTime(calcDry(params.chordDelay, params.chordReverb), now, 0.05);
    this.chordDelaySend?.gain.setTargetAtTime(params.chordDelay, now, 0.05);
    this.chordReverbSend?.gain.setTargetAtTime(params.chordReverb, now, 0.05);

    this.harpDry?.gain.setTargetAtTime(calcDry(params.harpDelay, params.harpReverb), now, 0.05);
    this.harpDelaySend?.gain.setTargetAtTime(params.harpDelay, now, 0.05);
    this.harpReverbSend?.gain.setTargetAtTime(params.harpReverb, now, 0.05);

    this.rhythmDry?.gain.setTargetAtTime(calcDry(params.rhythmDelay, params.rhythmReverb), now, 0.05);
    this.rhythmDelaySend?.gain.setTargetAtTime(params.rhythmDelay, now, 0.05);
    this.rhythmReverbSend?.gain.setTargetAtTime(params.rhythmReverb, now, 0.05);
  }

  async playChord(chord: ChordDefinition) {
    if (!this.ctx) await this.init();
    if (this.ctx!.state === 'suspended') await this.ctx!.resume();
    
    const now = this.ctx!.currentTime;
    const currentRelease = this.chordRelease;

    if (!this.firstChordPlayed) {
      // FIX V4.30: Silence buffer for 0.15s, then ramp up over 0.3s (time constant ~0.1)
      const bootSilence = 0.15;
      this.masterGain!.gain.setValueAtTime(0, now);
      this.masterGain!.gain.setValueAtTime(0, now + bootSilence);
      this.masterGain!.gain.setTargetAtTime(1, now + bootSilence, 0.1);
      this.firstChordPlayed = true;
    }
    
    this.chordOscillators.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, currentRelease);
      osc.stop(now + currentRelease * 4);
    });
    this.chordOscillators = [];
    
    this.bassOscillators.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, currentRelease);
      osc.stop(now + currentRelease * 4);
    });
    this.bassOscillators = [];

    if (this.bassEnabled) {
      const bassInterval = chord.intervals[0] - 12;
      const freq = 130.81 * Math.pow(2, this.octaveShift) * Math.pow(2, bassInterval / 12);
      
      const oscSine = this.ctx!.createOscillator();
      const gainSine = this.ctx!.createGain();
      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(freq, now);
      gainSine.gain.setValueAtTime(0, now);
      gainSine.gain.setTargetAtTime(0.5 * (1 - this.bassWaveformMix), now, this.chordAttack);
      oscSine.connect(gainSine);
      gainSine.connect(this.bassSource!);
      oscSine.start();
      this.activeBassGainSine = gainSine;

      const oscSaw = this.ctx!.createOscillator();
      const gainSaw = this.ctx!.createGain();
      const lpf = this.ctx!.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(800, now);
      oscSaw.type = 'sawtooth';
      oscSaw.frequency.setValueAtTime(freq, now);
      gainSaw.gain.setValueAtTime(0, now);
      gainSaw.gain.setTargetAtTime(0.25 * this.bassWaveformMix, now, this.chordAttack);
      oscSaw.connect(lpf);
      lpf.connect(gainSaw);
      gainSaw.connect(this.bassSource!);
      oscSaw.start();
      this.activeBassGainSaw = gainSaw;

      this.bassOscillators.push({ osc: oscSine, gain: gainSine });
      this.bassOscillators.push({ osc: oscSaw, gain: gainSaw });
    }

    chord.intervals.forEach((interval) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();
      osc.type = this.chordWaveform;
      osc.frequency.setValueAtTime(130.81 * Math.pow(2, this.octaveShift) * Math.pow(2, interval / 12), now);
      
      if (this.vibratoAmount > 0) {
        const lfo = this.ctx!.createOscillator();
        const lfoG = this.ctx!.createGain();
        lfo.frequency.value = this.vibratoRate;
        lfoG.gain.value = this.vibratoAmount * 12;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        lfo.start();
      }
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100 + (this.chordCutoff * 5000), now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(0.2, now, this.chordAttack);
      osc.connect(filter); filter.connect(gain); gain.connect(this.chordSource!);
      osc.start(); this.chordOscillators.push({ osc, gain, filter });
    });
  }

  stopChord(immediate = false) {
    if (!this.chordSource || !this.ctx) return;
    const now = this.ctx.currentTime;
    const releaseTime = immediate ? 0.02 : this.chordRelease;
    this.chordOscillators.forEach(({ gain, osc }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, releaseTime);
      osc.stop(now + releaseTime * 4);
    });
    this.bassOscillators.forEach(({ gain, osc }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, releaseTime);
      osc.stop(now + releaseTime * 4);
    });
    this.chordOscillators = [];
    this.bassOscillators = [];
  }

  async playHarpNote(chord: ChordDefinition, stringIndex: number) {
    if (!this.ctx) await this.init();
    if (this.ctx!.state === 'suspended') await this.ctx!.resume();
    const now = this.ctx!.currentTime;
    if (!this.firstChordPlayed) {
      const bootSilence = 0.15;
      this.masterGain!.gain.setValueAtTime(0, now);
      this.masterGain!.gain.setValueAtTime(0, now + bootSilence);
      this.masterGain!.gain.setTargetAtTime(1, now + bootSilence, 0.1);
      this.firstChordPlayed = true;
    }
    const intervalIndex = stringIndex % chord.intervals.length;
    const octaveOffset = Math.floor(stringIndex / chord.intervals.length);
    const freq = 261.63 * Math.pow(2, this.octaveShift + this.harpOctaveShift) * Math.pow(2, (chord.intervals[intervalIndex] + (octaveOffset * 12)) / 12);
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    osc.type = this.harpWaveform;
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    const baseCutoff = 800 + (this.harpCutoff * 9000);
    filter.frequency.setValueAtTime(baseCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(baseCutoff * 0.2, now + 0.4);
    gain.gain.setValueAtTime(0.4, now);
    const decay = 0.6 + (this.sustainValue * 5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc.connect(filter); filter.connect(gain); gain.connect(this.harpSource!);
    osc.start(); osc.stop(now + decay + 0.1);
  }

  startRhythm(pattern: RhythmPattern) {
    this.stopRhythm();
    if (pattern === RhythmPattern.NONE || !this.ctx) return;
    const beatLen = 60 / this.tempo;
    let step = 0;
    this.rhythmInterval = window.setInterval(() => {
      const s = step % 16;
      switch(pattern) {
        case RhythmPattern.ROCK1: if (s%4==0) this.playDrum('kick'); if (s%4==2) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.ROCK2: if (s==0||s==3) this.playDrum('kick'); if (s==4||s==12) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.DISCO: if (s%4==0) this.playDrum('kick'); if (s%4==2) this.playDrum('snare'); this.playDrum('hihat'); break;
        case RhythmPattern.EIGHT_BEAT: if (s%4==0) this.playDrum('kick'); if (s%8==4) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.SIXTEEN_BEAT: if (s==0||s==6||s==10) this.playDrum('kick'); if (s==4||s==12) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.COUNTRY: if (s%8==0||s%8==4) this.playDrum('kick'); if (s%8==2||s%8==6) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.SHUFFLE: if (s%8==0) this.playDrum('kick'); if (s%8==4) this.playDrum('snare'); if (s%3==0||s%3==2) this.playDrum('hihat'); break;
        case RhythmPattern.HIPHOP: if (s==0||s==3||s==10) this.playDrum('kick'); if (s==4||s==12) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.BLUES: if (s%6==0) this.playDrum('kick'); if (s%6==3) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.WALTZ: if (step%3==0) this.playDrum('kick'); if (step%3==1) this.playDrum('hihat'); if (step%3==2) this.playDrum('hihat'); break;
        case RhythmPattern.JAZZ_WALTZ: if (step%3==0) this.playDrum('kick'); if (step%3!=0) this.playDrum('hihat'); break;
        case RhythmPattern.LATIN: if (s%4==0) this.playDrum('kick'); if (s==3||s==7||s==11||s==15) this.playDrum('snare'); this.playDrum('hihat'); break;
        case RhythmPattern.BOSSA: if (s%8==0||s%8==3||s%8==6) this.playDrum('kick'); if (s%8==4) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.REGGAE: if (s==4||s==12) this.playDrum('kick'); if (s==4||s==12) this.playDrum('snare'); if (s%2==0) this.playDrum('hihat'); break;
        case RhythmPattern.TANGO: if (s==0||s==4||s==8||s==12||s==14) this.playDrum('kick'); if (s==15) this.playDrum('snare'); break;
      }
      step = (step + 1) % 48;
    }, (beatLen / 4) * 2000);
  }

  stopRhythm() {
    if (this.rhythmInterval) { clearInterval(this.rhythmInterval); this.rhythmInterval = null; }
  }

  private playDrum(type: 'kick' | 'snare' | 'hihat') {
    if (!this.ctx || !this.rhythmSource) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(70, now); osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.18);
      gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain); osc.start(); osc.stop(now + 0.18);
    } else {
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const f = this.ctx.createBiquadFilter(); f.type = type === 'snare' ? 'bandpass' : 'highpass';
      f.frequency.setValueAtTime(type === 'snare' ? 1200 : 12000, now);
      noise.connect(f); f.connect(gain);
      gain.gain.setValueAtTime(type === 'snare' ? 0.5 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (type === 'snare' ? 0.2 : 0.08));
      noise.start(); noise.stop(now + 0.2);
    }
    gain.connect(this.rhythmSource);
  }
}

export const audioEngine = new AudioEngine();