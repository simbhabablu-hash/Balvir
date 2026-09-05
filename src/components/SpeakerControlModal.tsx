import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  Smartphone,
  Headphones,
  Sliders,
  Check,
  X,
  Radio,
  Zap,
  Play
} from "lucide-react";
import {
  SpeakerSettings,
  getSpeakerSettings,
  saveSpeakerSettings,
  getAvailableAudioOutputs,
  toggleSpeakerphone
} from "../services/speakerService";
import { playPCM } from "../utils/audioUtils";
import { getZoyaAudio } from "../services/geminiService";
import { ThemePreset } from "../services/themeService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemePreset;
}

export default function SpeakerControlModal({ isOpen, onClose, theme }: Props) {
  const [settings, setSettings] = useState<SpeakerSettings>(() => getSpeakerSettings());
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isTestingSound, setIsTestingSound] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSpeakerSettings());
      getAvailableAudioOutputs().then((devs) => {
        setDevices(devs);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleLoudspeaker = () => {
    const next = toggleSpeakerphone();
    setSettings(getSpeakerSettings());
  };

  const handleBoostChange = (boost: number) => {
    const updated = saveSpeakerSettings({ volumeBoost: boost, loudspeakerEnabled: boost > 1.0 });
    setSettings(updated);
  };

  const handleDeviceSelect = (deviceId: string) => {
    const updated = saveSpeakerSettings({ selectedDeviceId: deviceId });
    setSettings(updated);
  };

  const handleTestAudio = async () => {
    if (isTestingSound) return;
    setIsTestingSound(true);
    try {
      const audioBase64 = await getZoyaAudio("Haan Balvir Coder! Speaker ekdum mast kaam kar raha hai!");
      if (audioBase64) {
        await playPCM(audioBase64);
      }
    } catch (e) {
      console.error("Failed to test speaker audio", e);
    } finally {
      setIsTestingSound(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 text-cyan-300 shrink-0">
            <Volume2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Speaker & Phone Settings</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                settings.loudspeakerEnabled 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                  : "bg-white/10 text-white/70 border-white/20"
              }`}>
                {settings.loudspeakerEnabled ? "🔊 Speaker ON" : "📱 Phone / Normal"}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Speakerphone par tez aawaaz mein baat karein ya phone call mode chunein.
            </p>
          </div>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Loudspeaker */}
          <button
            type="button"
            onClick={handleToggleLoudspeaker}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              settings.loudspeakerEnabled
                ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10"
                : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/25"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${settings.loudspeakerEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                <Volume2 size={20} />
              </div>
              {settings.loudspeakerEnabled && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-white">Loudspeaker Mode</div>
            <div className="text-[11px] text-white/60 mt-0.5 leading-snug">
              Hands-free aur tez aawaaz. Phone ya laptop speaker par dur se sun sakte hain.
            </div>
          </button>

          {/* Card 2: Phone Mode */}
          <button
            type="button"
            onClick={() => {
              saveSpeakerSettings({
                loudspeakerEnabled: false,
                mode: "phone",
                volumeBoost: 1.0,
              });
              setSettings(getSpeakerSettings());
            }}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              !settings.loudspeakerEnabled
                ? "bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10"
                : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/25"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${!settings.loudspeakerEnabled ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-white/40"}`}>
                <Smartphone size={20} />
              </div>
              {!settings.loudspeakerEnabled && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-white">Phone / Normal Mode</div>
            <div className="text-[11px] text-white/60 mt-0.5 leading-snug">
              Kaan ke paas phone rakhkar ya headphones mein private baatcheet ke liye.
            </div>
          </button>
        </div>

        {/* Volume Booster Slider */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/90 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              Speaker Volume Booster (Amplification)
            </span>
            <span className="font-mono font-bold text-amber-300">
              {Math.round(settings.volumeBoost * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={settings.volumeBoost}
            onChange={(e) => handleBoostChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-black/50 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
            <span>100% (Standard)</span>
            <span>180% (Recommended for Speaker)</span>
            <span>250% (Max Loud)</span>
          </div>
        </div>

        {/* Audio Output Device Selection (if available) */}
        {devices.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <Radio size={14} className="text-cyan-400" />
              Audio Output Device (Speaker / Bluetooth)
            </label>
            <select
              value={settings.selectedDeviceId}
              onChange={(e) => handleDeviceSelect(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="default">Default Device Speaker / Headset</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Speaker / Output #${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Test Speaker Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleTestAudio}
            disabled={isTestingSound}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play size={14} className="text-emerald-400" />
            {isTestingSound ? "Playing Test Audio..." : "Test Speaker Audio"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r ${theme.buttonGradient} text-white shadow-lg transition-transform active:scale-95`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
