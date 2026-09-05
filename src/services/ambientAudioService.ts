// Ambient Soundscape Generator using Web Audio API

export type AmbientSoundscapeStyle = "quantum_core" | "cyber_shimmer" | "deep_space";

export interface AmbientSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  style: AmbientSoundscapeStyle;
}

const STORAGE_KEY = "zoya_ambient_soundscape_settings";

const DEFAULT_SETTINGS: AmbientSettings = {
  enabled: false,
  volume: 0.35,
  style: "quantum_core",
};

export function getAmbientSettings(): AmbientSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SETTINGS.volume,
        style: ["quantum_core", "cyber_shimmer", "deep_space"].includes(parsed.style) ? parsed.style : DEFAULT_SETTINGS.style,
      };
    }
  } catch (e) {
    console.error("Failed to load ambient settings", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAmbientSettings(settings: Partial<AmbientSettings>): AmbientSettings {
  const current = getAmbientSettings();
  const updated: AmbientSettings = { ...current, ...settings };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zoya-ambient-settings-changed", { detail: updated }));
  }
  return updated;
}

class AmbientSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: Array<AudioNode | OscillatorNode | BiquadFilterNode> = [];
  private isRunning: boolean = false;
  private currentAppState: "idle" | "listening" | "processing" | "speaking" = "idle";
  private settings: AmbientSettings = getAmbientSettings();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("zoya-ambient-settings-changed", (e: any) => {
        if (e.detail) {
          this.settings = e.detail;
          this.handleSettingsUpdate();
        }
      });
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public setAppState(state: "idle" | "listening" | "processing" | "speaking") {
    this.currentAppState = state;
    this.updateDucking();
  }

  private updateDucking() {
    if (!this.ctx || !this.masterGain || !this.isRunning) return;

    const baseVol = this.settings.volume * 0.12; // Scaled for pleasant non-fatiguing ambient background
    const now = this.ctx.currentTime;

    if (!this.settings.enabled) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.4);
      return;
    }

    if (this.currentAppState === "idle") {
      // Full gentle ambient swell
      this.masterGain.gain.setTargetAtTime(baseVol, now, 1.2);
    } else if (this.currentAppState === "listening") {
      // Duck slightly during mic listening to avoid feedback
      this.masterGain.gain.setTargetAtTime(baseVol * 0.25, now, 0.5);
    } else if (this.currentAppState === "speaking") {
      // Duck down so Zoya's voice is crystal clear
      this.masterGain.gain.setTargetAtTime(baseVol * 0.2, now, 0.4);
    } else {
      // Processing state
      this.masterGain.gain.setTargetAtTime(baseVol * 0.6, now, 0.6);
    }
  }

  public async start() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // audio context resume waiting for user interaction
      }
    }

    if (this.isRunning) {
      this.stopNodes();
    }

    this.buildSoundscape(this.settings.style);
    this.isRunning = true;
    this.updateDucking();
  }

  public stop() {
    if (!this.isRunning) return;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      setTimeout(() => {
        this.stopNodes();
        this.isRunning = false;
      }, 600);
    } else {
      this.stopNodes();
      this.isRunning = false;
    }
  }

  private stopNodes() {
    for (const node of this.nodes) {
      try {
        if ("stop" in node && typeof (node as any).stop === "function") {
          (node as any).stop();
        }
        node.disconnect();
      } catch {
        // Node already disconnected
      }
    }
    this.nodes = [];
  }

  private handleSettingsUpdate() {
    if (this.settings.enabled) {
      if (!this.isRunning) {
        this.start();
      } else {
        // If style changed, rebuild
        this.stopNodes();
        this.buildSoundscape(this.settings.style);
        this.updateDucking();
      }
    } else {
      if (this.isRunning) {
        this.stop();
      }
    }
  }

  private buildSoundscape(style: AmbientSoundscapeStyle) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    if (style === "quantum_core") {
      // 1. Warm sub drone (55Hz A1)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime);

      // LFO for breathing amplitude
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec breathing cycle

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);
      lfo.connect(lfoGain.gain);

      // Lowpass Filter for soft cinematic warmth
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(180, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      const oscGain1 = ctx.createGain();
      oscGain1.gain.setValueAtTime(0.7, ctx.currentTime);

      osc1.connect(oscGain1);
      oscGain1.connect(filter);
      filter.connect(this.masterGain);

      // 2. Harmonic Shimmer (110Hz + 165Hz)
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(110, ctx.currentTime);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.25, ctx.currentTime);

      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);

      // 3. Subtle binaural stereo detune (55.5 Hz)
      const osc3 = ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(55.6, ctx.currentTime);

      const osc3Gain = ctx.createGain();
      osc3Gain.gain.setValueAtTime(0.4, ctx.currentTime);

      osc3.connect(osc3Gain);
      osc3Gain.connect(filter);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      this.nodes.push(osc1, osc2, osc3, lfo, filter, oscGain1, osc2Gain, osc3Gain, lfoGain);

    } else if (style === "cyber_shimmer") {
      // Cyber Shimmer: Crystal harmonics with soft pulsating bandpass
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(146.83, ctx.currentTime); // D3

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(220, ctx.currentTime); // A3

      const osc3 = ctx.createOscillator();
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(440, ctx.currentTime); // A4

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(2.0, ctx.currentTime);

      // Slow filter sweep
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(120, ctx.currentTime);
      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);

      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.4, ctx.currentTime);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.3, ctx.currentTime);
      const g3 = ctx.createGain();
      g3.gain.setValueAtTime(0.12, ctx.currentTime);

      osc1.connect(g1);
      osc2.connect(g2);
      osc3.connect(g3);

      g1.connect(filter);
      g2.connect(filter);
      g3.connect(filter);

      filter.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      this.nodes.push(osc1, osc2, osc3, lfo, lfoDepth, filter, g1, g2, g3);

    } else {
      // Deep Space: Deep sub-harmonic drone with resonant rumble
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(43.65, ctx.currentTime); // F1

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(87.31, ctx.currentTime); // F2

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(140, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.8, ctx.currentTime);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.3, ctx.currentTime);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(filter);
      g2.connect(filter);
      filter.connect(this.masterGain);

      osc1.start();
      osc2.start();

      this.nodes.push(osc1, osc2, filter, g1, g2);
    }
  }

  public previewPreset(style: AmbientSoundscapeStyle) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.stopNodes();
    this.buildSoundscape(style);
    this.isRunning = true;
    const baseVol = this.settings.volume * 0.12;
    this.masterGain.gain.setTargetAtTime(baseVol, this.ctx.currentTime, 0.2);
  }
}

export const ambientEngine = new AmbientSoundscapeEngine();
