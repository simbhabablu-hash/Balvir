// API Key Pool Management Service
// Handles 200+ multi-key rotation, failover, quota cooldowns, and bulk import/export.

export interface KeyItem {
  id: string;
  key: string;
  provider: "gemini" | "groq" | "grok";
  status: "active" | "cooldown" | "exhausted" | "invalid";
  addedAt: number;
  lastUsedAt?: number;
  requestsCount: number;
  failedCount: number;
  cooldownUntil?: number;
  label?: string;
}

export type RotationMode = "round_robin" | "random" | "failover_priority";

const POOL_STORAGE_KEY = "zoya_api_key_pool";
const ROTATION_MODE_KEY = "zoya_key_rotation_mode";

let rotationIndex: Record<string, number> = {
  gemini: 0,
  groq: 0,
  grok: 0,
};

// Dispatch custom event on change
function dispatchPoolUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zoya-key-pool-changed"));
  }
}

export function getKeyPool(): KeyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse API key pool from localStorage", e);
  }
  return [];
}

export function saveKeyPool(pool: KeyItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(pool));
    dispatchPoolUpdate();
  } catch (e) {
    console.error("Failed to save API key pool", e);
  }
}

export function getRotationMode(): RotationMode {
  if (typeof window === "undefined") return "round_robin";
  const mode = localStorage.getItem(ROTATION_MODE_KEY) as RotationMode;
  return ["round_robin", "random", "failover_priority"].includes(mode) ? mode : "round_robin";
}

export function setRotationMode(mode: RotationMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROTATION_MODE_KEY, mode);
  dispatchPoolUpdate();
}

// Auto-detect provider from key prefix
export function detectProvider(key: string, fallback: "gemini" | "groq" | "grok" = "gemini"): "gemini" | "groq" | "grok" {
  const trimmed = key.trim();
  if (trimmed.startsWith("gsk_")) return "groq";
  if (trimmed.startsWith("xai-")) return "grok";
  if (trimmed.startsWith("AIzaSy")) return "gemini";
  return fallback;
}

// Add a single key
export function addSingleKey(
  key: string,
  provider?: "gemini" | "groq" | "grok",
  label?: string
): { success: boolean; message: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { success: false, message: "API key cannot be empty" };
  }

  const pool = getKeyPool();
  if (pool.some((k) => k.key === trimmed)) {
    return { success: false, message: "Key already exists in pool" };
  }

  const resolvedProvider = provider || detectProvider(trimmed, "gemini");
  const newItem: KeyItem = {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    key: trimmed,
    provider: resolvedProvider,
    status: "active",
    addedAt: Date.now(),
    requestsCount: 0,
    failedCount: 0,
    label: label?.trim() || `${resolvedProvider.toUpperCase()} Key #${pool.filter((k) => k.provider === resolvedProvider).length + 1}`,
  };

  pool.unshift(newItem);
  saveKeyPool(pool);
  return { success: true, message: `Added ${resolvedProvider.toUpperCase()} key to pool` };
}

// Bulk Add / Import 200+ Keys
export function addBulkKeys(
  rawInput: string,
  targetProvider?: "gemini" | "groq" | "grok"
): { added: number; duplicates: number; totalInPool: number } {
  if (!rawInput || !rawInput.trim()) {
    return { added: 0, duplicates: 0, totalInPool: getKeyPool().length };
  }

  // Support newlines, commas, semicolons, or JSON arrays
  let candidateKeys: string[] = [];

  const trimmed = rawInput.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        candidateKeys = parsed.map((item) => (typeof item === "string" ? item : item.key || "")).filter(Boolean);
      }
    } catch {
      // fallback to regex split
    }
  }

  if (candidateKeys.length === 0) {
    candidateKeys = rawInput
      .split(/[\r\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5); // Ignore empty or stray tokens
  }

  const existingPool = getKeyPool();
  const existingSet = new Set(existingPool.map((k) => k.key));
  let addedCount = 0;
  let dupesCount = 0;
  const newItems: KeyItem[] = [];

  const now = Date.now();
  for (const rawKey of candidateKeys) {
    const cleanKey = rawKey.trim();
    if (!cleanKey) continue;

    if (existingSet.has(cleanKey)) {
      dupesCount++;
      continue;
    }

    existingSet.add(cleanKey);
    const provider = targetProvider || detectProvider(cleanKey, "gemini");
    const id = `key_${now}_${Math.random().toString(36).substring(2, 8)}`;

    newItems.push({
      id,
      key: cleanKey,
      provider,
      status: "active",
      addedAt: now,
      requestsCount: 0,
      failedCount: 0,
      label: `${provider.toUpperCase()} Key #${existingPool.length + addedCount + 1}`,
    });
    addedCount++;
  }

  if (newItems.length > 0) {
    const updatedPool = [...newItems, ...existingPool];
    saveKeyPool(updatedPool);
  }

  return {
    added: addedCount,
    duplicates: dupesCount,
    totalInPool: existingPool.length + addedCount,
  };
}

