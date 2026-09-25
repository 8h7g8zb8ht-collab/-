// Web Audio API synthesizer for calm, aesthetic feedback and ambient soundscapes

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private currentAmbientSource: { stop: () => void } | null = null;
  private currentAmbientType: 'none' | 'rain' | 'waves' | 'chimes' = 'none';

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.15, this.ctx?.currentTime || 0, 0.2);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  // Soft marimba / kalimba bell tone
  public playNote(freq: number, duration = 0.35, type: OscillatorType = 'sine', volume = 0.12) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3, this.ctx.currentTime);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // AudioContext might be blocked or unsupported
    }
  }

  // Soft click / tile move
  public playMove() {
    this.playNote(440, 0.08, 'triangle', 0.05);
  }

  // Sudoku number placement
  public playPlaceNumber(num: number) {
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // Pentatonic scale
    const freq = scale[(num - 1) % scale.length];
    this.playNote(freq, 0.25, 'sine', 0.09);
  }

  // Gentle alert / note remove
  public playRemove() {
    this.playNote(220, 0.12, 'sine', 0.05);
  }

  // Dino jump
  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }

  // Dino land / obstacle dodge score milestone
  public playScoreMilestone() {
    const chords = [523.25, 659.25, 783.99];
    chords.forEach((freq, idx) => {
      setTimeout(() => this.playNote(freq, 0.35, 'sine', 0.07), idx * 80);
    });
  }

  // Dino collision (gentle, not jarring)
  public playDinoHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // ignore
    }
  }

  // 2048 Merge Chime (higher frequency for higher values)
  public playMerge(val: number) {
    const baseFreq = 260 + Math.min(Math.log2(val) * 60, 800);
    this.playNote(baseFreq, 0.28, 'sine', 0.09);
    setTimeout(() => {
      this.playNote(baseFreq * 1.25, 0.32, 'sine', 0.07);
    }, 40);
  }

  // Memory card match chord
  public playMatchChord() {
    const notes = [329.63, 440.00, 523.25, 659.25];
    notes.forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.4, 'sine', 0.08), i * 60);
    });
  }

  // Game Victory Celebration
  public playVictory() {
    const melody = [392.00, 440.00, 523.25, 659.25, 783.99, 1046.50];
    melody.forEach((f, i) => {
      setTimeout(() => this.playNote(f, 0.5, 'sine', 0.1), i * 90);
    });
  }

  // Ambient sound generator (Rain, Waves, Ethereal Chimes)
  public setAmbient(type: 'none' | 'rain' | 'waves' | 'chimes', volume = 0.12) {
    this.currentAmbientType = type;
    if (this.currentAmbientSource) {
      this.currentAmbientSource.stop();
      this.currentAmbientSource = null;
    }

    if (type === 'none' || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (!this.ambientGain) {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.ctx.destination);
    }
    this.ambientGain.gain.setValueAtTime(volume, this.ctx.currentTime);

    if (type === 'rain') {
      this.startRainSynth();
    } else if (type === 'waves') {
      this.startWavesSynth();
    } else if (type === 'chimes') {
      this.startChimesSynth();
    }
  }

  public getAmbientType() {
    return this.currentAmbientType;
  }

  private startRainSynth() {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      lastOut = (lastOut * 0.95) + (white * 0.05);
      data[i] = lastOut * 3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start();

    this.currentAmbientSource = {
      stop: () => {
        try {
          noise.stop();
          noise.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }

  private startWavesSynth() {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // LFO for slow breathing wave swell
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 second swell
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start();

    this.currentAmbientSource = {
      stop: () => {
        try {
          lfo.stop();
          noise.stop();
          noise.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }

  private startChimesSynth() {
    // Ethereal drone & periodic soft chime notes
    if (!this.ctx || !this.ambientGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(130.81, this.ctx.currentTime); // C3
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(196.00, this.ctx.currentTime); // G3

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();

    let intervalId: NodeJS.Timeout | null = null;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    intervalId = setInterval(() => {
      if (this.currentAmbientType === 'chimes' && !this.isMuted) {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        this.playNote(randomNote, 1.2, 'sine', 0.04);
      }
    }, 4500);

    this.currentAmbientSource = {
      stop: () => {
        if (intervalId) clearInterval(intervalId);
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          // ignore
        }
      }
    };
  }
}

export const soundManager = new SoundController();
