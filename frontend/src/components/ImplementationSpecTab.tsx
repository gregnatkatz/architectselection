import { Copy, Check, Terminal, Shield, Zap, ListChecks, ArrowRight, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import type { SpecOutput } from "../api/client";

/* Display label mappings */
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

function displayValue(key: string, val: string | string[]): string {
  if (Array.isArray(val)) return val.join(", ") || "none";
  if (key === "complexity") return COMPLEXITY_LABELS[val] || val;
  if (key === "teamSize") return TEAM_SIZE_LABELS[val] || val;
  if (key === "hasPhi") return val === "yes" ? "Yes \u2014 PHI Present" : "No PHI";
  return val;
}

interface ImplementationSpecTabProps {
  spec: SpecOutput;
}

export default function ImplementationSpecTab({ spec }: ImplementationSpecTabProps) {
  const [copied, setCopied] = useState(false);
  const overview = spec.architectureOverview;
  const considerations = spec.keyConsiderations || [];
  const nextSteps = spec.nextSteps || [];
  const prompt = spec.implementationPrompt;
  const whyThis = spec.whyThisArchitecture;
  const altConsidered = spec.alternativeConsidered;
  const validation = spec.validation;
  const reqTest = spec.requirementsTest;
  const corrective = spec.corrective;

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSpec = () => {
    const lines = [
      "# " + (spec.title || spec.useCaseName),
      "## Recommended Architecture: " + spec.recommendedArchitecture.label,
      "Confidence: " + Math.round(spec.recommendedArchitecture.confidence * 100) + "%",
      "",
      overview?.description || "",
    ];
    if (whyThis) { lines.push("", "## Why This Architecture", whyThis); }
    if (altConsidered) { lines.push("", "## Alternative Considered", altConsidered); }
    if (considerations.length > 0) {
      lines.push("", "## Key Considerations");
      considerations.forEach((c, i) => lines.push((i + 1) + ". " + c));
    }
    if (nextSteps.length > 0) {
      lines.push("", "## Implementation Roadmap");
      nextSteps.forEach((s, i) => lines.push((i + 1) + ". " + s));
    }
    lines.push("", "## Quick-Start Prompt", prompt);
    const text = lines.filter(Boolean).join("\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (spec.useCaseName || "spec").replace(/\s+/g, "_") + "_spec.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={exportSpec}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          <ArrowRight size={14} /> Export Spec
        </button>
      </div>

      {/* 1. Architecture Overview */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Info size={20} className="text-indigo-400" /> Recommended Platform
        </h3>
        <div className="mb-3">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-indigo-600 text-white">
            {overview?.platform || spec.recommendedArchitecture.label}
          </span>
          <span className="ml-3 text-sm text-slate-400">
            Confidence: {Math.round(spec.recommendedArchitecture.confidence * 100)}%
          </span>
        </div>
        {overview?.description && (
          <p className="text-slate-300 leading-relaxed">{overview.description}</p>
        )}

        {overview && (overview.strengths?.length > 0 || overview.limitations?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {overview.strengths?.length > 0 && (
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h4>
                <ul className="space-y-1.5">
                  {overview.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {overview.limitations?.length > 0 && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Limitations</h4>
                <ul className="space-y-1.5">
                  {overview.limitations.map((l, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Why This Architecture + Alternative */}
      {(whyThis || altConsidered) && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Zap size={20} className="text-amber-400" /> Architecture Selection Rationale
          </h3>
          {whyThis && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                Why This Architecture
              </h4>
              <p className="text-slate-300 leading-relaxed bg-slate-700/50 rounded-lg p-3">{whyThis}</p>
            </div>
          )}
          {altConsidered && (
            <div>
              <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
                Alternative Considered
              </h4>
              <p className="text-slate-300 leading-relaxed bg-slate-700/50 rounded-lg p-3">{altConsidered}</p>
            </div>
          )}
        </div>
      )}

      {/* 3. Validation Results */}
      {validation && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Shield size={20} className="text-green-400" /> Validation Results
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
              validation.status === "validated" ? "bg-green-600/20 text-green-300 border border-green-600/50" :
              validation.status === "warning" ? "bg-orange-600/20 text-orange-300 border border-orange-600/50" :
              "bg-red-600/20 text-red-300 border border-red-600/50"
            }`}>
              {validation.status === "validated" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {validation.status === "validated" ? "Validated" : validation.status === "warning" ? "Warning" : "Needs Correction"}
            </span>
            <span className="text-sm text-slate-400">
              {validation.passed_checks.length}/{validation.total_checks} checks passed ({Math.round(validation.pass_rate * 100)}%)
            </span>
          </div>

          {validation.issues.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Issues Found</h4>
              {validation.issues.map((issue, i) => (
                <div key={i} className={`rounded-lg p-3 text-sm ${
                  issue.severity === "critical" ? "bg-red-900/20 border border-red-800/50" : "bg-orange-900/20 border border-orange-800/50"
                }`}>
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className={issue.severity === "critical" ? "text-red-400" : "text-orange-400"} />
                    <span className="font-medium text-slate-200">{issue.check}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${issue.severity === "critical" ? "bg-red-700 text-red-200" : "bg-orange-700 text-orange-200"}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 ml-6">{issue.message}</p>
                  {issue.fix && <p className="text-emerald-400 mt-1 ml-6 text-xs">Fix: {issue.fix}</p>}
                </div>
              ))}
            </div>
          )}

          {validation.passed_checks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Passed Checks</h4>
              <div className="flex flex-wrap gap-2">
                {validation.passed_checks.map((check, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-900/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-800/50">
                    <CheckCircle size={10} /> {check}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Requirements Test Results */}
      {reqTest && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <ListChecks size={20} className="text-indigo-400" /> Requirements Test
          </h3>
          <p className="text-sm text-slate-300 mb-3">{reqTest.verdict}</p>

          {reqTest.simplification_options.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Simplification Options</h4>
              {reqTest.simplification_options.map((opt, i) => (
                <div key={i} className={`rounded-lg p-3 text-sm border ${opt.viable ? "bg-emerald-900/10 border-emerald-800/50" : "bg-slate-700/30 border-slate-600/50"}`}>
                  <div className="flex items-center gap-2">
                    {opt.viable ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-slate-500" />}
                    <span className="font-medium text-slate-200">{opt.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${opt.viable ? "bg-emerald-700 text-emerald-200" : "bg-slate-600 text-slate-300"}`}>
                      {opt.viable ? "Viable" : "Not viable"}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 ml-6">{opt.reasoning}</p>
                </div>
              ))}
            </div>
          )}

          {reqTest.reasons_needs_current.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Why Current Architecture Is Needed</h4>
              <ul className="space-y-1">
                {reqTest.reasons_needs_current.map((reason, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <ArrowRight size={12} className="text-amber-400 mt-1 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 5. Corrective Agent Results */}
      {corrective && corrective.action !== "none" && (
        <div className={`rounded-lg p-6 ${
          corrective.action === "corrected" ? "bg-red-900/20 border border-red-700/50" : "bg-amber-900/20 border border-amber-700/50"
        }`}>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className={corrective.action === "corrected" ? "text-red-400" : "text-amber-400"} />
            {corrective.action === "corrected" ? "Corrective Action Taken" : "Advisory Notice"}
          </h3>
          <p className="text-sm text-slate-300 mb-3">{corrective.message}</p>

          {corrective.corrections.length > 0 && (
            <div className="space-y-2">
              {corrective.corrections.map((c, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-sm">
                  <span className="font-medium text-slate-200">{c.issue}:</span>
                  <span className="text-slate-400 ml-2">{c.problem}</span>
                  <div className="text-emerald-400 mt-1 text-xs">Fix: {c.fix}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Key Considerations */}
      {considerations.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Shield size={20} className="text-orange-400" /> Key Considerations
          </h3>
          <div className="space-y-3">
            {considerations.map((c, i) => {
              const isWarning = c.includes("PHI") || c.includes("HIPAA") || c.includes("COMPLIANCE");
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm leading-relaxed ${
                    isWarning
                      ? "bg-orange-900/20 border border-orange-800/50 text-orange-200"
                      : "bg-slate-700/50 text-slate-300"
                  }`}
                >
                  {c}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Implementation Roadmap */}
      {nextSteps.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <ListChecks size={20} className="text-emerald-400" /> Implementation Roadmap
          </h3>
          <div className="space-y-2">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-700/30 rounded-lg p-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{step}</p>
                </div>
                {i < nextSteps.length - 1 && (
                  <ArrowRight size={14} className="text-slate-600 mt-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Quick Reference Grid */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Configuration Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Complexity", value: displayValue("complexity", spec.inputs.complexity) },
            { label: "PHI Status", value: displayValue("hasPhi", spec.inputs.hasPhi) },
            { label: "UX Channel", value: displayValue("uxChannel", spec.inputs.uxChannel) },
            { label: "Code Capability", value: displayValue("codeCapability", spec.inputs.codeCapability) },
            { label: "User Volume", value: displayValue("userVolume", spec.inputs.userVolume) },
            { label: "Real-time", value: displayValue("realtime", spec.inputs.realtime) },
            { label: "Team Size", value: displayValue("teamSize", spec.inputs.teamSize) },
            { label: "Data Sources", value: displayValue("dataSources", spec.inputs.dataSources) },
            { label: "Score", value: String(spec.recommendedArchitecture.score) },
          ].map((item) => (
            <div key={item.label} className="bg-slate-700/50 rounded-lg px-3 py-2">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="text-slate-300 mt-0.5 font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. Implementation Prompt */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
            <Terminal size={16} /> Quick-Start Prompt
          </h3>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>
      </div>
    </div>
  );
}
