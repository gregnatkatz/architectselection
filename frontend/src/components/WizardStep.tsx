import { ChevronLeft, ChevronRight } from "lucide-react";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface WizardStepProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  type: "text" | "select" | "multiselect" | "radio";
  options?: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  isValid: boolean;
}

export default function WizardStep({
  stepNumber,
  totalSteps,
  title,
  description,
  type,
  options = [],
  value,
  onChange,
  onNext,
  onBack,
  isFirst,
  isLast,
  isValid,
}: WizardStepProps) {
  const progress = ((stepNumber) / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Step {stepNumber} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-slate-400 mb-6">{description}</p>

      {/* Input area */}
      <div className="space-y-3 mb-8">
        {type === "text" && (
          <input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) onNext();
            }}
          />
        )}

        {type === "select" && options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              value === opt.value
                ? "bg-indigo-600/20 border-indigo-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            {opt.description && (
              <div className="text-sm text-slate-400 mt-1">{opt.description}</div>
            )}
          </button>
        ))}

        {type === "radio" && options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
              value === opt.value
                ? "bg-indigo-600/20 border-indigo-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                value === opt.value ? "border-indigo-500" : "border-slate-500"
              }`}>
                {value === opt.value && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
              <div>
                <div className="font-medium">{opt.label}</div>
                {opt.description && (
                  <div className="text-sm text-slate-400 mt-1">{opt.description}</div>
                )}
              </div>
            </div>
          </button>
        ))}

        {type === "multiselect" && (
          <>
            <p className="text-sm text-slate-500 mb-2">Select all that apply</p>
            {options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    if (selected) {
                      onChange(current.filter((v) => v !== opt.value));
                    } else {
                      onChange([...current, opt.value]);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selected
                      ? "bg-indigo-600/20 border-indigo-500 text-white"
                      : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selected ? "border-indigo-500 bg-indigo-500" : "border-slate-500"
                    }`}>
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      {opt.description && (
                        <div className="text-sm text-slate-400 mt-1">{opt.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isFirst}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isFirst
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:text-white hover:bg-slate-700"
          }`}
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            isValid
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isLast ? "Get Recommendation" : "Next"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
