export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  // Gradient classes
  bgGradient1: string; // Left/Top ambient glow
  bgGradient2: string; // Right/Bottom ambient glow
  logoGradient: string; // Avatar & badges
  buttonGradient: string; // Primary CTA buttons
  sendButtonBg: string; // Send button class
  activeBorder: string; // Border for selected cards
  activeBg: string; // Background for active tabs/cards
  accentText: string; // Highlighted text color
  indicatorColor: string; // Pulsing dot
  topBarGradient: string; // Modal accent stripe
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "violet-pink",
    name: "Cosmic Zoya",
    description: "Signature Violet & Neon Pink",
    primaryHex: "#8b5cf6",
    secondaryHex: "#ec4899",
    bgGradient1: "bg-violet-900/25",
    bgGradient2: "bg-pink-900/25",
    logoGradient: "from-violet-500 to-pink-500",
    buttonGradient: "from-violet-600 via-pink-600 to-purple-600 hover:from-violet-500 hover:to-pink-500",
    sendButtonBg: "bg-violet-500 hover:bg-violet-600",
    activeBorder: "border-violet-500",
    activeBg: "bg-violet-500/20",
    accentText: "text-violet-400",
    indicatorColor: "bg-violet-400",
    topBarGradient: "from-violet-500 via-pink-500 to-cyan-500",
  },
  {
    id: "neon-cyan",
    name: "Cyberpunk Blue",
    description: "Electric Cyan & Neon Sapphire",
    primaryHex: "#06b6d4",
    secondaryHex: "#3b82f6",
    bgGradient1: "bg-cyan-900/25",
    bgGradient2: "bg-blue-900/25",
    logoGradient: "from-cyan-500 to-blue-500",
    buttonGradient: "from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500",
    sendButtonBg: "bg-cyan-500 hover:bg-cyan-600",
    activeBorder: "border-cyan-500",
    activeBg: "bg-cyan-500/20",
    accentText: "text-cyan-400",
    indicatorColor: "bg-cyan-400",
    topBarGradient: "from-cyan-500 via-blue-500 to-indigo-500",
  },
  {
    id: "emerald-teal",
    name: "Aurora Emerald",
    description: "Radiant Mint & Deep Teal",
    primaryHex: "#10b981",
    secondaryHex: "#06b6d4",
    bgGradient1: "bg-emerald-900/25",
    bgGradient2: "bg-teal-900/25",
    logoGradient: "from-emerald-500 to-teal-500",
    buttonGradient: "from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500",
    sendButtonBg: "bg-emerald-500 hover:bg-emerald-600",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-500/20",
    accentText: "text-emerald-400",
    indicatorColor: "bg-emerald-400",
    topBarGradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    id: "sunset-amber",
    name: "Solar Ember",
    description: "Sunset Amber & Fiery Orange",
    primaryHex: "#f59e0b",
    secondaryHex: "#ef4444",
    bgGradient1: "bg-amber-900/25",
    bgGradient2: "bg-orange-900/25",
    logoGradient: "from-amber-500 to-rose-500",
    buttonGradient: "from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500",
    sendButtonBg: "bg-amber-500 hover:bg-amber-600",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-500/20",
    accentText: "text-amber-400",
    indicatorColor: "bg-amber-400",
    topBarGradient: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: "crimson-ruby",
    name: "Midnight Ruby",
    description: "Deep Crimson & Velvet Magenta",
    primaryHex: "#f43f5e",
    secondaryHex: "#a855f7",
    bgGradient1: "bg-rose-900/25",
    bgGradient2: "bg-purple-900/25",
    logoGradient: "from-rose-500 to-purple-500",
    buttonGradient: "from-rose-600 via-red-600 to-purple-600 hover:from-rose-500 hover:to-purple-500",
    sendButtonBg: "bg-rose-500 hover:bg-rose-600",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-500/20",
    accentText: "text-rose-400",
    indicatorColor: "bg-rose-400",
    topBarGradient: "from-rose-500 via-pink-500 to-purple-500",
  },
  {
    id: "electric-indigo",
    name: "Neon Indigo",
    description: "Royal Indigo & Sky Blue",
    primaryHex: "#6366f1",
    secondaryHex: "#38bdf8",
    bgGradient1: "bg-indigo-900/25",
    bgGradient2: "bg-sky-900/25",
    logoGradient: "from-indigo-500 to-sky-500",
    buttonGradient: "from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500",
    sendButtonBg: "bg-indigo-500 hover:bg-indigo-600",
    activeBorder: "border-indigo-500",
    activeBg: "bg-indigo-500/20",
    accentText: "text-indigo-400",
    indicatorColor: "bg-indigo-400",
    topBarGradient: "from-indigo-500 via-blue-500 to-sky-500",
  },
];

const THEME_STORAGE_KEY = "zoya_ui_theme_id";

export function getSavedThemeId(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_PRESETS.some((t) => t.id === saved)) {
      return saved;
    }
  }
  return "violet-pink";
}

export function getSavedTheme(): ThemePreset {
  const id = getSavedThemeId();
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}

export function saveThemeId(themeId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    window.dispatchEvent(new CustomEvent("zoya-theme-changed", { detail: { themeId } }));
  }
}
