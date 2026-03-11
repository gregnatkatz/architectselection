import { Copy, Check, Terminal } from "lucide-react";
import { useState } from "react";
import type { SpecOutput } from "../api/client";

interface DevinSpecTabProps {
  spec: SpecOutput;
}

export default function DevinSpecTab({ spec }: DevinSpecTabProps) {
  const [copied, setCopied] = useState(false);

  const prompt = spec.devinPrompt;

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Terminal size={20} /> Implementation Prompt
        </h3>
        <button
          onClick={copyPrompt}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-sm text-slate-400 mb-4">
          Copy this prompt to begin implementation:
        </p>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>
      </div>

      {/* Architecture quick reference */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Quick Reference
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Architecture:</span>
            <span className="text-white ml-2">{spec.recommendedArchitecture.label}</span>
          </div>
          <div>
            <span className="text-slate-500">Confidence:</span>
            <span className="text-white ml-2">{Math.round(spec.recommendedArchitecture.confidence * 100)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Complexity:</span>
            <span className="text-white ml-2">{spec.inputs.complexity}</span>
          </div>
          <div>
            <span className="text-slate-500">Data Sources:</span>
            <span className="text-white ml-2">
              {Array.isArray(spec.inputs.dataSources)
                ? spec.inputs.dataSources.join(", ") || "none"
                : spec.inputs.dataSources || "none"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">PHI:</span>
            <span className="text-white ml-2">{spec.inputs.hasPhi}</span>
          </div>
          <div>
            <span className="text-slate-500">Channel:</span>
            <span className="text-white ml-2">{spec.inputs.uxChannel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
