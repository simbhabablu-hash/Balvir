import { GoogleGenAI } from "@google/genai";
import { getNextPoolKey, getKeyPool, getPoolStats } from "./keyPoolService";

const STORAGE_KEY = "zoya_custom_api_key";
const GROK_STORAGE_KEY = "zoya_grok_api_key";
const GROQ_STORAGE_KEY = "zoya_groq_api_key";
const PROVIDER_STORAGE_KEY = "zoya_active_provider";
const VOICE_KEY = "zoya_voice_config";

export type AIProvider = "gemini" | "grok" | "groq";

// --- Active Provider ---
export function getActiveProvider(): AIProvider {
  if (typeof window !== "undefined") {
    const provider = localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProvider;
    if (provider && ["gemini", "grok", "groq"].includes(provider)) {
      return provider;
    }
  }
  return "gemini";
}

export function setActiveProvider(provider: AIProvider): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  }
}

// --- Gemini API Key (Pool first, then Custom Key, then process.env) ---
export function getApiKey(): string {
  if (typeof window !== "undefined") {
    // Check if key pool has active Gemini keys
    const poolKey = getNextPoolKey("gemini");
    if (poolKey) {
      return poolKey;
    }

    const customKey = localStorage.getItem(STORAGE_KEY);
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
  }
  return process.env.GEMINI_API_KEY || "";
}

export function getRawCustomApiKey(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) || "";
  }
  return "";
}

export function setApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  }
}

export function hasCustomApiKey(): boolean {
  if (typeof window !== "undefined") {
    const pool = getKeyPool();
    if (pool.length > 0) return true;

    const key = localStorage.getItem(STORAGE_KEY);
    return !!key && key.trim().length > 0;
  }
  return false;
}

// --- Grok API Key (xAI - Pool first, then Custom Key) ---
export function getGrokApiKey(): string {
  if (typeof window !== "undefined") {
    const poolKey = getNextPoolKey("grok");
    if (poolKey) {
      return poolKey;
    }
    return (localStorage.getItem(GROK_STORAGE_KEY) || "").trim();
  }
  return "";
}

export function setGrokApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || !key.trim()) {
      localStorage.removeItem(GROK_STORAGE_KEY);
    } else {
      localStorage.setItem(GROK_STORAGE_KEY, key.trim());
    }
  }
}

// --- Groq API Key (GroqCloud - Pool first, then Custom Key) ---
export function getGroqApiKey(): string {
  if (typeof window !== "undefined") {
    const poolKey = getNextPoolKey("groq");
    if (poolKey) {
      return poolKey;
    }
    return (localStorage.getItem(GROQ_STORAGE_KEY) || "").trim();
  }
  return "";
}

export function setGroqApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || !key.trim()) {
      localStorage.removeItem(GROQ_STORAGE_KEY);
    } else {
      localStorage.setItem(GROQ_STORAGE_KEY, key.trim());
    }
  }
}

// --- Voice Configuration ---
export function getZoyaVoice(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(VOICE_KEY) || "Kore";
  }
  return "Kore";
}

export function setZoyaVoice(voiceName: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(VOICE_KEY, voiceName);
  }
}

// --- Testers ---
export async function testGeminiApiKey(keyToTest: string): Promise<{ success: boolean; message: string }> {
  const apiKey = keyToTest.trim() || getApiKey();
  
  if (!apiKey) {
    return { success: false, message: "No Gemini API key provided or configured." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: "Hello",
    });

    if (response) {
      return { success: true, message: "Gemini API Key verified successfully!" };
    }
    return { success: false, message: "Received empty response from Gemini API." };
  } catch (error: any) {
    console.error("Gemini API Key Test Failed:", error);
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid")) {
      return { success: false, message: "Invalid Gemini API Key. Please check your key." };
    }
    return { success: false, message: `Validation failed: ${errorMsg.slice(0, 100)}` };
  }
}

export async function testGrokApiKey(keyToTest: string): Promise<{ success: boolean; message: string }> {
  const apiKey = keyToTest.trim() || getGrokApiKey();
  if (!apiKey) {
    return { success: false, message: "No Grok API key provided." };
  }

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (res.ok) {
      return { success: true, message: "Grok API Key verified successfully!" };
    } else {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || res.statusText || `HTTP ${res.status}`;
      return { success: false, message: `Grok API error: ${msg}` };
    }
  } catch (error: any) {
    console.error("Grok API Key Test Failed:", error);
    return { success: false, message: `Connection failed: ${error?.message || String(error)}` };
  }
}

export async function testGroqApiKey(keyToTest: string): Promise<{ success: boolean; message: string }> {
  const apiKey = keyToTest.trim() || getGroqApiKey();
  if (!apiKey) {
    return { success: false, message: "No Groq API key provided." };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (res.ok) {
      return { success: true, message: "Groq API Key verified successfully!" };
    } else {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || res.statusText || `HTTP ${res.status}`;
      return { success: false, message: `Groq API error: ${msg}` };
    }
  } catch (error: any) {
    console.error("Groq API Key Test Failed:", error);
    return { success: false, message: `Connection failed: ${error?.message || String(error)}` };
  }
}

