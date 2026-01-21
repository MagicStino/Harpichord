
import { ChordDefinition } from '../types';

class MidiService {
  private midiAccess: MIDIAccess | null = null;
  private outputs: MIDIOutput[] = [];
  private onChordReceived: ((chord: ChordDefinition | null) => void) | null = null;
  private onHarpReceived: ((index: number) => void) | null = null;
  public error: string | null = null;

  async init(
    chordHandler: (chord: ChordDefinition | null) => void,
    harpHandler: (index: number) => void
  ) {
    this.onChordReceived = chordHandler;
    this.onHarpReceived = harpHandler;

    if (!navigator.requestMIDIAccess) {
      this.error = "Web MIDI API not supported in this browser.";
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.updatePorts();
      this.midiAccess.onstatechange = () => this.updatePorts();
    } catch (err: any) {
      this.error = err.message || "Could not access MIDI devices.";
      console.warn("MIDI Access Denied:", this.error);
    }
  }

  private updatePorts() {
    if (!this.midiAccess) return;
    this.outputs = Array.from(this.midiAccess.outputs.values());
    
    this.midiAccess.inputs.forEach(input => {
      input.onmidimessage = (msg) => this.handleInput(msg);
    });
  }

  private handleInput(msg: MIDIMessageEvent) {
    const [status, data1, data2] = msg.data;
    const type = status & 0xf0;

    // Note On
    if (type === 0x90 && data2 > 0) {
      // Mapping for lower octaves
      if (data1 < 48) {
        // Lower notes could trigger chord changes
      } else {
        const harpIndex = (data1 - 48) % 10;
        if (this.onHarpReceived) this.onHarpReceived(harpIndex);
      }
    }
  }

  sendChord(chord: ChordDefinition | null) {
    this.outputs.forEach(out => {
      if (!chord) {
        out.send([0xb0, 123, 0]); // All notes off
        return;
      }
      // Send chord notes shifted to C2 (36)
      chord.intervals.forEach(interval => {
        out.send([0x90, 36 + interval, 100]);
      });
    });
  }

  sendHarpNote(noteIndex: number) {
    this.outputs.forEach(out => {
      // Harp notes start at C3 (48)
      out.send([0x90, 48 + noteIndex, 100]);
      setTimeout(() => out.send([0x80, 48 + noteIndex, 0]), 100);
    });
  }
}

export const midiService = new MidiService();
