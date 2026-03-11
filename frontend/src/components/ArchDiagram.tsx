import type { ArchResult } from "../api/client";

interface ArchDiagramProps {
  ranked: ArchResult[];
}

const ARCH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  COPILOT_STUDIO: { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd" },
  AGENT_BUILDER: { bg: "#1a3c34", border: "#10b981", text: "#6ee7b7" },
  FABRIC_AGENT: { bg: "#3b1f4a", border: "#a855f7", text: "#c4b5fd" },
  FOUNDRY_AGENT: { bg: "#3b2a1a", border: "#f59e0b", text: "#fcd34d" },
};

export default function ArchDiagram({ ranked }: ArchDiagramProps) {
  const maxScore = Math.max(...ranked.map((r) => r.score), 1);
  const primary = ranked[0];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Architecture Comparison</h3>

      {/* Bar chart */}
      <div className="space-y-4">
        {ranked.map((arch) => {
          const colors = ARCH_COLORS[arch.id] || { bg: "#1e293b", border: "#475569", text: "#94a3b8" };
          const barWidth = Math.max((arch.score / maxScore) * 100, 5);
          const isPrimary = arch.id === primary?.id;

          return (
            <div key={arch.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={`font-medium ${isPrimary ? "text-white" : "text-slate-400"}`}>
                  {isPrimary && <span className="mr-1">★</span>}
                  {arch.label}
                </span>
                <span className="text-slate-500">
                  {arch.score} pts ({Math.round(arch.confidence * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center px-3 text-xs font-medium transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {arch.score > 0 && arch.id.replace("_", " ")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture flow diagram */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Recommended Architecture Flow
        </h4>
        <div className="bg-slate-800 rounded-lg p-6">
          <svg viewBox="0 0 600 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
            {/* User */}
            <rect x="10" y="70" width="100" height="60" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="60" y="95" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">User</text>
            <text x="60" y="112" textAnchor="middle" fill="#64748b" fontSize="9">
              {primary?.id === "AGENT_BUILDER" ? "M365 Copilot" : "Teams / Web"}
            </text>

            {/* Arrow 1 */}
            <line x1="110" y1="100" x2="160" y2="100" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Platform */}
            {(() => {
              const colors = ARCH_COLORS[primary?.id || ""] || { bg: "#1e293b", border: "#475569", text: "#94a3b8" };
              return (
                <>
                  <rect x="160" y="55" width="160" height="90" rx="8" fill={colors.bg} stroke={colors.border} strokeWidth="2" />
                  <text x="240" y="85" textAnchor="middle" fill={colors.text} fontSize="11" fontWeight="bold">
                    {primary?.label || ""}
                  </text>
                  <text x="240" y="105" textAnchor="middle" fill="#94a3b8" fontSize="9">Scoring Engine</text>
                  <text x="240" y="120" textAnchor="middle" fill="#64748b" fontSize="9">
                    Confidence: {primary ? Math.round(primary.confidence * 100) : 0}%
                  </text>
                </>
              );
            })()}

            {/* Arrow 2 */}
            <line x1="320" y1="100" x2="370" y2="100" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Data Layer */}
            <rect x="370" y="55" width="120" height="90" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="430" y="85" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">Data Sources</text>
            <text x="430" y="105" textAnchor="middle" fill="#64748b" fontSize="9">SQLite + ChromaDB</text>
            <text x="430" y="120" textAnchor="middle" fill="#64748b" fontSize="9">Knowledge Base</text>

            {/* Arrow 3 */}
            <line x1="490" y1="100" x2="520" y2="100" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Output */}
            <rect x="520" y="70" width="70" height="60" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="555" y="95" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">Spec</text>
            <text x="555" y="112" textAnchor="middle" fill="#64748b" fontSize="9">Output</text>

            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#475569" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
