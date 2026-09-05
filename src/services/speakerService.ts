// Audio Output & Speakerphone Service
// Manages Loudspeaker mode, Phone call mode, audio output device selection (Bluetooth/Speaker/Earpiece),
// and volume amplification for hands-free phone conversations.

export type SpeakerMode = "speakerphone" | "phone" | "headset";

export interface SpeakerSettings {
  mode: SpeakerMode;
  loudspeakerEnabled: boolean;
  volumeBoost: number; // 1.0 to 2.5 (100% - 250%)
  selectedDeviceId: string; // media device ID
  phoneCallView: boolean; // phone call HUD on mobile
}

const STORAGE_KEY = "zoya_speaker_settings";

const defaultSettings: SpeakerSettings = {
  mode: "speakerphone",
  loudspeakerEnabled: true,
  volumeBoost: 1.8, // 180% boost for loud, clear speakerphone audio
  selectedDeviceId: "default",
  phoneCallView: false,
};

// Custom event for reactive UI updates
function dispatchSpeakerUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zoya-speaker-changed"));
  }
}

export function getSpeakerSettings(): SpeakerSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error("Failed to parse speaker settings", e);
  }
  return defaultSettings;
}

export function saveSpeakerSettings(settings: Partial<SpeakerSettings>): SpeakerSettings {
  const current = getSpeakerSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      dispatchSpeakerUpdate();
    } catch (e) {
      console.error("Failed to save speaker settings", e);
    }
  }
  return updated;
}

export function toggleSpeakerphone(): boolean {
  const current = getSpeakerSettings();
  const nextEnabled = !current.loudspeakerEnabled;
  saveSpeakerSettings({
    loudspeakerEnabled: nextEnabled,
    mode: nextEnabled ? "speakerphone" : "phone",
    volumeBoost: nextEnabled ? 1.8 : 1.0,
  });
  return nextEnabled;
}

// Get list of available audio output devices (speakers, Bluetooth, headphones)
export async function getAvailableAudioOutputs(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audiooutput");
  } catch (e) {
    console.warn("Could not enumerate audio output devices", e);
    return [];
  }
}

// Attach speakerphone booster & limiter nodes to an AudioContext
export function setupSpeakerAudioChain(
  audioCtx: AudioContext,
  source: AudioNode
): { gainNode: GainNode; compressor: DynamicsCompressorNode } {
  const settings = getSpeakerSettings();

  // Create high-gain volume amplifier
  const gainNode = audioCtx.createGain();
  const boost = settings.loudspeakerEnabled ? Math.max(1.0, settings.volumeBoost || 1.8) : 1.0;
  gainNode.gain.setValueAtTime(boost, audioCtx.currentTime);

  // Add dynamics compressor to prevent clipping / distortion when boosted for speaker
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
  compressor.knee.setValueAtTime(12, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

  // Chain: source -> gain -> compressor -> destination
  source.connect(gainNode);
  gainNode.connect(compressor);
  compressor.connect(audioCtx.destination);

  // Route to selected audio device if setSinkId is supported on AudioContext
  if (settings.selectedDeviceId && settings.selectedDeviceId !== "default" && (audioCtx as any).setSinkId) {
    (audioCtx as any).setSinkId(settings.selectedDeviceId).catch((err: any) => {
      console.warn("AudioContext.setSinkId failed:", err);
    });
  }

  return { gainNode, compressor };
}

// Screen Wake Lock manager for keeping phone active during conversations
class PhoneWakeLockManager {
  private wakeLock: any = null;

  async request() {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (!this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Wake lock request failed or denied
    }
  }

  release() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch {
      // Ignore release error
    }
  }
}

export const phoneWakeLock = new PhoneWakeLockManager();
