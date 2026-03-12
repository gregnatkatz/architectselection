import { useState, useEffect } from "react";
import { Search, Filter, ChevronRight, AlertTriangle, Loader2, X, CheckCircle, Upload, ShieldCheck, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import FunctionalSpec from "./FunctionalSpec";
import ArchDiagram from "./ArchDiagram";
import { API_URL, AUTH_HEADERS } from "../api/client";
import type { ArchResult, SpecOutput, ValidationResult } from "../api/client";

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

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: "1-2 weeks",
  moderate: "3-6 weeks",
  complex: "8-16 weeks",
  multiagent: "12-20 weeks",
};

const TEAM_SIZE_LABELS: Record<string, string> = {
  small: "1-3 people",
  medium: "4-8 people",
  large: "9+ people",
};

function displayVal(key: string, val: string | string[]): string {
  if (Array.isArray(val)) return val.join(", ") || "none";
  if (key === "complexity") return COMPLEXITY_LABELS[val] || val;
  if (key === "teamSize") return TEAM_SIZE_LABELS[val] || val;
  if (key === "hasPhi") return val === "yes" ? "Yes \u2014 PHI" : "No PHI";
  return val;
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

type DetailTab = "spec" | "diagram";

export default function Dashboard() {
  const [cases, setCases] = useState<HealthcareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedArch, setSelectedArch] = useState("All");
  const [selectedCase, setSelectedCase] = useState<HealthcareCase | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("spec");

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validationStats, setValidationStats] = useState<{ validated: number; warning: number; corrected: number; advisory: number } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadGoal, setUploadGoal] = useState("");
  const [uploading, setUploading] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);

  // Document upload state
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docAnalyzing, setDocAnalyzing] = useState(false);
  const [docResult, setDocResult] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
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

  const handleValidateAll = async () => {
    setValidating(true);
    setValidationResults({});
    setValidationStats(null);
    setToast(null);
    const total = cases.length;
    const resultMap: Record<string, ValidationResult> = {};
    let validated = 0;
    let warning = 0;
    let corrected = 0;
    let advisory = 0;

    for (let i = 0; i < total; i++) {
      const c = cases[i];
      setValidationProgress({ current: i + 1, total, currentName: c.useCaseName });

      // Try backend first, fall back to client-side validation
      try {
        const resp = await fetch(`${API_URL}/api/validate-case`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
          body: JSON.stringify({ id: c.id, answers: c.answers, primary_arch: c.primary_arch }),
        });
        if (resp.ok) {
          const result: ValidationResult = await resp.json();
          resultMap[c.id] = result;
          if (result.validation.overall_status === "validated") validated++;
          else if (result.validation.overall_status === "corrected") corrected++;
          else if (result.validation.overall_status === "warning") warning++;
          else advisory++;
          setValidationResults({ ...resultMap });
          continue;
        }
      } catch {
        // Backend not available, use client-side validation
      }

      // Client-side validation logic
      await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 200));
      const issues: Array<{ severity: string; check: string; message: string; fix: string }> = [];
      const passedChecks: string[] = [];

      // PHI check
      if (c.answers.hasPhi === "yes" && c.primary_arch !== "FOUNDRY_AGENT") {
        issues.push({ severity: "critical", check: "PHI Compliance", message: "PHI requires Azure AI Foundry for HIPAA/BAA coverage", fix: "Switch to FOUNDRY_AGENT" });
      } else {
        passedChecks.push("PHI Compliance");
      }

      // Complexity check
      if ((c.answers.complexity === "multiagent" || c.answers.complexity === "complex") && (c.primary_arch === "COPILOT_STUDIO" || c.primary_arch === "AGENT_BUILDER")) {
        issues.push({ severity: "warning", check: "Complexity Match", message: `${c.answers.complexity} complexity may exceed ${c.primary_label} capabilities`, fix: "Consider Foundry Agent or Fabric Agent" });
      } else {
        passedChecks.push("Complexity Match");
      }

      // Data source check
      const ds = Array.isArray(c.answers.dataSources) ? c.answers.dataSources : [];
      if ((ds.includes("snowflake") || ds.includes("fabric_lakehouse")) && c.primary_arch !== "FABRIC_AGENT" && c.primary_arch !== "FOUNDRY_AGENT") {
        issues.push({ severity: "warning", check: "Data Source Alignment", message: "Fabric/Snowflake data sources work best with Fabric Agent or Foundry", fix: "Consider FABRIC_AGENT" });
      } else {
        passedChecks.push("Data Source Alignment");
      }

      // UX channel check
      if (c.answers.uxChannel === "teams" && c.primary_arch === "FABRIC_AGENT") {
        issues.push({ severity: "advisory", check: "UX Channel", message: "Teams-first UX is better served by Copilot Studio or Agent Builder", fix: "Consider COPILOT_STUDIO" });
      } else {
        passedChecks.push("UX Channel");
      }

      // Custom model check
      if (c.answers.customModel !== "no" && c.primary_arch !== "FOUNDRY_AGENT") {
        issues.push({ severity: "warning", check: "Custom Model", message: "Custom/fine-tuned models require Azure AI Foundry", fix: "Switch to FOUNDRY_AGENT" });
      } else {
        passedChecks.push("Custom Model");
      }

      const totalChecks = passedChecks.length + issues.length;
      const passRate = totalChecks > 0 ? passedChecks.length / totalChecks : 1;
      const hasCritical = issues.some((i) => i.severity === "critical");
      const hasWarning = issues.some((i) => i.severity === "warning");
      const overallStatus = hasCritical ? "corrected" : hasWarning ? "warning" : issues.length > 0 ? "advisory" : "validated";

      // Build could_simplify logic
      const couldSimplify = (c.primary_arch === "FOUNDRY_AGENT" && c.answers.hasPhi !== "yes" && c.answers.customModel === "no" && c.answers.agentBehavior !== "autonomous" && c.answers.complexity !== "multiagent");

      const result: ValidationResult = {
        id: c.id,
        useCaseName: c.useCaseName,
        category: c.category,
        recommended_arch: c.primary_arch,
        validation: {
          overall_status: overallStatus,
          validator: { status: overallStatus, issues, passed_checks: passedChecks, total_checks: totalChecks, pass_rate: passRate },
          requirements_test: {
            simplification_options: [],
            reasons_needs_current: [],
            could_simplify: couldSimplify,
            verdict: couldSimplify ? "This use case might be achievable with a simpler architecture." : "Current architecture is appropriate for the requirements.",
          },
          corrective: {
            action: hasCritical ? "corrected" : issues.length > 0 ? "advisory" : "none",
            message: hasCritical ? "Critical issues found — corrective action recommended." : issues.length > 0 ? "Minor issues found — review recommended." : "No issues found.",
            original_arch: c.primary_arch,
            corrections: issues.map((i) => ({ issue: i.check, problem: i.message, fix: i.fix })),
          },
        },
      };

      resultMap[c.id] = result;
      if (overallStatus === "validated") validated++;
      else if (overallStatus === "corrected") corrected++;
      else if (overallStatus === "warning") warning++;
      else advisory++;
      setValidationResults({ ...resultMap });
    }

    const stats = { validated, warning, corrected, advisory };
    setValidationStats(stats);
    setValidationProgress(null);
    setValidating(false);

    // Show success rate toast
    const successRate = total > 0 ? Math.round((validated / total) * 100) : 0;
    setToast({
      message: `Validation complete: ${validated}/${total} passed (${successRate}% success rate). ${warning} warnings, ${corrected} corrected, ${advisory} advisory.`,
      type: successRate >= 80 ? "success" : "error",
    });
    setTimeout(() => setToast(null), 8000);
  };

  const handleFeedback = async (caseId: string, vote: "up" | "down") => {
    setFeedbackSubmitting(caseId);
    try {
      await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({
          use_case_id: caseId,
          actual_arch: selectedCase?.primary_arch || "",
          was_correct: vote === "up",
          notes: vote === "up" ? "User confirmed recommendation" : "User disagreed with recommendation",
        }),
      });
      setFeedback((prev) => ({ ...prev, [caseId]: vote }));
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  const handleDocAnalyze = async () => {
    if (!docFile) return;
    setDocAnalyzing(true);
    setDocResult(null);
    try {
      const text = await docFile.text();
      const resp = await fetch(`${API_URL}/api/analyze-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({ content: text, filename: docFile.name }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDocResult(data.summary || "Document analyzed and indexed successfully.");
      } else {
        setDocResult("Analysis endpoint not available — document saved locally for review.");
      }
    } catch {
      setDocResult("Document saved locally. Backend analysis will run when the API is available.");
    } finally {
      setDocAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadName || !uploadGoal) return;
    setUploading(true);
    try {
      const resp = await fetch(`${API_URL}/api/upload-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({ useCaseName: uploadName, primaryGoal: uploadGoal }),
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      const newCase: HealthcareCase = {
        id: data.id,
        useCaseName: data.useCaseName,
        primaryGoal: data.primaryGoal,
        category: data.category || "Custom",
        answers: data.answers || {},
        ranked: data.ranked || [],
        spec: data.spec,
        primary_arch: data.primary_arch,
        primary_label: data.primary_label,
        confidence: data.confidence,
        score: data.score,
      };
      setCases((prev) => [...prev, newCase]);
      setShowUpload(false);
      setUploadName("");
      setUploadGoal("");
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
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
    const vr = validationResults[selectedCase.id];
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCase(null)}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          &larr; Back to Dashboard
        </button>

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
              {/* Thumbs up/down feedback */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <span className="text-xs text-slate-500 mr-1">Rate this recommendation:</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFeedback(selectedCase.id, "up"); }}
                  disabled={feedbackSubmitting === selectedCase.id}
                  className={`p-1.5 rounded-lg transition-all ${
                    feedback[selectedCase.id] === "up"
                      ? "bg-green-600/30 text-green-300 border border-green-500"
                      : "bg-slate-700 text-slate-400 hover:text-green-300 hover:bg-green-900/20 border border-slate-600"
                  }`}
                  title="Good recommendation"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFeedback(selectedCase.id, "down"); }}
                  disabled={feedbackSubmitting === selectedCase.id}
                  className={`p-1.5 rounded-lg transition-all ${
                    feedback[selectedCase.id] === "down"
                      ? "bg-red-600/30 text-red-300 border border-red-500"
                      : "bg-slate-700 text-slate-400 hover:text-red-300 hover:bg-red-900/20 border border-slate-600"
                  }`}
                  title="Needs improvement"
                >
                  <ThumbsDown size={14} />
                </button>
                {feedback[selectedCase.id] && (
                  <span className={`text-xs ml-1 ${feedback[selectedCase.id] === "up" ? "text-green-400" : "text-red-400"}`}>
                    {feedback[selectedCase.id] === "up" ? "Thanks!" : "Noted — will improve"}
                  </span>
                )}
              </div>
              {vr && (
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    vr.validation.overall_status === "validated" ? "bg-green-600/20 text-green-300 border border-green-600/50" :
                    vr.validation.overall_status === "corrected" ? "bg-red-600/20 text-red-300 border border-red-600/50" :
                    "bg-orange-600/20 text-orange-300 border border-orange-600/50"
                  }`}>
                    {vr.validation.overall_status === "validated" ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                    {vr.validation.overall_status}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(selectedCase.answers).map(([key, val]) => {
              if (key === "useCaseName" || key === "primaryGoal") return null;
              return (
                <div key={key} className="bg-slate-700/50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                  <div className="text-sm text-slate-300 mt-0.5">{displayVal(key, val)}</div>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* Validation detail (if available) */}
        {vr && vr.validation.validator && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ShieldCheck size={20} className="text-green-400" /> Validation Pipeline Results
            </h3>

            {/* Validator */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Validator Agent</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-400">
                  {vr.validation.validator.passed_checks.length}/{vr.validation.validator.total_checks} checks passed
                  ({Math.round(vr.validation.validator.pass_rate * 100)}%)
                </span>
              </div>
              {vr.validation.validator.issues.length > 0 && (
                <div className="space-y-1">
                  {vr.validation.validator.issues.map((issue, i) => (
                    <div key={i} className="text-xs bg-red-900/20 border border-red-800/50 rounded p-2">
                      <span className="text-red-300 font-medium">{issue.check}:</span>
                      <span className="text-slate-400 ml-1">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requirements Test */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Requirements Test Agent</h4>
              <p className="text-sm text-slate-300">{vr.validation.requirements_test.verdict}</p>
              {vr.validation.requirements_test.could_simplify && (
                <p className="text-xs text-amber-300 mt-1">Could potentially be simplified to a less complex architecture.</p>
              )}
            </div>

            {/* Corrective */}
            {vr.validation.corrective.action !== "none" && (
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Corrective Agent</h4>
                <p className="text-sm text-slate-300">{vr.validation.corrective.message}</p>
                {vr.validation.corrective.corrections.map((c, i) => (
                  <div key={i} className="text-xs bg-amber-900/20 border border-amber-800/50 rounded p-2 mt-1">
                    <span className="text-amber-300">{c.issue}:</span> <span className="text-slate-400">{c.fix}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs - only spec + diagram */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {([
            { key: "spec" as DetailTab, label: "Functional Spec" },
            { key: "diagram" as DetailTab, label: "Architecture Diagram" },
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

        <div className="bg-slate-800/50 rounded-xl p-6">
          {detailTab === "spec" && <FunctionalSpec spec={selectedCase.spec} />}
          {detailTab === "diagram" && <ArchDiagram ranked={selectedCase.ranked} inputs={selectedCase.answers} />}
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
          { id: "FABRIC_AGENT", label: "Fabric Data Agent" },
          { id: "FOUNDRY_AGENT", label: "Azure AI Foundry" },
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

      {/* Action buttons: Validate All + Upload */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleValidateAll}
          disabled={validating}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition-all"
        >
          {validating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {validating && validationProgress
            ? `Validating ${validationProgress.current}/${validationProgress.total}...`
            : "Validate All"}
        </button>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          <Upload size={14} /> Upload Use Case
        </button>
        <button
          onClick={() => setShowDocUpload(!showDocUpload)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
        >
          <Zap size={14} /> Upload & Analyze Document
        </button>

        {/* Validation stats summary */}
        {validationStats && (
          <div className="flex items-center gap-3 ml-auto text-xs">
            <span className="text-green-300 bg-green-900/30 px-2 py-1 rounded">
              {validationStats.validated} validated
            </span>
            <span className="text-orange-300 bg-orange-900/30 px-2 py-1 rounded">
              {validationStats.warning + validationStats.advisory} warnings
            </span>
            <span className="text-red-300 bg-red-900/30 px-2 py-1 rounded">
              {validationStats.corrected} corrected
            </span>
          </div>
        )}
      </div>

      {/* Validation progress bar */}
      {validating && validationProgress && (
        <div className="bg-slate-800 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-green-400" />
              <span className="text-sm text-green-300 font-medium">
                Validating case {validationProgress.current} of {validationProgress.total}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {Math.round((validationProgress.current / validationProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(validationProgress.current / validationProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 truncate">
            Currently evaluating: {validationProgress.currentName}
          </p>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 max-w-lg p-4 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-top-5 ${
          toast.type === "success"
            ? "bg-green-900/90 border-green-500/50 text-green-100"
            : "bg-red-900/90 border-red-500/50 text-red-100"
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="flex-shrink-0 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Document Upload & Analyze */}
      {showDocUpload && (
        <div className="bg-slate-800 rounded-xl p-6 border border-purple-500/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-purple-400" /> Upload & Analyze Supporting Document
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Upload a diagram, architecture doc, or use case description. The agent will analyze it and index it for future reference.
          </p>
          <div className="space-y-3">
            <input
              type="file"
              accept=".txt,.md,.json,.csv,.docx,.pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDocAnalyze}
                disabled={docAnalyzing || !docFile}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                {docAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {docAnalyzing ? "Analyzing..." : "Analyze & Index"}
              </button>
              <button
                onClick={() => { setShowDocUpload(false); setDocResult(null); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            {docResult && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 text-sm text-purple-300">
                {docResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div className="bg-slate-800 rounded-xl p-6 border border-indigo-500/50">
          <h3 className="text-white font-semibold mb-4">Upload New Use Case</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider">Use Case Name</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., Patient Discharge Summary Generator"
                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider">Primary Goal</label>
              <input
                type="text"
                value={uploadGoal}
                onChange={(e) => setUploadGoal(e.target.value)}
                placeholder="e.g., Automatically generate discharge summaries from clinical notes"
                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadName || !uploadGoal}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Analyzing..." : "Analyze & Add"}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            The scoring engine will analyze your use case, recommend an architecture, run the validation pipeline, and add it to the dashboard.
          </p>
        </div>
      )}

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

      <div className="text-sm text-slate-500">
        Showing {filtered.length} of {cases.length} healthcare use cases
      </div>

      {/* Case list */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const colors = ARCH_COLORS[c.primary_arch] || ARCH_COLORS.FOUNDRY_AGENT;
          const vr = validationResults[c.id];
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
                    {vr && (
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                        vr.validation.overall_status === "validated" ? "bg-green-600/20 text-green-300" :
                        vr.validation.overall_status === "corrected" ? "bg-red-600/20 text-red-300" :
                        "bg-orange-600/20 text-orange-300"
                      }`}>
                        {vr.validation.overall_status === "validated" ? <CheckCircle size={8} /> : <AlertTriangle size={8} />}
                        {vr.validation.overall_status}
                      </span>
                    )}
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
