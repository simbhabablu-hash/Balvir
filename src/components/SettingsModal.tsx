import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  X, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RotateCcw, 
  Volume2, 
  Sparkles, 
  Trash2, 
  ShieldCheck,
  Bot,
  Cpu,
  Palette,
  Waves,
  Radio,
  Sliders,
  Layers,
  Smartphone,
  Zap,
  Play,
  ExternalLink
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
import { 
  getRawCustomApiKey, 
  setApiKey, 
  hasCustomApiKey, 
  getGrokApiKey,
  setGrokApiKey,
  getGroqApiKey,
  setGroqApiKey,
  getActiveProvider,
  setActiveProvider,
  getZoyaVoice, 
  setZoyaVoice, 
  testGeminiApiKey,
  testGrokApiKey,
  testGroqApiKey,
  AIProvider
} from "../services/apiKeyService";
import { resetZoyaSession } from "../services/geminiService";
import { 
  THEME_PRESETS, 
  getSavedThemeId, 
  saveThemeId, 
  getSavedTheme 
} from "../services/themeService";
import {
  getAmbientSettings,
  saveAmbientSettings,
  ambientEngine,
  AmbientSettings,
  AmbientSoundscapeStyle
} from "../services/ambientAudioService";
import KeyPoolManager from "./KeyPoolManager";
import { getKeyPool } from "../services/keyPoolService";

interface Props {
  onClose: () => void;
  onClearHistory: () => void;
  hasHistory: boolean;
}

