import React, { useState, useEffect } from "react";
import { Key, Sparkles, Check, AlertCircle, Eye, EyeOff, ExternalLink, ShieldCheck, X } from "lucide-react";
import { getRawCustomApiKey, setApiKey, testGeminiApiKey, hasCustomApiKey } from "../services/apiKeyService";
import { addSingleKey, getKeyPool } from "../services/keyPoolService";
import { ThemePreset } from "../services/themeService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemePreset;
}

export default function GeminiKeyModal({ isOpen, onClose, theme }: Props) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentHasKey, setCurrentHasKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getRawCustomApiKey();
      setApiKeyInput(existing);
      setCurrentHasKey(hasCustomApiKey());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setTestResult({ success: false, message: "Pehle Gemini API key daaliye (Please enter an API key first)" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyToTest);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Verification failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    setApiKey(trimmed);
    if (trimmed) {
      addSingleKey(trimmed, "gemini", "Primary Gemini Key");
    }
    setSavedSuccess(true);
    setCurrentHasKey(!!trimmed);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setApiKey("");
    setApiKeyInput("");
    setCurrentHasKey(false);
    setTestResult({ success: true, message: "Gemini API key removed. Using default key." });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

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
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 text-violet-300 shrink-0">
            <Key size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Gemini API Key Add Karein</h2>
              {currentHasKey && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <Check size={10} /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Apni Google Gemini API key yahan jod kar Zoya se unlimited baatcheet aur voice call karein.
            </p>
          </div>
        </div>

        {/* Info / How-to-get box in Hindi & English */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-white/90">
            <span className="flex items-center gap-1.5 text-violet-300">
              <Sparkles size={14} /> Free Gemini API Key Kaise Lein?
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-medium"
            >
              Get Free Key <ExternalLink size={11} />
            </a>
          </div>
          <ol className="text-white/65 space-y-1 pl-4 list-decimal text-[11px] leading-relaxed">
            <li>Google AI Studio (<span className="text-white/90 font-mono">aistudio.google.com/app/apikey</span>) par jayein.</li>
            <li>Apne Google account se sign in karein aur <b>"Create API Key"</b> par click karein.</li>
            <li>Wahan se key copy karke neeche diye gaye box mein paste kar dein.</li>
          </ol>
        </div>

        {/* Key Input Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-white/80">Google Gemini API Key (AIzaSy...)</label>
            {apiKeyInput && (
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing}
                className="text-violet-400 hover:text-violet-200 text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                {testing ? "Testing..." : "Test Key"}
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... key here"
              className="w-full bg-black/60 border border-white/15 rounded-xl py-3 pl-4 pr-11 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 p-1.5 text-white/40 hover:text-white transition-colors"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Verification Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {testResult.success ? <Check size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Success confirmation */}
        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <ShieldCheck size={16} />
            <span>Gemini API Key successfully saved and activated!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {apiKeyInput ? (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
            >
              Remove Key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r ${theme.buttonGradient} text-white shadow-lg transition-transform active:scale-95`}
            >
              Save & Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
