import type { ArchResult } from "../api/client";

interface ArchDiagramProps {
  ranked: ArchResult[];
}

const ARCH_META: Record<
  string,
  { gradient: string; glow: string; icon: string; border: string; text: string; bg: string; accent: string; services: string[] }
> = {
  COPILOT_STUDIO: {
    gradient: "from-blue-600/20 to-blue-900/40",
    glow: "shadow-blue-500/20",
    icon: "\u26A1",
    border: "border-blue-500/60",
    text: "text-blue-300",
    bg: "#1e3a5f",
    accent: "#3b82f6",
    services: ["Power Virtual Agents", "Dataverse", "Teams Channel", "Power Automate"],
  },
  AGENT_BUILDER: {
    gradient: "from-emerald-600/20 to-emerald-900/40",
    glow: "shadow-emerald-500/20",
    icon: "\uD83E\uDDE9",
    border: "border-emerald-500/60",
    text: "text-emerald-300",
    bg: "#1a3c34",
    accent: "#10b981",
    services: ["M365 Copilot", "Graph API", "SharePoint", "Semantic Index"],
  },
  FABRIC_AGENT: {
    gradient: "from-purple-600/20 to-purple-900/40",
    glow: "shadow-purple-500/20",
    icon: "\uD83D\uDCCA",
    border: "border-purple-500/60",
    text: "text-purple-300",
    bg: "#3b1f4a",
    accent: "#a855f7",
    services: ["Fabric Lakehouse", "Power BI", "Data Pipeline", "OneLake"],
  },
  FOUNDRY_AGENT: {
    gradient: "from-amber-600/20 to-amber-900/40",
    glow: "shadow-amber-500/20",
    icon: "\uD83E\uDD16",
    border: "border-amber-500/60",
    text: "text-amber-300",
    bg: "#3b2a1a",
    accent: "#f59e0b",
    services: ["Azure OpenAI", "AI Foundry", "Managed Identity", "Key Vault"],
  },
};

const BAR_COLORS: Record<string, { bar: string; track: string }> = {
  COPILOT_STUDIO: { bar: "bg-gradient-to-r from-blue-500 to-blue-400", track: "bg-blue-950/50" },
  AGENT_BUILDER: { bar: "bg-gradient-to-r from-emerald-500 to-emerald-400", track: "bg-emerald-950/50" },
  FABRIC_AGENT: { bar: "bg-gradient-to-r from-purple-500 to-purple-400", track: "bg-purple-950/50" },
  FOUNDRY_AGENT: { bar: "bg-gradient-to-r from-amber-500 to-amber-400", track: "bg-amber-950/50" },
};

