import { useState, useEffect } from "react";
import { Search, Filter, ChevronRight, AlertTriangle, Loader2, X } from "lucide-react";
import FunctionalSpec from "./FunctionalSpec";
import ArchDiagram from "./ArchDiagram";
import DevinSpecTab from "./DevinSpecTab";
import { API_URL, AUTH_HEADERS } from "../api/client";
import type { ArchResult, SpecOutput } from "../api/client";

interface HealthcareCase {
  id: string;
  useCaseName: string;
  primaryGoal: string;
  category: string;
  answers: Record<string, string | string[]>;
  ranked: ArchResult[];
  spec: SpecOutput;
  primary_arch: string;
  primary_label: string;
  confidence: number;
  score: number;
}

const ARCH_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  COPILOT_STUDIO: { bg: "bg-blue-900/30", text: "text-blue-300", badge: "bg-blue-600" },
  AGENT_BUILDER: { bg: "bg-emerald-900/30", text: "text-emerald-300", badge: "bg-emerald-600" },
  FABRIC_AGENT: { bg: "bg-purple-900/30", text: "text-purple-300", badge: "bg-purple-600" },
  FOUNDRY_AGENT: { bg: "bg-amber-900/30", text: "text-amber-300", badge: "bg-amber-600" },
};

const CATEGORIES = [
  "All",
  "Clinical Operations",
  "Revenue Cycle",
  "Patient Engagement",
  "Compliance & Quality",
  "Operations & Workforce",
];

type DetailTab = "spec" | "diagram" | "implementation";

export default function Dashboard() {
  const [cases, setCases] = useState<HealthcareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedArch, setSelectedArch] = useState("All");
  const [selectedCase, setSelectedCase] = useState<HealthcareCase | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("spec");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      // Try static pre-generated file first (works without backend)
      const staticResp = await fetch("/healthcare-cases.json");
      if (staticResp.ok) {
        const data = await staticResp.json();
        setCases(data.cases);
        setLoading(false);
        return;
      }
    } catch {
      // Static file not available, fall through to API
    }
    try {
      const resp = await fetch(`${API_URL}/api/healthcare-cases`, { headers: AUTH_HEADERS });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setCases(data.cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load healthcare cases");
    } finally {
      setLoading(false);
    }
  };

  const filtered = cases.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.useCaseName.toLowerCase().includes(search.toLowerCase()) ||
      c.primaryGoal.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    const matchesArch = selectedArch === "All" || c.primary_arch === selectedArch;
    return matchesSearch && matchesCategory && matchesArch;
  });

  // Stats
  const archCounts: Record<string, number> = {};
  for (const c of cases) {
    archCounts[c.primary_arch] = (archCounts[c.primary_arch] || 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading healthcare use cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium mb-2">Failed to load cases</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedCase) {
    const colors = ARCH_COLORS[selectedCase.primary_arch] || ARCH_COLORS.FOUNDRY_AGENT;
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedCase(null)}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          &larr; Back to Dashboard
        </button>

        {/* Case header */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{selectedCase.category}</span>
              <h2 className="text-2xl font-bold text-white mt-1">{selectedCase.useCaseName}</h2>
              <p className="text-slate-400 mt-2">{selectedCase.primaryGoal}</p>
            </div>
            <div className="ml-6 text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.badge} text-white`}>
                {selectedCase.primary_label}
              </span>
              <div className="mt-2 text-sm text-slate-400">
                Score: {selectedCase.score} | Confidence: {Math.round(selectedCase.confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Input signals */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(selectedCase.answers).map(([key, val]) => {
              if (key === "useCaseName" || key === "primaryGoal") return null;
              const display = Array.isArray(val) ? val.join(", ") || "none" : val;
              return (
                <div key={key} className="bg-slate-700/50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                  <div className="text-sm text-slate-300 mt-0.5">{display}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low confidence warning */}
        {selectedCase.confidence < 0.5 && (
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-orange-300 font-medium">Low confidence recommendation</p>
              <p className="text-orange-400/80 text-sm mt-1">
                Consider reviewing with your architect. Confidence: {Math.round(selectedCase.confidence * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {([
            { key: "spec" as DetailTab, label: "Functional Spec" },
            { key: "diagram" as DetailTab, label: "Architecture Diagram" },
            { key: "implementation" as DetailTab, label: "Implementation Spec" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDetailTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                detailTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-slate-800/50 rounded-xl p-6">
          {detailTab === "spec" && <FunctionalSpec spec={selectedCase.spec} />}
          {detailTab === "diagram" && <ArchDiagram ranked={selectedCase.ranked} />}
          {detailTab === "implementation" && <DevinSpecTab spec={selectedCase.spec} />}
        </div>
      </div>
    );
  }

  // Main dashboard list view
  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: "COPILOT_STUDIO", label: "Copilot Studio" },
          { id: "AGENT_BUILDER", label: "Agent Builder" },
          { id: "FABRIC_AGENT", label: "Fabric Agent" },
          { id: "FOUNDRY_AGENT", label: "Foundry Agent" },
        ].map((arch) => {
          const colors = ARCH_COLORS[arch.id];
          const count = archCounts[arch.id] || 0;
          return (
            <button
              key={arch.id}
              onClick={() => setSelectedArch(selectedArch === arch.id ? "All" : arch.id)}
              className={`rounded-xl p-4 text-left transition-all border ${
                selectedArch === arch.id
                  ? `${colors.bg} border-slate-500`
                  : "bg-slate-800 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="text-3xl font-bold text-white">{count}</div>
              <div className={`text-sm ${colors.text}`}>{arch.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search use cases..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-500">
        Showing {filtered.length} of {cases.length} healthcare use cases
      </div>

      {/* Case list */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const colors = ARCH_COLORS[c.primary_arch] || ARCH_COLORS.FOUNDRY_AGENT;
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedCase(c); setDetailTab("spec"); }}
              className="w-full text-left bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {c.id}
                    </span>
                    <span className="text-xs text-slate-600">|</span>
                    <span className="text-xs text-slate-500">{c.category}</span>
                  </div>
                  <h3 className="text-white font-medium mt-1 truncate">{c.useCaseName}</h3>
                  <p className="text-slate-400 text-sm mt-0.5 truncate">{c.primaryGoal}</p>
                </div>
                <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-500">Score: {c.score}</div>
                    <div className="text-xs text-slate-500">{Math.round(c.confidence * 100)}%</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge} text-white whitespace-nowrap`}>
                    {c.primary_label}
                  </span>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No use cases match your filters.</p>
          <button
            onClick={() => { setSearch(""); setSelectedCategory("All"); setSelectedArch("All"); }}
            className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
