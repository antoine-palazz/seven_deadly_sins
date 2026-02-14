'use client';

/**
 * AudioManager — singleton handling all game audio via Web Audio API.
 * Generates sounds procedurally (no external audio files needed).
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private _muted = false;
  private _initialized = false;

  /** Must be called from a user gesture */
  init() {
    if (this._initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  get initialized() {
    return this._initialized;
  }

  get muted() {
    return this._muted;
  }

  setMuted(v: boolean) {
    this._muted = v;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v ? 0 : 0.3, this.ctx!.currentTime, 0.1);
    }
  }

  /** Dark ambient drone — low frequency pad */
  startAmbient() {
    if (!this.ctx || !this.masterGain || this.ambientOsc) return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.08;
    this.ambientGain.connect(this.masterGain);

    // Low drone
    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 55; // Low A
    this.ambientOsc.connect(this.ambientGain);
    this.ambientOsc.start();

    // Add a second detuned oscillator for thickness
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 55.5;
    const gain2 = this.ctx.createGain();
    gain2.gain.value = 0.05;
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start();
  }

  stopAmbient() {
    if (this.ambientOsc) {
      try { this.ambientOsc.stop(); } catch { /* already stopped */ }
      this.ambientOsc = null;
    }
  }

  /** Heartbeat pulse — configurable BPM */
  startHeartbeat(bpm = 60) {
    if (!this.ctx || !this.masterGain) return;
    this.stopHeartbeat();

    const interval = (60 / bpm) * 1000;
    this.heartbeatInterval = setInterval(() => {
      this.playHeartbeatPulse();
    }, interval);
  }

  private playHeartbeatPulse() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // First beat (louder)
    this.playThump(now, 0.15, 60);
    // Second beat (softer, slightly delayed)
    this.playThump(now + 0.15, 0.08, 50);
  }

  private playThump(time: number, volume: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /** Short UI click / tap sound */
  playClick() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** Success sound */
  playSuccess() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /** Error / failure sound */
  playError() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /** Whisper-like noise burst */
  playWhisper() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  /** Tension riser sound */
  playTensionRise(duration = 2) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + duration);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  destroy() {
    this.stopHeartbeat();
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._initialized = false;
  }
}

/** Singleton instance */
export const audioManager = typeof window !== 'undefined' ? new AudioManager() : (null as unknown as AudioManager);