export default function SettingsModal({ onClose, onClearHistory, hasHistory }: Props) {
  const [provider, setProviderState] = useState<AIProvider>("gemini");
  
  // Theme state
  const [currentThemeId, setCurrentThemeId] = useState<string>(getSavedThemeId());
  const currentTheme = THEME_PRESETS.find((t) => t.id === currentThemeId) || getSavedTheme();

  // API Keys state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [grokKeyInput, setGrokKeyInput] = useState("");
  const [groqKeyInput, setGroqKeyInput] = useState("");

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGrokKey, setShowGrokKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  const [voiceInput, setVoiceInput] = useState("Kore");
  const [isGeminiCustomSet, setIsGeminiCustomSet] = useState(false);
  
  // Ambient Soundscape state
  const [ambientSettings, setAmbientSettings] = useState<AmbientSettings>(() => getAmbientSettings());
  
  // API Key Configuration Mode: 'pool' (200+ keys) or 'single'
  const [keyConfigMode, setKeyConfigMode] = useState<"pool" | "single">("pool");
  const [poolCount, setPoolCount] = useState<number>(() => getKeyPool().length);
  
  // Speakerphone & Phone Mode state
  const [speakerSettings, setSpeakerSettings] = useState<SpeakerSettings>(() => getSpeakerSettings());
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  // Testing states
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);
  
  // Status feedback
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setProviderState(getActiveProvider());
    setCurrentThemeId(getSavedThemeId());
    setGeminiKeyInput(getRawCustomApiKey());
    setGrokKeyInput(getGrokApiKey());
    setGroqKeyInput(getGroqApiKey());
    setIsGeminiCustomSet(hasCustomApiKey());
    setVoiceInput(getZoyaVoice());
    setAmbientSettings(getAmbientSettings());
    setSpeakerSettings(getSpeakerSettings());

    getAvailableAudioOutputs().then((devs) => {
      setAudioDevices(devs);
    });

    const handlePoolUpdate = () => {
      setPoolCount(getKeyPool().length);
    };
    window.addEventListener("zoya-key-pool-changed", handlePoolUpdate);

    const handleSpeakerUpdate = () => {
      setSpeakerSettings(getSpeakerSettings());
    };
    window.addEventListener("zoya-speaker-changed", handleSpeakerUpdate);

    return () => {
      window.removeEventListener("zoya-key-pool-changed", handlePoolUpdate);
      window.removeEventListener("zoya-speaker-changed", handleSpeakerUpdate);
    };
  }, []);

  const handleToggleAmbient = () => {
    const updated = saveAmbientSettings({ enabled: !ambientSettings.enabled });
    setAmbientSettings(updated);
    if (updated.enabled) {
      ambientEngine.start();
      setSaveMessage("Ambient soundscape activated (plays softly when Zoya is idle)");
    } else {
      ambientEngine.stop();
      setSaveMessage("Ambient soundscape turned off");
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleAmbientStyleChange = (style: AmbientSoundscapeStyle) => {
    const updated = saveAmbientSettings({ style, enabled: true });
    setAmbientSettings(updated);
    ambientEngine.previewPreset(style);
    setSaveMessage(`Soundscape set to "${style.replace("_", " ").toUpperCase()}"`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleAmbientVolumeChange = (volume: number) => {
    const updated = saveAmbientSettings({ volume });
    setAmbientSettings(updated);
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    setProviderState(newProvider);
    setActiveProvider(newProvider);
    resetZoyaSession();
    setSaveMessage(`Switched active AI engine to ${newProvider.toUpperCase()}`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleThemeSelect = (themeId: string) => {
    setCurrentThemeId(themeId);
    saveThemeId(themeId);
    const selected = THEME_PRESETS.find((t) => t.id === themeId);
    setSaveMessage(`Theme changed to "${selected?.name || themeId}"!`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveAllKeys = () => {
    setApiKey(geminiKeyInput);
    setGrokApiKey(grokKeyInput);
    setGroqApiKey(groqKeyInput);

    setIsGeminiCustomSet(hasCustomApiKey());
    resetZoyaSession();

    // Auto-detect if user pasted a gsk_ key into Grok field by mistake
    if (grokKeyInput.trim().startsWith("gsk_") && !groqKeyInput.trim()) {
      setGroqApiKey(grokKeyInput);
      setGroqKeyInput(grokKeyInput);
      setActiveProvider("groq");
      setProviderState("groq");
      setSaveMessage("Groq Key (gsk_...) detected! Saved and activated Groq Cloud.");
    } else {
      setSaveMessage("All API Keys updated successfully!");
    }

    setTestResult(null);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleTestGemini = async () => {
    setTesting("gemini");
    setTestResult(null);
    const result = await testGeminiApiKey(geminiKeyInput);
    setTesting(null);
    setTestResult({ provider: "Gemini", ...result });
  };

  const handleTestGrok = async () => {
    setTesting("grok");
    setTestResult(null);
    const result = await testGrokApiKey(grokKeyInput);
    setTesting(null);
    setTestResult({ provider: "xAI Grok", ...result });
  };

  const handleTestGroq = async () => {
    setTesting("groq");
    setTestResult(null);
    const result = await testGroqApiKey(groqKeyInput);
    setTesting(null);
    setTestResult({ provider: "Groq Cloud", ...result });
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoiceInput(newVoice);
    setZoyaVoice(newVoice);
  };

  const handleToggleLoudspeaker = () => {
    const next = toggleSpeakerphone();
    setSpeakerSettings(getSpeakerSettings());
    setSaveMessage(next ? "🔊 Loudspeaker Mode Activated (Amplified)" : "📱 Phone / Normal Mode Activated");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSpeakerBoostChange = (boost: number) => {
    const updated = saveSpeakerSettings({ volumeBoost: boost, loudspeakerEnabled: boost > 1.0 });
    setSpeakerSettings(updated);
  };

  const handleOutputDeviceChange = (deviceId: string) => {
    const updated = saveSpeakerSettings({ selectedDeviceId: deviceId });
    setSpeakerSettings(updated);
    setSaveMessage("Audio output device updated!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleTestSpeakerAudio = async () => {
    if (isTestingSpeaker) return;
    setIsTestingSpeaker(true);
    try {
      const audioBase64 = await getZoyaAudio("Speaker test complete! Awaaz ekdum loud aur clear hai.");
      if (audioBase64) {
        await playPCM(audioBase64);
      }
    } catch (e) {
      console.error("Test speaker failed", e);
    } finally {
      setIsTestingSpeaker(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-[#0e0e12] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white relative overflow-hidden my-auto"
      >
        {/* Top Accent Gradient Bar */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentTheme.topBarGradient} transition-all duration-500`} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/10 ${currentTheme.accentText}`}>
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-medium tracking-wide">Zoya AI Settings</h2>
              <p className="text-xs text-white/50">Customize theme accent colors, API keys & voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Banner */}
        {saveMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>{saveMessage}</span>
          </motion.div>
        )}

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 scrollbar-hide">
          
          {/* SECTION 1: THEME & ACCENT COLOR CUSTOMIZATION */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Palette size={16} className={currentTheme.accentText} />
                Accent Color & Theme
              </label>
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium border border-white/15 bg-white/5 text-white/80">
                {currentTheme.name}
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Personalize Zoya's background ambient glows, interactive buttons, and HUD color scheme:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {THEME_PRESETS.map((t) => {
                const isSelected = currentThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeSelect(t.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? `${t.activeBg} ${t.activeBorder} text-white shadow-lg ring-1 ring-white/30`
                        : "bg-black/30 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {/* Color Swatch Circles */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center -space-x-1.5">
                        <div 
                          className="w-4 h-4 rounded-full border border-black/40 shadow-sm" 
                          style={{ backgroundColor: t.primaryHex }} 
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-black/40 shadow-sm" 
                          style={{ backgroundColor: t.secondaryHex }} 
                        />
                      </div>
                      {isSelected && (
                        <div className={`w-2 h-2 rounded-full ${t.indicatorColor} animate-pulse`} />
                      )}
                    </div>
                    <div className="text-xs font-semibold">{t.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 leading-tight truncate">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: AI ENGINE PROVIDER SELECTION */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Cpu size={16} className="text-cyan-400" />
              Active AI Intelligence Engine
            </label>
            <p className="text-xs text-white/60">
              Select which AI backend powers Zoya's brain & responses:
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                { id: "gemini", name: "Google Gemini", model: "Gemini 3.1 Flash", icon: Sparkles, color: "text-violet-400" },
                { id: "grok", name: "xAI Grok", model: "Grok-2 Latest", icon: Bot, color: "text-pink-400" },
                { id: "groq", name: "Groq Cloud", model: "Llama-3.3 70B (gsk_)", icon: Cpu, color: "text-cyan-400" },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = provider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProviderChange(item.id as AIProvider)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? "bg-white/10 border-white/40 text-white shadow-lg ring-1 ring-white/20"
                        : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComponent size={16} className={item.color} />
                      {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                    <div className="text-xs font-semibold mt-2">{item.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 leading-tight">{item.model}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: API KEYS & MULTI-KEY POOL MANAGEMENT */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Key size={16} className={currentTheme.accentText} />
                API Keys & Multi-Key Pool
              </label>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setKeyConfigMode("pool")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    keyConfigMode === "pool"
                      ? "bg-white/20 text-white font-semibold shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Layers size={13} className="text-cyan-400" />
                  Multi-Key Pool (200+ Keys)
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {poolCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setKeyConfigMode("single")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    keyConfigMode === "single"
                      ? "bg-white/20 text-white font-semibold shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Key size={13} className="text-violet-400" />
                  Single Primary Keys
                </button>
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <div>
                  <span className="font-semibold mr-1">[{testResult.provider}]:</span>
                  <span>{testResult.message}</span>
                </div>
              </motion.div>
            )}

            {/* MODE 1: MULTI-KEY POOL (200+ KEYS) */}
            {keyConfigMode === "pool" ? (
              <KeyPoolManager theme={currentTheme} />
            ) : (
              /* MODE 2: SINGLE PRIMARY KEYS INPUTS */
              <div className="space-y-4 pt-1">
                {/* 1. GEMINI KEY INPUT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-violet-300 flex items-center gap-1.5">
                      <Sparkles size={13} /> Google Gemini API Key
                    </span>
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testing !== null}
                      className="text-violet-400 hover:text-violet-200 text-[11px] underline disabled:opacity-50"
                    >
                      {testing === "gemini" ? "Testing..." : "Test Gemini Key"}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="System default key active (or paste AI Studio key)"
                      className="w-full bg-black/50 border border-white/15 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 p-1 text-white/40 hover:text-white"
                    >
                      {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* 2. GROK (xAI) KEY INPUT */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-pink-300 flex items-center gap-1.5">
                      <Bot size={13} /> xAI Grok API Key
                    </span>
                    <button
                      type="button"
                      onClick={handleTestGrok}
                      disabled={testing !== null}
                      className="text-pink-400 hover:text-pink-200 text-[11px] underline disabled:opacity-50"
                    >
                      {testing === "grok" ? "Testing..." : "Test Grok Key"}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showGrokKey ? "text" : "password"}
                      value={grokKeyInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGrokKeyInput(val);
                        if (val.trim().startsWith("gsk_") && !groqKeyInput) {
                          setGroqKeyInput(val.trim());
                        }
                      }}
                      placeholder="e.g. xai-..."
                      className="w-full bg-black/50 border border-white/15 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGrokKey(!showGrokKey)}
                      className="absolute right-2.5 p-1 text-white/40 hover:text-white"
                    >
                      {showGrokKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* 3. GROQ CLOUD KEY INPUT (for gsk_...) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-cyan-300 flex items-center gap-1.5">
                      <Cpu size={13} /> Groq Cloud API Key (gsk_...)
                    </span>
                    <button
                      type="button"
                      onClick={handleTestGroq}
                      disabled={testing !== null}
                      className="text-cyan-400 hover:text-cyan-200 text-[11px] underline disabled:opacity-50"
                    >
                      {testing === "groq" ? "Testing..." : "Test Groq Key"}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showGroqKey ? "text" : "password"}
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder="e.g. gsk_QVSqYlhn..."
                      className="w-full bg-black/50 border border-white/15 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      className="absolute right-2.5 p-1 text-white/40 hover:text-white"
                    >
                      {showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAllKeys}
                    className={`w-full py-2.5 px-4 bg-gradient-to-r ${currentTheme.buttonGradient} text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-black/40`}
                  >
                    Save All API Keys
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: VOICE SELECTION */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Volume2 size={16} className={currentTheme.accentText} />
              Zoya's Voice Accent
            </label>
            <p className="text-xs text-white/60">
              Select the audio voice tone for Zoya's spoken responses:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { name: "Kore", desc: "Expressive & Natural (Recommended)" },
                { name: "Aoede", desc: "Warm & Melodic" },
                { name: "Fenrir", desc: "Deep & Firm" },
                { name: "Puck", desc: "Upbeat & Playful" },
              ].map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleVoiceChange(v.name)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    voiceInput === v.name
                      ? `${currentTheme.activeBg} ${currentTheme.activeBorder} text-white shadow-md`
                      : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>{v.name}</span>
                    {voiceInput === v.name && <div className={`w-2 h-2 rounded-full ${currentTheme.indicatorColor} animate-pulse`} />}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 5: SPEAKERPHONE & PHONE AUDIO SETTINGS */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${currentTheme.accentText}`}>
                  <Volume2 size={17} />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90 flex items-center gap-2">
                    Speakerphone & Phone Mode
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                      speakerSettings.loudspeakerEnabled 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                        : "bg-white/10 text-white/70 border-white/20"
                    }`}>
                      {speakerSettings.loudspeakerEnabled ? "🔊 Speaker ON" : "📱 Phone Normal"}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">Loudspeaker amplification aur phone audio switch</div>
                </div>
              </div>

              {/* Master Speaker Toggle */}
              <button
                type="button"
                onClick={handleToggleLoudspeaker}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  speakerSettings.loudspeakerEnabled ? "bg-emerald-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    speakerSettings.loudspeakerEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  saveSpeakerSettings({ loudspeakerEnabled: true, mode: "speakerphone", volumeBoost: 1.8 });
                  setSpeakerSettings(getSpeakerSettings());
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  speakerSettings.loudspeakerEnabled
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-md"
                    : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5 text-emerald-300">
                  <Volume2 size={14} /> Loudspeaker Mode
                </div>
                <div className="text-[10px] text-white/50 mt-1 leading-snug">
                  Hands-free aur amplified volume for rooms and phone speaker.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveSpeakerSettings({ loudspeakerEnabled: false, mode: "phone", volumeBoost: 1.0 });
                  setSpeakerSettings(getSpeakerSettings());
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !speakerSettings.loudspeakerEnabled
                    ? "bg-cyan-500/15 border-cyan-500/40 text-white shadow-md"
                    : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5 text-cyan-300">
                  <Smartphone size={14} /> Phone / Normal Mode
                </div>
                <div className="text-[10px] text-white/50 mt-1 leading-snug">
                  Standard volume for earphones or close-to-ear listening.
                </div>
              </button>
            </div>

            {/* Volume Booster Slider */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" /> Speaker Volume Amplification
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {Math.round(speakerSettings.volumeBoost * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={speakerSettings.volumeBoost}
                onChange={(e) => handleSpeakerBoostChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>100% (Standard)</span>
                <span>180% (Speaker Boost)</span>
                <span>250% (Max Loud)</span>
              </div>
            </div>

            {/* Output Device Selection & Test Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
              {audioDevices.length > 0 ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/60">Output:</span>
                  <select
                    value={speakerSettings.selectedDeviceId}
                    onChange={(e) => handleOutputDeviceChange(e.target.value)}
                    className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="default">Default Speaker</option>
                    {audioDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Speaker #${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-[11px] text-white/50">Device: System Default Speaker / Phone</div>
              )}

              <button
                type="button"
                onClick={handleTestSpeakerAudio}
                disabled={isTestingSpeaker}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play size={12} className="text-emerald-400" />
                {isTestingSpeaker ? "Testing..." : "Test Speaker Audio"}
              </button>
            </div>
          </div>

          {/* SECTION 6: FUTURISTIC AMBIENT SOUNDSCAPE */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${currentTheme.accentText}`}>
                  <Waves size={17} />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90 flex items-center gap-2">
                    Futuristic Ambient Soundscape
                    {ambientSettings.enabled && (
                      <span className="flex h-2 w-2 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentTheme.indicatorColor} opacity-75`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTheme.indicatorColor}`} />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50">Subtle, cinematic audio atmosphere when idle</div>
                </div>
              </div>

              {/* Master Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleAmbient}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  ambientSettings.enabled ? "bg-cyan-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    ambientSettings.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {ambientSettings.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 border-t border-white/5"
              >
                {/* Soundscape Styles */}
                <div>
                  <label className="text-xs text-white/70 font-medium block mb-2">Soundscape Profile</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "quantum_core", name: "Quantum Core", desc: "Warm breathing sub-harmonic drone" },
                      { id: "cyber_shimmer", name: "Cyber Shimmer", desc: "Harmonic crystal bandpass shimmer" },
                      { id: "deep_space", name: "Deep Space", desc: "Resonant atmospheric rumble" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAmbientStyleChange(s.id as AmbientSoundscapeStyle)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          ambientSettings.style === s.id
                            ? `${currentTheme.activeBg} ${currentTheme.activeBorder} text-white shadow-md ring-1 ring-white/20`
                            : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="text-xs font-semibold">{s.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Sliders size={13} className={currentTheme.accentText} /> Ambient Volume
                    </span>
                    <span className="font-mono text-white/80">{Math.round(ambientSettings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={ambientSettings.volume}
                    onChange={(e) => handleAmbientVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Subtle Whisper</span>
                    <span>Standard Atmosphere</span>
                    <span>Prominent</span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-white/50 leading-relaxed">
                  💡 <strong>Smart Auto-Ducking:</strong> The soundscape plays softly in the background when Zoya is idle, and automatically dips whenever you speak or Zoya gives a voice response.
                </div>
              </motion.div>
            )}
          </div>

          {/* SECTION 6: DATA & CLEAR CHAT */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white/90">Chat History</div>
              <div className="text-xs text-white/50 mt-0.5">Clear stored conversation messages</div>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear all conversation history?")) {
                  onClearHistory();
                  resetZoyaSession();
                }
              }}
              disabled={!hasHistory}
              className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/30 text-red-300 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Zoya AI Assistant v2.0</span>
          <span>Theme: {currentTheme.name}</span>
        </div>
      </motion.div>
    </div>
  );
}