export default function ArchDiagram({ ranked }: ArchDiagramProps) {
  const maxScore = Math.max(...ranked.map((r) => r.score), 1);
  const primary = ranked[0];
  const meta = ARCH_META[primary?.id || ""] || ARCH_META.FOUNDRY_AGENT;

  return (
    <div className="space-y-8">
      {/* Score comparison bars */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Architecture Scoring
        </h3>
        <div className="space-y-3">
          {ranked.map((arch, idx) => {
            const barWidth = Math.max((arch.score / maxScore) * 100, 8);
            const isPrimary = idx === 0;
            const colors = BAR_COLORS[arch.id] || BAR_COLORS.FOUNDRY_AGENT;
            const archMeta = ARCH_META[arch.id] || ARCH_META.FOUNDRY_AGENT;

            return (
              <div key={arch.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{archMeta.icon}</span>
                    <span className={`text-sm font-semibold ${isPrimary ? "text-white" : "text-slate-400"}`}>
                      {arch.label}
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 font-mono">{arch.score} pts</span>
                    <span className={`font-bold ${isPrimary ? archMeta.text : "text-slate-500"}`}>
                      {Math.round(arch.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <div className={`w-full rounded-full h-3 ${colors.track} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full ${colors.bar} transition-all duration-700 ease-out ${isPrimary ? "shadow-lg" : "opacity-60"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture flow diagram — rich SVG */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Architecture Flow
        </h3>
        <div className={`rounded-xl bg-gradient-to-br ${meta.gradient} border ${meta.border} p-4 shadow-xl ${meta.glow}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{meta.icon}</span>
            <span className={`text-lg font-bold ${meta.text}`}>{primary?.label}</span>
            <span className="text-xs text-slate-500 ml-auto font-mono">
              {Math.round((primary?.confidence || 0) * 100)}% confidence
            </span>
          </div>

          <svg viewBox="0 0 720 260" className="w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={meta.accent} stopOpacity="0.3" />
                <stop offset="100%" stopColor={meta.accent} stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={meta.accent} opacity="0.8" />
              </marker>
            </defs>

            {/* Background grid */}
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`vg${i}`} x1={i * 50} y1="0" x2={i * 50} y2="260" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`hg${i}`} x1="0" y1={i * 50} x2="720" y2={i * 50} stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />
            ))}

            {/* ── Node 1: User ── */}
            <rect x="20" y="80" width="120" height="100" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <rect x="20" y="80" width="120" height="28" rx="12" fill="#1e293b" />
            <text x="80" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">End User</text>
            <text x="80" y="125" textAnchor="middle" fill="#64748b" fontSize="9">
              {primary?.id === "AGENT_BUILDER" ? "M365 Copilot" : primary?.id === "FABRIC_AGENT" ? "Power BI" : "Teams / Web"}
            </text>
            <text x="80" y="142" textAnchor="middle" fill="#475569" fontSize="8">13-Question Wizard</text>
            <text x="80" y="168" textAnchor="middle" fontSize="22">{"\uD83D\uDC64"}</text>

            {/* Arrow 1 → */}
            <line x1="140" y1="130" x2="200" y2="130" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <text x="170" y="122" textAnchor="middle" fill="#475569" fontSize="7">answers</text>

            {/* ── Node 2: Scoring Engine ── */}
            <rect x="200" y="65" width="150" height="130" rx="12" fill="#0f172a" stroke={meta.accent} strokeWidth="2" filter="url(#glow)" />
            <rect x="200" y="65" width="150" height="28" rx="12" fill={meta.bg} />
            <text x="275" y="84" textAnchor="middle" fill={meta.accent} fontSize="11" fontWeight="700">Scoring Engine</text>
            <text x="275" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">WEIGHT_MATRIX</text>
            <text x="275" y="126" textAnchor="middle" fill="#64748b" fontSize="8">Hard Rules + Confidence</text>
            <text x="275" y="142" textAnchor="middle" fill="#64748b" fontSize="8">RAG Augmentation</text>
            <text x="275" y="175" textAnchor="middle" fontSize="18">{meta.icon}</text>

            {/* Arrow 2 → */}
            <line x1="350" y1="130" x2="410" y2="130" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <text x="380" y="122" textAnchor="middle" fill="#475569" fontSize="7">ranked</text>

            {/* ── Node 3: Knowledge Base ── */}
            <rect x="410" y="65" width="130" height="130" rx="12" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="410" y="65" width="130" height="28" rx="12" fill="#1e293b" />
            <text x="475" y="84" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Knowledge</text>
            <text x="475" y="110" textAnchor="middle" fill="#64748b" fontSize="9">ChromaDB Vectors</text>
            <text x="475" y="126" textAnchor="middle" fill="#64748b" fontSize="8">MS Learn Docs</text>
            <text x="475" y="142" textAnchor="middle" fill="#475569" fontSize="8">Nightly Sync 06:00 UTC</text>
            <text x="475" y="175" textAnchor="middle" fontSize="18">{"\uD83D\uDDC3\uFE0F"}</text>

            {/* Arrow 3 → */}
            <line x1="540" y1="130" x2="590" y2="130" stroke="url(#arrowGrad)" strokeWidth="2" markerEnd="url(#arrowHead)" />
            <text x="565" y="122" textAnchor="middle" fill="#475569" fontSize="7">spec</text>

            {/* ── Node 4: Output ── */}
            <rect x="590" y="80" width="110" height="100" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <rect x="590" y="80" width="110" height="28" rx="12" fill="#1e293b" />
            <text x="645" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Output</text>
            <text x="645" y="125" textAnchor="middle" fill="#64748b" fontSize="9">Functional Spec</text>
            <text x="645" y="141" textAnchor="middle" fill="#64748b" fontSize="8">Architecture Diagram</text>
            <text x="645" y="168" textAnchor="middle" fontSize="18">{"\uD83D\uDCC4"}</text>

            {/* ── Foundry Agent (below, dashed connection) ── */}
            <line x1="275" y1="195" x2="275" y2="225" stroke={meta.accent} strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrowHead)" />
            <rect x="195" y="225" width="160" height="30" rx="8" fill={meta.bg} stroke={meta.accent} strokeWidth="1" strokeDasharray="4 3" />
            <text x="275" y="244" textAnchor="middle" fill={meta.accent} fontSize="9" fontWeight="600">
              AI Foundry Agent (greg v1)
            </text>
            <text x="275" y="218" textAnchor="middle" fill="#475569" fontSize="7">confidence &lt; 0.70</text>

            {/* Bidirectional arrow between KB and Scoring */}
            <line x1="410" y1="155" x2="350" y2="155" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" markerEnd="url(#arrowHead)" />
            <text x="380" y="165" textAnchor="middle" fill="#475569" fontSize="7">citations</text>
          </svg>

          {/* Azure services pills */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Key Azure Services
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meta.services.map((svc) => (
                <span
                  key={svc}
                  className={`text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${meta.text} font-medium`}
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Signal breakdown cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Decision Signals
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ranked.slice(0, 4).map((arch, idx) => {
            const archMeta = ARCH_META[arch.id] || ARCH_META.FOUNDRY_AGENT;
            const isPrimary = idx === 0;
            return (
              <div
                key={arch.id}
                className={`rounded-lg p-4 transition-all ${isPrimary ? `bg-gradient-to-br ${archMeta.gradient} border ${archMeta.border} shadow-lg ${archMeta.glow}` : "bg-slate-800/50 border border-slate-700/50"}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{archMeta.icon}</span>
                  <span className={`text-sm font-bold ${isPrimary ? archMeta.text : "text-slate-400"}`}>
                    {arch.label}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Score</span>
                    <span className={isPrimary ? "text-white font-bold" : "text-slate-400"}>
                      {arch.score}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Confidence</span>
                    <span className={isPrimary ? "text-white font-bold" : "text-slate-400"}>
                      {Math.round(arch.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Rank</span>
                    <span className={isPrimary ? "text-white font-bold" : "text-slate-400"}>
                      #{idx + 1} of {ranked.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