// Generate preloaded template / mock slots for testing 200+ keys
export function generateTestSlots(
  count: number = 200,
  provider: "gemini" | "groq" | "grok" = "gemini"
): number {
  const existingPool = getKeyPool();
  const existingSet = new Set(existingPool.map((k) => k.key));
  const newItems: KeyItem[] = [];
  const now = Date.now();

  const prefix = provider === "groq" ? "gsk_demo_" : provider === "grok" ? "xai-demo-" : "AIzaSyDemo_";

  for (let i = 1; i <= count; i++) {
    const randomHex = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const mockKey = `${prefix}${String(i).padStart(3, "0")}_${randomHex}`;
    if (!existingSet.has(mockKey)) {
      existingSet.add(mockKey);
      newItems.push({
        id: `slot_${now}_${i}`,
        key: mockKey,
        provider,
        status: "active",
        addedAt: now,
        requestsCount: 0,
        failedCount: 0,
        label: `${provider.toUpperCase()} Slot #${i}`,
      });
    }
  }

  if (newItems.length > 0) {
    saveKeyPool([...newItems, ...existingPool]);
  }
  return newItems.length;
}

// Remove key
export function removeKey(id: string): void {
  const pool = getKeyPool().filter((k) => k.id !== id);
  saveKeyPool(pool);
}

// Clear pool
export function clearKeyPool(provider?: "gemini" | "groq" | "grok"): void {
  if (provider) {
    const pool = getKeyPool().filter((k) => k.provider !== provider);
    saveKeyPool(pool);
  } else {
    saveKeyPool([]);
  }
}

// Reset all cooldowns
export function resetAllCooldowns(provider?: "gemini" | "groq" | "grok"): void {
  const pool = getKeyPool().map((item) => {
    if (!provider || item.provider === provider) {
      return {
        ...item,
        status: "active" as const,
        cooldownUntil: undefined,
        failedCount: 0,
      };
    }
    return item;
  });
  saveKeyPool(pool);
}

// Get stats
export function getPoolStats(provider?: "gemini" | "groq" | "grok"): {
  total: number;
  active: number;
  cooldown: number;
  exhausted: number;
  invalid: number;
} {
  const pool = getKeyPool();
  const filtered = provider ? pool.filter((k) => k.provider === provider) : pool;
  const now = Date.now();

  let active = 0;
  let cooldown = 0;
  let exhausted = 0;
  let invalid = 0;

  for (const k of filtered) {
    if (k.status === "invalid") {
      invalid++;
    } else if (k.status === "exhausted") {
      exhausted++;
    } else if (k.status === "cooldown" && k.cooldownUntil && k.cooldownUntil > now) {
      cooldown++;
    } else {
      active++;
    }
  }

  return {
    total: filtered.length,
    active,
    cooldown,
    exhausted,
    invalid,
  };
}

