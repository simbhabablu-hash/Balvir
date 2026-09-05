import React, { useState, useEffect } from "react";
import {
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Smartphone,
  Radio,
  Sliders,
  X,
  MessageSquare,
  Key
} from "lucide-react";
import { ThemePreset } from "../services/themeService";
import { SpeakerSettings, getSpeakerSettings, toggleSpeakerphone, saveSpeakerSettings } from "../services/speakerService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appState: "idle" | "listening" | "processing" | "speaking";
  theme: ThemePreset;
  isMuted: boolean;
  onToggleMute: () => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  onOpenGeminiKey: () => void;
  onOpenSpeakerModal: () => void;
  lastMessage?: string;
}

export default function PhoneCallView({
  isOpen,
  onClose,
  appState,
  theme,
  isMuted,
  onToggleMute,
  isMicActive,
  onToggleMic,
  onOpenGeminiKey,
  onOpenSpeakerModal,
  lastMessage,
}: Props) {
  const [speakerSettings, setSpeakerSettings] = useState<SpeakerSettings>(() => getSpeakerSettings());
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);

    const handleSpeakerUpdate = () => {
      setSpeakerSettings(getSpeakerSettings());
    };
    window.addEventListener("zoya-speaker-changed", handleSpeakerUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("zoya-speaker-changed", handleSpeakerUpdate);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggleSpeaker = () => {
    toggleSpeakerphone();
    setSpeakerSettings(getSpeakerSettings());
  };

  const stateText =
    appState === "speaking"
      ? "Zoya bol rahi hai..."
      : appState === "listening"
      ? "Sun rahi hoon..."
      : appState === "processing"
      ? "Soch rahi hoon..."
      : "Connected";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white p-6 sm:p-10 select-none animate-fade-in">
      {/* Background radial atmosphere */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${theme.primaryHex}, transparent 70%)`
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-white/70 uppercase tracking-wider">
            {speakerSettings.loudspeakerEnabled ? "🔊 Speakerphone Call" : "📱 Phone Call"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGeminiKey}
            className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white/80 flex items-center gap-1 font-medium transition-colors"
            title="Gemini API Key"
          >
            <Key size={12} className="text-violet-400" />
            <span>Key</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition-colors"
            title="Minimize call view"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Center Avatar & Status */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto max-w-md mx-auto w-full text-center">
        {/* Animated Avatar Glow */}
        <div className="relative flex items-center justify-center">
          {appState === "speaking" && (
            <div
              className="absolute -inset-6 rounded-full opacity-60 animate-ping pointer-events-none"
              style={{ backgroundColor: theme.primaryHex }}
            />
          )}
          {appState === "listening" && (
            <div className="absolute -inset-4 rounded-full opacity-40 animate-pulse bg-cyan-400 pointer-events-none" />
          )}

          <div
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1 bg-gradient-to-tr from-violet-500 via-pink-500 to-cyan-400 shadow-2xl flex items-center justify-center relative overflow-hidden"
          >
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center border-4 border-black/40">
              <span className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                Z
              </span>
            </div>
          </div>
        </div>

        {/* Name & Call State */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Zoya AI</h1>
          <div className="text-sm font-semibold text-cyan-300 flex items-center justify-center gap-2">
            <span>{stateText}</span>
          </div>
          <div className="text-xs font-mono text-white/50">{formatTimer(callSeconds)}</div>
        </div>

        {/* Live Subtitle / Transcript Pill */}
        {lastMessage && (
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 max-w-xs sm:max-w-sm text-xs text-white/90 shadow-lg leading-relaxed">
            "{lastMessage}"
          </div>
        )}
      </div>

      {/* Bottom Phone Action Buttons Matrix */}
      <div className="relative z-10 w-full max-w-md mx-auto space-y-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* 1. Speakerphone Toggle */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSpeaker}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
                speakerSettings.loudspeakerEnabled
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/20"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Volume2 size={24} />
            </button>
            <span className="text-[11px] font-medium text-white/80">
              {speakerSettings.loudspeakerEnabled ? "Speaker ON" : "Speaker OFF"}
            </span>
          </div>

          {/* 2. Microphone Mute / Unmute */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMic}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
                isMicActive
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/20"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              {isMicActive ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <span className="text-[11px] font-medium text-white/80">
              {isMicActive ? "Mute Mic" : "Unmute"}
            </span>
          </div>

          {/* 3. Speaker Boost & Device Settings */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSpeakerModal}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 shadow-lg"
            >
              <Sliders size={22} className="text-amber-300" />
            </button>
            <span className="text-[11px] font-medium text-white/80">
              {Math.round(speakerSettings.volumeBoost * 100)}% Boost
            </span>
          </div>
        </div>

        {/* End Call / Return Button */}
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 transition-all active:scale-98"
          >
            <PhoneOff size={18} />
            <span>Call End Karein (Return to Dashboard)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
