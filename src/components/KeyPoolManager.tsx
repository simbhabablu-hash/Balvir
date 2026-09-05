import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Plus,
  Trash2,
  RotateCw,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Search,
  Sparkles,
  Bot,
  Cpu,
  Layers,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  KeyItem,
  RotationMode,
  getKeyPool,
  saveKeyPool,
  addBulkKeys,
  generateTestSlots,
  removeKey,
  clearKeyPool,
  resetAllCooldowns,
  getPoolStats,
  getRotationMode,
  setRotationMode,
  detectProvider,
  exportPoolAsText
} from "../services/keyPoolService";
import { ThemePreset } from "../services/themeService";

interface Props {
  theme: ThemePreset;
}

export default function KeyPoolManager({ theme }: Props) {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [rotation, setRotation] = useState<RotationMode>("round_robin");
  const [filterProvider, setFilterProvider] = useState<"all" | "gemini" | "groq" | "grok">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Bulk import modal / drawer state
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkProvider, setBulkProvider] = useState<"auto" | "gemini" | "groq" | "grok">("auto");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  // Pagination for large sets (e.g. 200+ keys)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const refreshData = () => {
    setKeys(getKeyPool());
    setRotation(getRotationMode());
  };

  useEffect(() => {
    refreshData();
    const handlePoolUpdate = () => refreshData();
    window.addEventListener("zoya-key-pool-changed", handlePoolUpdate);
    return () => window.removeEventListener("zoya-key-pool-changed", handlePoolUpdate);
  }, []);

  const stats = useMemo(() => {
    return getPoolStats();
  }, [keys]);

  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      const matchProvider = filterProvider === "all" || k.provider === filterProvider;
      const matchQuery =
        !searchQuery ||
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.label && k.label.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchProvider && matchQuery;
    });
  }, [keys, filterProvider, searchQuery]);

  const paginatedKeys = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredKeys.slice(start, start + pageSize);
  }, [filteredKeys, page]);

  const totalPages = Math.ceil(filteredKeys.length / pageSize) || 1;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const targetProv = bulkProvider === "auto" ? undefined : bulkProvider;
    const res = addBulkKeys(bulkText, targetProv);
    setBulkText("");
    setShowBulkInput(false);
    showFeedback(`Successfully added ${res.added} keys! (${res.duplicates} duplicates skipped. Total pool: ${res.totalInPool} keys)`);
  };

  const handlePreload200Keys = (prov: "gemini" | "groq" | "grok") => {
    const added = generateTestSlots(200, prov);
    showFeedback(`Generated 200+ ${prov.toUpperCase()} keys in the rotation pool!`);
  };

  const handleCopyKey = (keyItem: KeyItem) => {
    navigator.clipboard.writeText(keyItem.key);
    setCopiedKeyId(keyItem.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleExportAll = () => {
    const text = exportPoolAsText(filterProvider === "all" ? undefined : filterProvider);
    if (!text) {
      showFeedback("Key pool is currently empty.");
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedExport(true);
    showFeedback(`Copied ${filteredKeys.length} keys to clipboard!`);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleDownloadBackup = () => {
    const text = exportPoolAsText();
    if (!text) {
      showFeedback("Pool is empty.");
      return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zoya_api_key_pool_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Downloaded API keys backup file.");
  };

  const maskKey = (str: string) => {
    if (str.length <= 12) return str;
    return `${str.substring(0, 8)}••••••••${str.substring(str.length - 4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header & Stats Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${theme.accentText}`}>
              <Layers size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                Multi-Key Pool & Load Balancer
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-white/15 ${
                  keys.length >= 200 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-white/10 text-white/90"
                }`}>
                  {keys.length >= 200 ? "200+ Keys Active" : `${keys.length} Keys in Pool`}
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                Prevents quota exhaustion and 429 rate-limits via auto-rotation & instant failover
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowBulkInput(!showBulkInput)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all bg-gradient-to-r ${theme.buttonGradient} text-white shadow-md`}
            >
              <Plus size={14} />
              Add 200+ Keys
            </button>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between animate-fade-in">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-cyan-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Stats Pill Matrix */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total Keys</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold">Active</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{stats.active}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">Cooldown</div>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">{stats.cooldown}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
            <div className="text-[10px] text-rose-400/80 uppercase tracking-wider font-semibold">Invalid</div>
            <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">{stats.invalid}</div>
          </div>
        </div>
      </div>

      {/* Bulk Add / Import 200+ Keys Expandable Panel */}
      {showBulkInput && (
        <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Upload size={14} /> Bulk Paste 200+ Keys
            </div>
            <span className="text-[10px] text-white/40">Paste 1 per line, comma-separated, or JSON array</span>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your 200+ API keys here...
AIzaSy...key1
AIzaSy...key2
gsk_...groq_key3
xai-...grok_key4"
            rows={5}
            className="w-full bg-black/80 border border-white/15 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 font-mono resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Target:</span>
              <select
                value={bulkProvider}
                onChange={(e) => setBulkProvider(e.target.value as any)}
                className="bg-black border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="auto">Auto-Detect Provider</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq Cloud (gsk_)</option>
                <option value="grok">xAI Grok</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkInput(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors disabled:opacity-40"
              >
                Import Keys
              </button>
            </div>
          </div>

          {/* Instant 200+ Generator Buttons */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/50">
            <span>Don't have 200 keys ready? Test load balancing:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePreload200Keys("gemini")}
                className="px-2 py-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition-colors"
              >
                +200 Gemini Slots
              </button>
              <button
                type="button"
                onClick={() => handlePreload200Keys("groq")}
                className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-colors"
              >
                +200 Groq Slots
              </button>
              <button
                type="button"
                onClick={() => handlePreload200Keys("grok")}
                className="px-2 py-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 transition-colors"
              >
                +200 Grok Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Mode & Quick Controls */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className={theme.accentText} />
          <span className="text-white/70 font-medium">Rotation Strategy:</span>
          <select
            value={rotation}
            onChange={(e) => {
              const val = e.target.value as RotationMode;
              setRotation(val);
              setRotationMode(val);
              showFeedback(`Rotation mode set to: ${val.replace("_", " ").toUpperCase()}`);
            }}
            className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="round_robin">Round-Robin (Even Distribution)</option>
            <option value="random">Random Load Balance</option>
            <option value="failover_priority">Failover Priority (Primary First)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetAllCooldowns();
              showFeedback("Reset cooldowns on all keys! All keys are active.");
            }}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Clear all temporary cooldown timers"
          >
            <RefreshCw size={12} />
            Reset Cooldowns
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Copy all keys to clipboard"
          >
            {copiedExport ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            Copy All
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Download pool backup file"
          >
            <Download size={12} />
            Backup
          </button>

          {keys.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all keys from the pool?")) {
                  clearKeyPool();
                  showFeedback("Key pool cleared.");
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
              title="Delete all keys in pool"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search & Provider Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          {(["all", "gemini", "groq", "grok"] as const).map((prov) => {
            const count = prov === "all" ? keys.length : keys.filter((k) => k.provider === prov).length;
            const isSelected = filterProvider === prov;
            return (
              <button
                key={prov}
                type="button"
                onClick={() => {
                  setFilterProvider(prov);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-white/20 text-white shadow-sm font-semibold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {prov.toUpperCase()} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search keys by label or token..."
            className="w-full bg-black/50 border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Key Pool List Items */}
      <div className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
        {paginatedKeys.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-white/30 text-sm">No API keys found in this view</div>
            <div className="text-xs text-white/50">
              Click <span className="text-cyan-300 font-semibold">"Add 200+ Keys"</span> above or use the test generators to seed keys.
            </div>
          </div>
        ) : (
          paginatedKeys.map((item, idx) => {
            const isCopied = copiedKeyId === item.id;
            const provIcon =
              item.provider === "groq" ? (
                <Cpu size={13} className="text-cyan-400" />
              ) : item.provider === "grok" ? (
                <Bot size={13} className="text-pink-400" />
              ) : (
                <Sparkles size={13} className="text-violet-400" />
              );

            const isCooling = item.status === "cooldown" && item.cooldownUntil && item.cooldownUntil > Date.now();
            const statusColor =
              item.status === "invalid"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : isCooling
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

            return (
              <div
                key={item.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-[11px] font-mono text-white/30 w-6 shrink-0">
                    #{(page - 1) * pageSize + idx + 1}
                  </div>
                  <div className="shrink-0">{provIcon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white/90 truncate font-medium">
                        {maskKey(item.key)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-mono font-semibold ${statusColor}`}>
                        {isCooling ? "Cooldown" : item.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 flex items-center gap-2 mt-0.5">
                      <span>{item.label || item.provider.toUpperCase()}</span>
                      <span>•</span>
                      <span>{item.requestsCount || 0} reqs</span>
                      {item.failedCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400/80">{item.failedCount} fails</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyKey(item)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Copy Key"
                  >
                    {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeKey(item.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/10 transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/60 px-1">
          <span>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredKeys.length)} of {filteredKeys.length} keys
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <span className="px-2 font-mono">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
