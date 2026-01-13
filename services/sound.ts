class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15; // Subtle volume
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.error("AudioContext not supported");
    }
  }

  private resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playType() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Subtle high-pitched click for mechanical feel
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, t); // Slight variation
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  playSubmit() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Data transmission blip
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playReceive() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Soft ambient swell for incoming message
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(330, t + 0.4);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    // Filter to make it softer
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  playWin() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Ethereal Major Chord (A Major)
    const freqs = [440, 554.37, 659.25, 880]; 
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = f;
      
      const start = t + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 3.0);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(start);
      osc.stop(start + 3.0);
    });
  }

  playLose() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Dark Dissonant Drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.linearRampToValueAtTime(40, t + 2.5);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(85, t); // Tritone dissonanceish
    osc2.frequency.linearRampToValueAtTime(38, t + 2.5);

    // Heavy Lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 3.0);
    osc2.stop(t + 3.0);
  }
}

export const soundSystem = new SoundSystem();