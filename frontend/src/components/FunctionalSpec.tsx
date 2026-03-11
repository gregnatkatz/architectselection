import { FileText, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { SpecOutput } from "../api/client";

interface FunctionalSpecProps {
  spec: SpecOutput;
}

export default function FunctionalSpec({ spec }: FunctionalSpecProps) {
  const [copied, setCopied] = useState(false);
  const overview = spec.architectureOverview;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText size={20} /> Functional Specification
        </h3>
        <button
          onClick={copyJson}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy JSON"}
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 space-y-6">
        {/* Executive Summary */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/50 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-3">Executive Summary</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Use Case</div>
              <h4 className="text-lg font-bold text-white">{spec.title}</h4>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Expected Outcome</div>
              <p className="text-slate-300">{spec.primaryGoal}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recommended Architecture</div>
                <div className="text-base font-semibold text-white">{spec.recommendedArchitecture.label}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Confidence</div>
                <div className="text-base font-semibold text-white">{Math.round(spec.recommendedArchitecture.confidence * 100)}%</div>
              </div>
            </div>
            {spec.whyThisArchitecture && (
              <div className="pt-2 border-t border-indigo-700/30">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Why This Architecture</div>
                <p className="text-sm text-slate-300">{spec.whyThisArchitecture}</p>
              </div>
            )}
            {spec.alternativeConsidered && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Alternative Considered</div>
                <p className="text-sm text-slate-400">{spec.alternativeConsidered}</p>
              </div>
            )}
          </div>
        </div>

        {/* Architecture Overview */}
        <div>
          <h5 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Platform Overview</h5>
          <p className="text-slate-400">{overview.description}</p>
        </div>

        {/* Strengths */}
        <div>
          <h5 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">Strengths</h5>
          <ul className="space-y-2">
            {overview.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-green-400 mt-1">+</span> {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h5 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Limitations</h5>
          <ul className="space-y-2">
            {overview.limitations.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-amber-400 mt-1">-</span> {l}
              </li>
            ))}
          </ul>
        </div>

        {/* Key Considerations */}
        {spec.keyConsiderations.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Key Considerations</h5>
            <ul className="space-y-2">
              {spec.keyConsiderations.map((c, i) => (
                <li key={i} className="text-slate-300 bg-red-900/20 border border-red-800/50 rounded p-3 text-sm">{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        <div>
          <h5 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Next Steps</h5>
          <ol className="space-y-2">
            {spec.nextSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
