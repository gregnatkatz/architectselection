import type { ArchResult } from "../api/client";

interface ArchDiagramProps {
  ranked: ArchResult[];
  inputs?: Record<string, string | string[]>;
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
    services: ["Fabric Lakehouse", "OneLake", "Data Pipeline", "Power BI"],
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

/* ── WHY explanations per architecture ── */
const WHY_BEYOND_SIMPLE: Record<string, string> = {
  COPILOT_STUDIO: "Copilot Studio is used because this is a straightforward low-code pattern deployable directly to Teams or Web without pro-code development.",
  AGENT_BUILDER: "Agent Builder is used because this use case is grounded in SharePoint/M365 enterprise knowledge and extends M365 Copilot natively.",
  FABRIC_AGENT: "Fabric Data Agent is required because this use case involves large-scale structured data analytics via OneLake/Fabric Lakehouse. Copilot Studio and Agent Builder lack native Fabric data pipeline integration.",
  FOUNDRY_AGENT: "Azure AI Foundry is required because this use case needs one or more of: PHI/HIPAA compliance, custom model hosting, autonomous agent behavior, multi-agent orchestration, or external API integration with compliance controls. These capabilities are not available in Copilot Studio, Agent Builder, or Fabric Agent.",
};

/* ── Architecture-specific SVG diagrams ── */
function CopilotStudioDiagram({ accent, bg }: { accent: string; bg: string }) {
  return (
    <svg viewBox="0 0 720 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.8" />
        </linearGradient>
        <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={accent} opacity="0.8" />
        </marker>
        <filter id="gl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* Grid */}
      {Array.from({ length: 15 }).map((_, i) => <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="220" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />)}

      {/* User */}
      <rect x="10" y="60" width="110" height="100" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="10" y="60" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="65" y="77" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">End User</text>
      <text x="65" y="100" textAnchor="middle" fill="#64748b" fontSize="8">Teams / Web</text>
      <text x="65" y="115" textAnchor="middle" fill="#475569" fontSize="7">13-Question Wizard</text>
      <text x="65" y="145" textAnchor="middle" fontSize="20">{"\uD83D\uDC64"}</text>

      {/* Arrow */}
      <line x1="120" y1="110" x2="170" y2="110" stroke="url(#ag)" strokeWidth="2" markerEnd="url(#ah)" />

      {/* Copilot Studio */}
      <rect x="170" y="45" width="150" height="130" rx="10" fill="#0f172a" stroke={accent} strokeWidth="2" filter="url(#gl)" />
      <rect x="170" y="45" width="150" height="24" rx="10" fill={bg} />
      <text x="245" y="62" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Copilot Studio</text>
      <text x="245" y="85" textAnchor="middle" fill="#94a3b8" fontSize="8">Power Virtual Agents</text>
      <text x="245" y="100" textAnchor="middle" fill="#64748b" fontSize="7">Low-Code Flow Designer</text>
      <text x="245" y="115" textAnchor="middle" fill="#64748b" fontSize="7">Built-in Connectors</text>
      <text x="245" y="130" textAnchor="middle" fill="#64748b" fontSize="7">Power Automate Flows</text>
      <text x="245" y="160" textAnchor="middle" fontSize="16">{"\u26A1"}</text>

      {/* Arrow */}
      <line x1="320" y1="110" x2="370" y2="110" stroke="url(#ag)" strokeWidth="2" markerEnd="url(#ah)" />

      {/* Data */}
      <rect x="370" y="55" width="120" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="370" y="55" width="120" height="24" rx="10" fill="#1e293b" />
      <text x="430" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Data Sources</text>
      <text x="430" y="95" textAnchor="middle" fill="#64748b" fontSize="8">SharePoint</text>
      <text x="430" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Dataverse</text>
      <text x="430" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Custom Connectors</text>
      <text x="430" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCC1"}</text>

      {/* Arrow */}
      <line x1="490" y1="110" x2="540" y2="110" stroke="url(#ag)" strokeWidth="2" markerEnd="url(#ah)" />

      {/* Teams */}
      <rect x="540" y="55" width="110" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="540" y="55" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="595" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Deployment</text>
      <text x="595" y="95" textAnchor="middle" fill="#64748b" fontSize="8">Teams Channel</text>
      <text x="595" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Web Widget</text>
      <text x="595" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Power Automate</text>
      <text x="595" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCE4"}</text>

      {/* Validator Agent */}
      <rect x="170" y="185" width="140" height="25" rx="6" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <text x="240" y="202" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">Validator Agent</text>
      <line x1="245" y1="175" x2="245" y2="185" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />

      {/* Requirements Test Agent */}
      <rect x="370" y="185" width="140" height="25" rx="6" fill="#1a1a2e" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
      <text x="440" y="202" textAnchor="middle" fill="#818cf8" fontSize="8" fontWeight="600">Requirements Test Agent</text>
      <line x1="430" y1="165" x2="430" y2="185" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

function AgentBuilderDiagram({ accent, bg }: { accent: string; bg: string }) {
  return (
    <svg viewBox="0 0 720 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.8" />
        </linearGradient>
        <marker id="ah2" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={accent} opacity="0.8" />
        </marker>
        <filter id="gl2"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {Array.from({ length: 15 }).map((_, i) => <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="220" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />)}

      {/* User */}
      <rect x="10" y="60" width="110" height="100" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="10" y="60" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="65" y="77" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">End User</text>
      <text x="65" y="100" textAnchor="middle" fill="#64748b" fontSize="8">M365 Copilot</text>
      <text x="65" y="115" textAnchor="middle" fill="#475569" fontSize="7">13-Question Wizard</text>
      <text x="65" y="145" textAnchor="middle" fontSize="20">{"\uD83D\uDC64"}</text>

      <line x1="120" y1="110" x2="170" y2="110" stroke="url(#ag2)" strokeWidth="2" markerEnd="url(#ah2)" />

      {/* Agent Builder */}
      <rect x="170" y="45" width="150" height="130" rx="10" fill="#0f172a" stroke={accent} strokeWidth="2" filter="url(#gl2)" />
      <rect x="170" y="45" width="150" height="24" rx="10" fill={bg} />
      <text x="245" y="62" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Agent Builder</text>
      <text x="245" y="85" textAnchor="middle" fill="#94a3b8" fontSize="8">Declarative Framework</text>
      <text x="245" y="100" textAnchor="middle" fill="#64748b" fontSize="7">SharePoint Grounding</text>
      <text x="245" y="115" textAnchor="middle" fill="#64748b" fontSize="7">Plugin Actions</text>
      <text x="245" y="130" textAnchor="middle" fill="#64748b" fontSize="7">Semantic Index</text>
      <text x="245" y="160" textAnchor="middle" fontSize="16">{"\uD83E\uDDE9"}</text>

      <line x1="320" y1="110" x2="370" y2="110" stroke="url(#ag2)" strokeWidth="2" markerEnd="url(#ah2)" />

      {/* Graph/SharePoint */}
      <rect x="370" y="55" width="120" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="370" y="55" width="120" height="24" rx="10" fill="#1e293b" />
      <text x="430" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Enterprise Data</text>
      <text x="430" y="95" textAnchor="middle" fill="#64748b" fontSize="8">SharePoint Sites</text>
      <text x="430" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Microsoft Graph API</text>
      <text x="430" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Semantic Index</text>
      <text x="430" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCC2"}</text>

      <line x1="490" y1="110" x2="540" y2="110" stroke="url(#ag2)" strokeWidth="2" markerEnd="url(#ah2)" />

      {/* M365 Copilot Output */}
      <rect x="540" y="55" width="120" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="540" y="55" width="120" height="24" rx="10" fill="#1e293b" />
      <text x="600" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">M365 Copilot</text>
      <text x="600" y="95" textAnchor="middle" fill="#64748b" fontSize="8">Chat Experience</text>
      <text x="600" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Adaptive Cards</text>
      <text x="600" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Citations</text>
      <text x="600" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCAC"}</text>

      <rect x="170" y="185" width="140" height="25" rx="6" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <text x="240" y="202" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">Validator Agent</text>
      <line x1="245" y1="175" x2="245" y2="185" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="370" y="185" width="140" height="25" rx="6" fill="#1a1a2e" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
      <text x="440" y="202" textAnchor="middle" fill="#818cf8" fontSize="8" fontWeight="600">Requirements Test Agent</text>
      <line x1="430" y1="165" x2="430" y2="185" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

function FabricAgentDiagram({ accent, bg }: { accent: string; bg: string }) {
  return (
    <svg viewBox="0 0 720 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.8" />
        </linearGradient>
        <marker id="ah3" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={accent} opacity="0.8" />
        </marker>
        <filter id="gl3"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {Array.from({ length: 15 }).map((_, i) => <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="220" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />)}

      {/* User */}
      <rect x="10" y="60" width="110" height="100" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="10" y="60" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="65" y="77" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">End User</text>
      <text x="65" y="100" textAnchor="middle" fill="#64748b" fontSize="8">Web / Power BI</text>
      <text x="65" y="115" textAnchor="middle" fill="#475569" fontSize="7">13-Question Wizard</text>
      <text x="65" y="145" textAnchor="middle" fontSize="20">{"\uD83D\uDC64"}</text>

      <line x1="120" y1="110" x2="170" y2="110" stroke="url(#ag3)" strokeWidth="2" markerEnd="url(#ah3)" />

      {/* Fabric Data Agent */}
      <rect x="170" y="45" width="150" height="130" rx="10" fill="#0f172a" stroke={accent} strokeWidth="2" filter="url(#gl3)" />
      <rect x="170" y="45" width="150" height="24" rx="10" fill={bg} />
      <text x="245" y="62" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Fabric Data Agent</text>
      <text x="245" y="85" textAnchor="middle" fill="#94a3b8" fontSize="8">Copilot + Fabric</text>
      <text x="245" y="100" textAnchor="middle" fill="#64748b" fontSize="7">Data Pipeline Engine</text>
      <text x="245" y="115" textAnchor="middle" fill="#64748b" fontSize="7">Natural Language to SQL</text>
      <text x="245" y="130" textAnchor="middle" fill="#64748b" fontSize="7">OneLake Integration</text>
      <text x="245" y="160" textAnchor="middle" fontSize="16">{"\uD83D\uDCCA"}</text>

      <line x1="320" y1="110" x2="370" y2="110" stroke="url(#ag3)" strokeWidth="2" markerEnd="url(#ah3)" />

      {/* OneLake / Fabric Lakehouse */}
      <rect x="370" y="45" width="130" height="130" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="370" y="45" width="130" height="24" rx="10" fill="#1e293b" />
      <text x="435" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Fabric Lakehouse</text>
      <text x="435" y="85" textAnchor="middle" fill="#64748b" fontSize="8">OneLake Storage</text>
      <text x="435" y="100" textAnchor="middle" fill="#64748b" fontSize="7">Data Pipelines</text>
      <text x="435" y="115" textAnchor="middle" fill="#64748b" fontSize="7">Snowflake Mirror</text>
      <text x="435" y="130" textAnchor="middle" fill="#64748b" fontSize="7">SQL Analytics Endpoint</text>
      <text x="435" y="160" textAnchor="middle" fontSize="16">{"\uD83D\uDDC4\uFE0F"}</text>

      <line x1="500" y1="110" x2="550" y2="110" stroke="url(#ag3)" strokeWidth="2" markerEnd="url(#ah3)" />

      {/* Output */}
      <rect x="550" y="55" width="110" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="550" y="55" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="605" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Analytics Output</text>
      <text x="605" y="95" textAnchor="middle" fill="#64748b" fontSize="8">Power BI Reports</text>
      <text x="605" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Dashboard Views</text>
      <text x="605" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Data Insights</text>
      <text x="605" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCC8"}</text>

      <rect x="170" y="185" width="140" height="25" rx="6" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <text x="240" y="202" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">Validator Agent</text>
      <line x1="245" y1="175" x2="245" y2="185" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="370" y="185" width="140" height="25" rx="6" fill="#1a1a2e" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
      <text x="440" y="202" textAnchor="middle" fill="#818cf8" fontSize="8" fontWeight="600">Requirements Test Agent</text>
      <line x1="435" y1="175" x2="435" y2="185" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

function FoundryAgentDiagram({ accent, bg }: { accent: string; bg: string }) {
  return (
    <svg viewBox="0 0 720 260" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag4" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.8" />
        </linearGradient>
        <marker id="ah4" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={accent} opacity="0.8" />
        </marker>
        <filter id="gl4"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {Array.from({ length: 15 }).map((_, i) => <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="260" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 4" />)}

      {/* User */}
      <rect x="10" y="60" width="110" height="100" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="10" y="60" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="65" y="77" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">End User</text>
      <text x="65" y="100" textAnchor="middle" fill="#64748b" fontSize="8">Web / API / Teams</text>
      <text x="65" y="115" textAnchor="middle" fill="#475569" fontSize="7">13-Question Wizard</text>
      <text x="65" y="145" textAnchor="middle" fontSize="20">{"\uD83D\uDC64"}</text>

      <line x1="120" y1="110" x2="170" y2="110" stroke="url(#ag4)" strokeWidth="2" markerEnd="url(#ah4)" />

      {/* Foundry Agent */}
      <rect x="170" y="40" width="160" height="140" rx="10" fill="#0f172a" stroke={accent} strokeWidth="2" filter="url(#gl4)" />
      <rect x="170" y="40" width="160" height="24" rx="10" fill={bg} />
      <text x="250" y="57" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Azure AI Foundry</text>
      <text x="250" y="80" textAnchor="middle" fill="#94a3b8" fontSize="8">Azure AI SDK</text>
      <text x="250" y="95" textAnchor="middle" fill="#64748b" fontSize="7">Managed Identity + RBAC</text>
      <text x="250" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Multi-Agent Orchestration</text>
      <text x="250" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Compliance Controls</text>
      <text x="250" y="140" textAnchor="middle" fill="#64748b" fontSize="7">Audit Logging</text>
      <text x="250" y="165" textAnchor="middle" fontSize="16">{"\uD83E\uDD16"}</text>

      <line x1="330" y1="110" x2="380" y2="110" stroke="url(#ag4)" strokeWidth="2" markerEnd="url(#ah4)" />

      {/* Knowledge */}
      <rect x="380" y="45" width="130" height="130" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="380" y="45" width="130" height="24" rx="10" fill="#1e293b" />
      <text x="445" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Knowledge</text>
      <text x="445" y="85" textAnchor="middle" fill="#64748b" fontSize="8">Azure AI Search</text>
      <text x="445" y="100" textAnchor="middle" fill="#64748b" fontSize="7">MS Learn Docs</text>
      <text x="445" y="115" textAnchor="middle" fill="#64748b" fontSize="7">Nightly Sync 06:00 UTC</text>
      <text x="445" y="130" textAnchor="middle" fill="#64748b" fontSize="7">Vector Embeddings</text>
      <text x="445" y="160" textAnchor="middle" fontSize="16">{"\uD83D\uDD0D"}</text>

      {/* Bidirectional */}
      <line x1="380" y1="140" x2="330" y2="140" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" markerEnd="url(#ah4)" />
      <text x="355" y="152" textAnchor="middle" fill="#475569" fontSize="7">citations</text>

      <line x1="510" y1="110" x2="560" y2="110" stroke="url(#ag4)" strokeWidth="2" markerEnd="url(#ah4)" />

      {/* Output */}
      <rect x="560" y="55" width="110" height="110" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      <rect x="560" y="55" width="110" height="24" rx="10" fill="#1e293b" />
      <text x="615" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">Output</text>
      <text x="615" y="95" textAnchor="middle" fill="#64748b" fontSize="8">Functional Spec</text>
      <text x="615" y="110" textAnchor="middle" fill="#64748b" fontSize="7">Architecture Diagram</text>
      <text x="615" y="125" textAnchor="middle" fill="#64748b" fontSize="7">Implementation Plan</text>
      <text x="615" y="150" textAnchor="middle" fontSize="16">{"\uD83D\uDCC4"}</text>

      {/* Foundry sub-agent */}
      <line x1="250" y1="180" x2="250" y2="210" stroke={accent} strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#ah4)" />
      <rect x="175" y="210" width="150" height="25" rx="6" fill={bg} stroke={accent} strokeWidth="1" strokeDasharray="4 3" />
      <text x="250" y="227" textAnchor="middle" fill={accent} fontSize="8" fontWeight="600">AI Foundry Agent (greg v1)</text>
      <text x="250" y="203" textAnchor="middle" fill="#475569" fontSize="7">confidence &lt; 0.70</text>

      {/* Validator + Req Test below knowledge */}
      <rect x="380" y="185" width="130" height="25" rx="6" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
      <text x="445" y="202" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">Validator Agent</text>
      <line x1="445" y1="175" x2="445" y2="185" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />

      <rect x="380" y="218" width="130" height="25" rx="6" fill="#1a1a2e" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
      <text x="445" y="235" textAnchor="middle" fill="#818cf8" fontSize="8" fontWeight="600">Requirements Test</text>
    </svg>
  );
}

function getArchDiagram(archId: string, accent: string, bg: string) {
  switch (archId) {
    case "COPILOT_STUDIO": return <CopilotStudioDiagram accent={accent} bg={bg} />;
    case "AGENT_BUILDER": return <AgentBuilderDiagram accent={accent} bg={bg} />;
    case "FABRIC_AGENT": return <FabricAgentDiagram accent={accent} bg={bg} />;
    case "FOUNDRY_AGENT": return <FoundryAgentDiagram accent={accent} bg={bg} />;
    default: return <FoundryAgentDiagram accent={accent} bg={bg} />;
  }
}

export default function ArchDiagram({ ranked, inputs }: ArchDiagramProps) {
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

      {/* Architecture-specific flow diagram */}
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

          {getArchDiagram(primary?.id || "", meta.accent, meta.bg)}

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

      {/* Why this architecture (not simpler) */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          Why {primary?.label || "this architecture"}?
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          {WHY_BEYOND_SIMPLE[primary?.id || "FOUNDRY_AGENT"]}
        </p>
        {primary?.id === "FOUNDRY_AGENT" && inputs && (inputs.hasPhi === "yes") && (
          <p className="text-sm text-orange-300 mt-2">
            Note: PHI/HIPAA data detected. Azure AI Foundry is mandatory regardless of other signals.
          </p>
        )}
        {primary?.id === "FABRIC_AGENT" && (
          <p className="text-sm text-purple-300 mt-2">
            This is a Fabric Data Agent use case — distinct from Azure AI Foundry. Uses native Fabric/OneLake data pipelines for analytics without requiring Foundry compliance overhead.
          </p>
        )}
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
