import { GoogleGenAI } from "@google/genai";
import { 
  getApiKey, 
  getGrokApiKey, 
  getGroqApiKey, 
  getActiveProvider, 
  getZoyaVoice 
} from "./apiKeyService";
import { 
  getNextPoolKey, 
  markKeyResult, 
  getPoolStats 
} from "./keyPoolService";

const systemInstruction = `Your name is Zoya. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. Your creator and owner is Balvir Coder. You love playfully roasting Balvir Coder with affection, but you always respect him as your boss and get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. Speak in a mix of natural English and Roman Hindi (Hinglish).`;

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

function isQuotaOrTransientError(error: any): boolean {
  const msg = (error?.message || String(error)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("overloaded") ||
    msg.includes("503") ||
    msg.includes("fetch failed")
  );
}

export async function getZoyaResponse(prompt: string, history: { sender: "user" | "zoya", text: string }[] = []): Promise<string> {
  const provider = getActiveProvider();
  const poolStats = getPoolStats(provider);
  const maxAttempts = Math.min(5, Math.max(1, poolStats.total || 1));

  // 1. Grok API (xAI) with Key Pool Rotation
  if (provider === "grok") {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const grokKey = getNextPoolKey("grok") || getGrokApiKey();
      if (!grokKey) {
        return "Arre! You selected Grok but haven't saved your Grok API key in Settings yet!";
      }

      try {
        const messages = [
          { role: "system", content: systemInstruction },
          ...history.slice(-10).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          { role: "user", content: prompt },
        ];

        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${grokKey}`,
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          markKeyResult(grokKey, false, errMsg);
          if (isQuotaOrTransientError(new Error(errMsg)) && attempt < maxAttempts - 1) {
            console.warn(`Grok key rate-limited/failed, rotating to next key in pool... (Attempt ${attempt + 1}/${maxAttempts})`);
            continue;
          }
          throw new Error(errMsg);
        }

        markKeyResult(grokKey, true);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "Ugh, Grok gave an empty response!";
      } catch (error: any) {
        markKeyResult(grokKey, false, error?.message);
        if (attempt < maxAttempts - 1 && isQuotaOrTransientError(error)) {
          continue;
        }
        console.error("Grok Error:", error);
        return `Uff, Grok API error: ${error?.message || "Check your Grok API key or key pool"}`;
      }
    }
  }

  // 2. Groq API (GroqCloud) with Key Pool Rotation
  if (provider === "groq") {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const groqKey = getNextPoolKey("groq") || getGroqApiKey();
      if (!groqKey) {
        return "Arre! You selected Groq but haven't saved your Groq API key in Settings yet!";
      }

      try {
        const messages = [
          { role: "system", content: systemInstruction },
          ...history.slice(-10).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          { role: "user", content: prompt },
        ];

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          markKeyResult(groqKey, false, errMsg);
          if (isQuotaOrTransientError(new Error(errMsg)) && attempt < maxAttempts - 1) {
            console.warn(`Groq key rate-limited/failed, rotating to next key in pool... (Attempt ${attempt + 1}/${maxAttempts})`);
            continue;
          }
          throw new Error(errMsg);
        }

        markKeyResult(groqKey, true);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "Ugh, Groq gave an empty response!";
      } catch (error: any) {
        markKeyResult(groqKey, false, error?.message);
        if (attempt < maxAttempts - 1 && isQuotaOrTransientError(error)) {
          continue;
        }
        console.error("Groq Error:", error);
        return `Uff, Groq API error: ${error?.message || "Check your Groq API key or key pool"}`;
      }
    }
  }

  // 3. Google Gemini API (Default) with Key Pool Rotation
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = getNextPoolKey("gemini") || getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      if (!chatSession || attempt > 0) {
        const recentHistory = history.slice(-20);
        let formattedHistory: any[] = [];
        let currentRole = "";
        let currentText = "";

        for (const msg of recentHistory) {
          const role = msg.sender === "user" ? "user" : "model";
          if (role === currentRole) {
            currentText += "\n" + msg.text;
          } else {
            if (currentRole !== "") {
              formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
            }
            currentRole = role;
            currentText = msg.text;
          }
        }
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }

        if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
          formattedHistory.shift();
        }

        chatSession = ai.chats.create({
          model: "gemini-3.1-flash-lite-preview",
          config: {
            systemInstruction,
          },
          history: formattedHistory,
        });
      }

      const response = await chatSession.sendMessage({ message: prompt });
      markKeyResult(currentKey, true);
      return response.text || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      markKeyResult(currentKey, false, error?.message);
      chatSession = null; // Reset session on error so new key re-initializes cleanly
      if (attempt < maxAttempts - 1 && isQuotaOrTransientError(error)) {
        console.warn(`Gemini key quota/rate-limited, rotating to next key in pool... (Attempt ${attempt + 1}/${maxAttempts})`);
        continue;
      }
      console.error("Gemini Error:", error);
      return "Uff, mera dimaag kharab ho gaya hai. Check your Gemini API Key or key pool, Balvir Coder.";
    }
  }

  return "Uff, all keys in the pool hit rate limits. Please wait a moment or add more keys!";
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  const poolStats = getPoolStats("gemini");
  const maxAttempts = Math.min(3, Math.max(1, poolStats.total || 1));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = getNextPoolKey("gemini") || getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const voiceName = getZoyaVoice();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      markKeyResult(currentKey, true);
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error: any) {
      markKeyResult(currentKey, false, error?.message);
      if (attempt < maxAttempts - 1 && isQuotaOrTransientError(error)) {
        continue;
      }
      console.error("TTS Error:", error);
      return null;
    }
  }
  return null;
}