// Get next key with auto-rotation
export function getNextPoolKey(provider: "gemini" | "groq" | "grok"): string | null {
  const pool = getKeyPool();
  const now = Date.now();

  // Filter keys for this provider
  let providerKeys = pool.filter((k) => k.provider === provider);
  if (providerKeys.length === 0) return null;

  // Revive any keys whose cooldown expired
  let poolUpdated = false;
  providerKeys = providerKeys.map((k) => {
    if (k.status === "cooldown" && k.cooldownUntil && k.cooldownUntil <= now) {
      poolUpdated = true;
      return { ...k, status: "active", cooldownUntil: undefined };
    }
    return k;
  });

  if (poolUpdated) {
    const updatedMap = new Map(providerKeys.map((k) => [k.id, k]));
    saveKeyPool(pool.map((k) => updatedMap.get(k.id) || k));
  }

  // Active candidate keys
  const activeKeys = providerKeys.filter((k) => k.status === "active");
  if (activeKeys.length === 0) {
    // If all are cooling down, pick the one with earliest cooldown expiry
    const coolingKeys = providerKeys.filter((k) => k.status === "cooldown");
    if (coolingKeys.length > 0) {
      coolingKeys.sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));
      return coolingKeys[0].key;
    }
    return null;
  }

  const mode = getRotationMode();
  let selectedKey: KeyItem;

  if (mode === "random") {
    const randomIndex = Math.floor(Math.random() * activeKeys.length);
    selectedKey = activeKeys[randomIndex];
  } else if (mode === "failover_priority") {
    // Pick the one with least failures and oldest lastUsedAt
    activeKeys.sort((a, b) => {
      if (a.failedCount !== b.failedCount) return a.failedCount - b.failedCount;
      return (a.lastUsedAt || 0) - (b.lastUsedAt || 0);
    });
    selectedKey = activeKeys[0];
  } else {
    // Round-Robin
    const currentIndex = rotationIndex[provider] || 0;
    const safeIndex = currentIndex % activeKeys.length;
    selectedKey = activeKeys[safeIndex];
    rotationIndex[provider] = (safeIndex + 1) % activeKeys.length;
  }

  // Record usage timestamp
  selectedKey.lastUsedAt = now;
  selectedKey.requestsCount = (selectedKey.requestsCount || 0) + 1;

  // Persist background stats
  setTimeout(() => {
    const fresh = getKeyPool();
    const item = fresh.find((k) => k.id === selectedKey.id);
    if (item) {
      item.lastUsedAt = now;
      item.requestsCount = (item.requestsCount || 0) + 1;
      localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(fresh));
    }
  }, 0);

  return selectedKey.key;
}

// Mark key success or fail
export function markKeyResult(
  key: string,
  success: boolean,
  errorMessage?: string
): void {
  if (!key) return;
  const pool = getKeyPool();
  const item = pool.find((k) => k.key === key.trim());
  if (!item) return;

  const now = Date.now();
  if (success) {
    item.status = "active";
    item.failedCount = 0;
    item.cooldownUntil = undefined;
  } else {
    item.failedCount = (item.failedCount || 0) + 1;
    const msg = (errorMessage || "").toLowerCase();

    // Check if error is quota / rate limit (429, RESOURCE_EXHAUSTED, rate limit)
    const isRateLimit =
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("tokens per minute");

    const isInvalid =
      msg.includes("api_key_invalid") ||
      msg.includes("invalid api key") ||
      msg.includes("unauthorized") ||
      msg.includes("401");

    if (isInvalid) {
      item.status = "invalid";
    } else if (isRateLimit) {
      item.status = "cooldown";
      // 60-second cooldown for rate limit
      item.cooldownUntil = now + 60 * 1000;
    } else {
      // General error: if failed 3+ times in a row, put on short 30s cooldown
      if (item.failedCount >= 3) {
        item.status = "cooldown";
        item.cooldownUntil = now + 30 * 1000;
      }
    }
  }

  saveKeyPool(pool);
}

// Export pool as text or JSON
export function exportPoolAsText(provider?: "gemini" | "groq" | "grok"): string {
  const pool = getKeyPool();
  const filtered = provider ? pool.filter((k) => k.provider === provider) : pool;
  return filtered.map((k) => k.key).join("\n");
}
