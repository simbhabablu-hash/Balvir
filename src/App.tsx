import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Settings, Waves, Layers, Key, Smartphone, PhoneCall } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import { hasCustomApiKey } from "./services/apiKeyService";
import { getKeyPool } from "./services/keyPoolService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import SettingsModal from "./components/SettingsModal";
import GeminiKeyModal from "./components/GeminiKeyModal";
import SpeakerControlModal from "./components/SpeakerControlModal";
import PhoneCallView from "./components/PhoneCallView";
import { getSpeakerSettings, SpeakerSettings } from "./services/speakerService";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { getSavedTheme, ThemePreset } from "./services/themeService";
import { ambientEngine, getAmbientSettings, saveAmbientSettings } from "./services/ambientAudioService";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemePreset>(() => getSavedTheme());
  const [appState, setAppState] = useState<AppState>("idle");
  const [isAmbientActive, setIsAmbientActive] = useState<boolean>(() => getAmbientSettings().enabled);
  const [poolCount, setPoolCount] = useState<number>(() => getKeyPool().length);

  useEffect(() => {
    const handlePoolUpdate = () => {
      setPoolCount(getKeyPool().length);
    };
    window.addEventListener("zoya-key-pool-changed", handlePoolUpdate);
    return () => window.removeEventListener("zoya-key-pool-changed", handlePoolUpdate);
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getSavedTheme());
    };
    window.addEventListener("zoya-theme-changed", handleThemeChange);
    return () => window.removeEventListener("zoya-theme-changed", handleThemeChange);
  }, []);

  useEffect(() => {
    const handleAmbientChange = (e: any) => {
      if (e.detail) {
        setIsAmbientActive(Boolean(e.detail.enabled));
      }
    };
    window.addEventListener("zoya-ambient-settings-changed", handleAmbientChange);
    return () => window.removeEventListener("zoya-ambient-settings-changed", handleAmbientChange);
  }, []);

  // Update ambient soundscape ducking/swelling based on Zoya's current state
  useEffect(() => {
    ambientEngine.setAppState(appState);
  }, [appState]);

  // Start ambient audio on first user click/interaction anywhere if enabled
  useEffect(() => {
    const handleFirstInteraction = () => {
      const settings = getAmbientSettings();
      if (settings.enabled) {
        ambientEngine.start();
      }
    };
    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGeminiKeyModal, setShowGeminiKeyModal] = useState(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [showPhoneCallView, setShowPhoneCallView] = useState(false);
  const [speakerSettings, setSpeakerSettings] = useState<SpeakerSettings>(() => getSpeakerSettings());
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(() => hasCustomApiKey());
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    const handleSpeakerUpdate = () => {
      setSpeakerSettings(getSpeakerSettings());
    };
    window.addEventListener("zoya-speaker-changed", handleSpeakerUpdate);
    return () => window.removeEventListener("zoya-speaker-changed", handleSpeakerUpdate);
  }, []);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => {
            setShowSettingsModal(false);
            setHasGeminiKey(hasCustomApiKey());
          }}
          onClearHistory={() => setMessages([])}
          hasHistory={messages.length > 0}
        />
      )}

      {/* Gemini API Key Quick Modal */}
      <GeminiKeyModal
        isOpen={showGeminiKeyModal}
        onClose={() => {
          setShowGeminiKeyModal(false);
          setHasGeminiKey(hasCustomApiKey());
        }}
        theme={theme}
      />

      {/* Speakerphone & Phone Mode Audio Control Modal */}
      <SpeakerControlModal
        isOpen={showSpeakerModal}
        onClose={() => setShowSpeakerModal(false)}
        theme={theme}
      />

      {/* Smartphone Call Screen View */}
      <PhoneCallView
        isOpen={showPhoneCallView}
        onClose={() => setShowPhoneCallView(false)}
        appState={appState}
        theme={theme}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        isMicActive={isSessionActive}
        onToggleMic={toggleListening}
        onOpenGeminiKey={() => setShowGeminiKeyModal(true)}
        onOpenSpeakerModal={() => setShowSpeakerModal(true)}
        lastMessage={messages.length > 0 ? messages[messages.length - 1].text : undefined}
      />

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${theme.bgGradient1} blur-[120px] rounded-full transition-colors duration-700`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${theme.bgGradient2} blur-[120px] rounded-full transition-colors duration-700`} />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${theme.logoGradient} flex items-center justify-center font-bold text-sm shadow-md transition-all duration-500`}>
            Z
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Zoya</h1>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear the chat history?")) {
                  setMessages([]);
                  resetZoyaSession();
                }
              }}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
              title="Clear Chat History"
            >
              <Trash2 size={18} className="opacity-70" />
            </button>
          )}
          <button
            onClick={() => {
              const current = getAmbientSettings();
              const updated = saveAmbientSettings({ enabled: !current.enabled });
              if (updated.enabled) {
                ambientEngine.start();
              } else {
                ambientEngine.stop();
              }
            }}
            className={`p-2 rounded-full transition-all border relative ${
              isAmbientActive
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title={isAmbientActive ? "Futuristic Ambient Soundscape: Active" : "Futuristic Ambient Soundscape: Disabled"}
          >
            <Waves size={18} />
            {isAmbientActive && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-70" />
            ) : (
              <Volume2 size={18} className="opacity-70" />
            )}
          </button>
          {/* Speakerphone & Phone Mode Quick Selector */}
          <button
            onClick={() => setShowSpeakerModal(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-all border text-xs flex items-center gap-1.5 font-medium shadow-sm ${
              speakerSettings.loudspeakerEnabled
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-emerald-500/10"
                : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 shadow-cyan-500/10"
            }`}
            title="Speakerphone & Phone Audio: Click to adjust volume boost & audio device"
          >
            {speakerSettings.loudspeakerEnabled ? (
              <Volume2 size={14} className="text-emerald-400" />
            ) : (
              <Smartphone size={14} className="text-cyan-400" />
            )}
            <span className="font-semibold text-[11px]">
              {speakerSettings.loudspeakerEnabled ? "Speaker ON" : "Phone Mode"}
            </span>
          </button>

          {/* Quick Gemini API Key Button */}
          <button
            onClick={() => setShowGeminiKeyModal(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-all border text-xs flex items-center gap-1.5 font-medium shadow-sm ${
              hasGeminiKey
                ? "bg-violet-500/15 border-violet-500/40 text-violet-300 hover:bg-violet-500/25 shadow-violet-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Gemini API Key: Click to add or update your Google AI Studio key"
          >
            <Key size={14} className={hasGeminiKey ? "text-violet-400" : "text-white/40"} />
            <span className="font-semibold text-[11px] hidden xs:inline">
              {hasGeminiKey ? "Gemini Key" : "Add Key"}
            </span>
            {hasGeminiKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          {/* Phone Call Screen Mode (Smartphone UI) */}
          <button
            onClick={() => setShowPhoneCallView(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/70 hover:text-white relative"
            title="Smartphone Call Mode (Full-screen Phone Call HUD)"
          >
            <PhoneCall size={17} className="text-cyan-400" />
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-all border text-xs flex items-center gap-1.5 font-medium shadow-sm ${
              poolCount >= 200
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-emerald-500/10"
                : poolCount > 0
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 shadow-cyan-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
            }`}
            title="Multi-Key Pool & Load Balancer (Click to manage 200+ keys)"
          >
            <Layers size={14} className={poolCount >= 200 ? "text-emerald-400" : poolCount > 0 ? "text-cyan-400" : "text-white/40"} />
            <span className="font-mono text-[11px] font-semibold hidden md:inline">
              {poolCount >= 200 ? "200+ Keys" : poolCount > 0 ? `${poolCount} Keys` : "Key Pool"}
            </span>
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 relative"
            title="Zoya Settings & Themes"
          >
            <Settings size={18} className="opacity-70 hover:opacity-100" />
            {hasGeminiKey && (
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${theme.indicatorColor} animate-pulse`} />
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Visualizer & Chat */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
        
        {/* Left Column: Zoya Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-cyan-300/80 text-sm md:text-base italic font-serif"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Replying...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer (Fixed Full Screen Background) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} theme={theme} />
        </div>

        {/* Right Column: User Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-2 ${theme.accentText} text-sm md:text-base italic`}
                >
                  <div className={`w-2 h-2 rounded-full ${theme.indicatorColor} animate-pulse`} />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message to Zoya..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className={`p-2 rounded-full ${theme.sendButtonBg} disabled:opacity-50 transition-colors text-white`}
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl"
              title="Type instead"
            >
              <Keyboard size={20} className="opacity-70" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
