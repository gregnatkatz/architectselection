import { useState } from "react";
import { AlertTriangle, RotateCcw, Loader2, LayoutDashboard, Wand2 } from "lucide-react";
import WizardStep from "./components/WizardStep";
import FunctionalSpec from "./components/FunctionalSpec";
import ArchDiagram from "./components/ArchDiagram";
import DevinSpecTab from "./components/DevinSpecTab";
import Dashboard from "./components/Dashboard";
import { submitRecommendation } from "./api/client";
import type { WizardAnswers, RecommendResponse } from "./api/client";

interface QuestionDef {
  id: keyof WizardAnswers;
  title: string;
  description: string;
  type: "text" | "select" | "multiselect" | "radio";
  options?: { value: string; label: string; description?: string }[];
  required?: boolean;
}

const QUESTIONS: QuestionDef[] = [
  {
    id: "useCaseName",
    title: "What is this use case called?",
    description: "Give your use case a short descriptive name.",
    type: "text",
    required: true,
  },
  {
    id: "primaryGoal",
    title: "What is the primary goal?",
    description: "Describe the main objective this agent needs to achieve.",
    type: "text",
    required: true,
  },
  {
    id: "complexity",
    title: "How complex is the workflow?",
    description: "Consider the number of steps, decision points, and integrations required.",
    type: "select",
    options: [
      { value: "simple", label: "Simple", description: "Single-turn Q&A, basic lookups, 1-2 data sources" },
      { value: "moderate", label: "Moderate", description: "Multi-step workflow, conditional logic, 2-4 integrations" },
      { value: "complex", label: "Complex", description: "Advanced orchestration, custom models, 4+ integrations" },
      { value: "multiagent", label: "Multi-Agent", description: "Multiple specialized agents coordinating together" },
    ],
  },
  {
    id: "dataSources",
    title: "Which data sources will the agent access?",
    description: "Select all data sources this use case needs to connect to.",
    type: "multiselect",
    options: [
      { value: "sharepoint", label: "SharePoint", description: "SharePoint sites, document libraries" },
      { value: "fabric", label: "Microsoft Fabric / OneLake", description: "Fabric lakehouses, data warehouses" },
      { value: "snowflake", label: "Snowflake", description: "Snowflake data warehouse" },
      { value: "salesforce", label: "Salesforce", description: "Salesforce CRM data" },
      { value: "servicenow", label: "ServiceNow", description: "ServiceNow ITSM data" },
      { value: "workday", label: "Workday", description: "Workday HR/finance data" },
      { value: "azuresql", label: "Azure SQL", description: "Azure SQL Database" },
      { value: "none", label: "None / Other", description: "No specific data source or unlisted" },
    ],
  },
  {
    id: "hasPhi",
    title: "Does this use case involve sensitive data?",
    description: "PHI (Protected Health Information) requires HIPAA-compliant architecture.",
    type: "select",
    options: [
      { value: "no", label: "No sensitive data", description: "General business data, no compliance requirements" },
      { value: "pii", label: "PII (Personally Identifiable Information)", description: "Names, emails, addresses — standard data protection" },
      { value: "yes", label: "PHI (Protected Health Information)", description: "HIPAA-regulated health data — requires Foundry architecture" },
      { value: "financial", label: "Financial data", description: "Financial records, payment data, SOX compliance" },
    ],
  },
  {
    id: "uxChannel",
    title: "Where will users interact with the agent?",
    description: "Choose the primary user experience channel.",
    type: "select",
    options: [
      { value: "teams", label: "Microsoft Teams", description: "Teams chat, adaptive cards, bot framework" },
      { value: "m365copilot", label: "M365 Copilot", description: "Embedded in Microsoft 365 Copilot experience" },
      { value: "web", label: "Web Application", description: "Custom web app or portal" },
      { value: "api", label: "API / Headless", description: "REST API consumed by other services" },
    ],
  },
  {
    id: "codeCapability",
    title: "What is your team's development capability?",
    description: "This helps determine the right level of platform abstraction.",
    type: "select",
    options: [
      { value: "lowcode", label: "Low-Code", description: "Citizen developers, Power Platform, no custom code" },
      { value: "mixed", label: "Mixed", description: "Some developers, comfortable with configuration + light code" },
      { value: "procode", label: "Pro-Code", description: "Full development team, custom code, CI/CD pipelines" },
    ],
  },
  {
    id: "userVolume",
    title: "How many users will the agent serve?",
    description: "Estimate the number of concurrent or total users.",
    type: "select",
    options: [
      { value: "small", label: "Small (< 100 users)", description: "Team or department level" },
      { value: "medium", label: "Medium (100 - 1,000 users)", description: "Business unit or division" },
      { value: "large", label: "Large (1,000 - 10,000 users)", description: "Organization-wide deployment" },
      { value: "enterprise", label: "Enterprise (10,000+ users)", description: "Global enterprise scale" },
    ],
  },
  {
    id: "realtime",
    title: "Does the agent need real-time data processing?",
    description: "Real-time means processing streaming data or sub-second response to data changes.",
    type: "radio",
    options: [
      { value: "no", label: "No", description: "Batch processing or near-real-time is sufficient" },
      { value: "yes", label: "Yes", description: "Must process streaming data or react to changes instantly" },
    ],
  },
  {
    id: "teamSize",
    title: "What is your team size?",
    description: "The team that will build and maintain this solution.",
    type: "select",
    options: [
      { value: "small", label: "Small (1-3 people)", description: "Small team, needs simple tooling" },
      { value: "medium", label: "Medium (4-10 people)", description: "Mid-size team, can handle moderate complexity" },
      { value: "large", label: "Large (10+ people)", description: "Large team, can manage complex infrastructure" },
    ],
  },
  // Q11-Q13 from Addendum
  {
    id: "agentBehavior",
    title: "What does the agent primarily do?",
    description: "The agent's behavior mode affects which platform best supports its actions.",
    type: "select",
    options: [
      { value: "readonly", label: "Answer & retrieve", description: "Read-only: answer questions, look up information" },
      { value: "guided", label: "Guide through process", description: "Multi-step: walk users through a workflow" },
      { value: "autonomous", label: "Take autonomous actions", description: "Write/update: create records, send emails, modify data" },
      { value: "multiagent", label: "Coordinate multiple agents", description: "Orchestrate: multiple specialized agents working together" },
    ],
  },
  {
    id: "customModel",
    title: "Do you need a custom, fine-tuned, or bring-your-own model?",
    description: "Fine-tuned or BYOM deployments require Azure AI Foundry.",
    type: "select",
    options: [
      { value: "no", label: "No — standard GPT", description: "Standard Azure OpenAI deployment is sufficient" },
      { value: "finetune", label: "Fine-tuned GPT", description: "Domain-specific fine-tuned version of GPT" },
      { value: "byom", label: "Bring-your-own model", description: "Llama, Mistral, or other open-source model" },
      { value: "unsure", label: "Not sure yet", description: "Requirements not finalized" },
    ],
  },
  {
    id: "humanInLoop",
    title: "Does the workflow require human review or approval?",
    description: "Approval flows affect which platform handles them most natively.",
    type: "select",
    options: [
      { value: "no", label: "No — fully automated", description: "No human checkpoints in the workflow" },
      { value: "soft", label: "Soft — confirm in chat", description: "Agent suggests action, user confirms inline" },
      { value: "hard", label: "Hard — separate approval system", description: "Workflow pauses; human approves in Teams/email/portal" },
      { value: "escalation", label: "Escalation only", description: "Agent escalates to human when it cannot resolve" },
    ],
  },
];

const DEFAULT_ANSWERS: WizardAnswers = {
  useCaseName: "",
  primaryGoal: "",
  complexity: "",
  dataSources: [],
  hasPhi: "",
  uxChannel: "",
  codeCapability: "",
  userVolume: "",
  realtime: "",
  teamSize: "",
  agentBehavior: "",
  customModel: "",
  humanInLoop: "",
};

type AppView = "dashboard" | "wizard";
type ResultTab = "spec" | "diagram" | "implementation";

function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({ ...DEFAULT_ANSWERS });
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("spec");

  const currentQuestion = QUESTIONS[step];

  const getValue = () => {
    return answers[currentQuestion.id];
  };

  const setValue = (val: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const isValid = () => {
    const val = getValue();
    if (currentQuestion.required && currentQuestion.type === "text") {
      return typeof val === "string" && val.trim().length > 0;
    }
    if (currentQuestion.type === "select" || currentQuestion.type === "radio") {
      return typeof val === "string" && val.length > 0;
    }
    return true;
  };

  const handleNext = async () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Submit
      setLoading(true);
      setError(null);
      try {
        const resp = await submitRecommendation(answers);
        setResult(resp);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Service unavailable — please try again"
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({ ...DEFAULT_ANSWERS });
    setResult(null);
    setError(null);
    setActiveTab("spec");
  };

  const switchToWizard = () => {
    handleReset();
    setView("wizard");
  };

  // Shared header with navigation
  const appHeader = (
    <header className="border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Copilot Architecture Advisor</h1>
          <p className="text-slate-400 text-sm">Microsoft AI Platform Decision Engine</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setView("dashboard"); handleReset(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "dashboard"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <LayoutDashboard size={16} /> Healthcare Dashboard
          </button>
          <button
            onClick={switchToWizard}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "wizard"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <Wand2 size={16} /> New Assessment
          </button>
        </div>
      </div>
    </header>
  );

  // Dashboard view
  if (view === "dashboard") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {appHeader}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          <Dashboard />
        </main>
      </div>
    );
  }

  // Wizard: Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {appHeader}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Analyzing your use case...</p>
            <p className="text-slate-500 text-sm mt-2">Running scoring engine</p>
          </div>
        </div>
      </div>
    );
  }

  // Wizard: Error state (GAP 9: Backend unreachable)
  if (error && !result) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {appHeader}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 mx-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all"
            >
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard: Results view
  if (result) {
    const primary = result.ranked[0];
    const lowConfidence = primary && primary.confidence < 0.5;

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {appHeader}
        <div className="max-w-5xl mx-auto w-full p-6">
          {/* Result header */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-slate-400">Recommendation Results</p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            >
              <RotateCcw size={16} /> New Analysis
            </button>
          </div>

          {/* Low confidence warning (GAP 9) */}
          {lowConfidence && (
            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-orange-300 font-medium">Low confidence recommendation</p>
                <p className="text-orange-400/80 text-sm mt-1">
                  Consider reviewing with your architect. Confidence: {Math.round(primary.confidence * 100)}%
                </p>
              </div>
            </div>
          )}

          {/* Primary recommendation card */}
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <div className="text-sm text-indigo-400 font-medium mb-1">
              Recommended Architecture
            </div>
            <h2 className="text-3xl font-bold text-white">{primary?.label}</h2>
            <div className="flex gap-4 mt-3">
              <span className="px-3 py-1 bg-indigo-600/20 text-indigo-300 text-sm rounded-full">
                Score: {primary?.score}
              </span>
              <span className="px-3 py-1 bg-indigo-600/20 text-indigo-300 text-sm rounded-full">
                Confidence: {primary ? Math.round(primary.confidence * 100) : 0}%
              </span>
              <span className="px-3 py-1 bg-slate-700 text-slate-400 text-sm rounded-full">
                {result.foundry_enhanced ? "Foundry Enhanced" : "Rule-Based"}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1">
            {(
              [
                { key: "spec" as ResultTab, label: "Functional Spec" },
                { key: "diagram" as ResultTab, label: "Architecture Diagram" },
                { key: "implementation" as ResultTab, label: "Implementation Spec" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
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
            {activeTab === "spec" && <FunctionalSpec spec={result.spec} />}
            {activeTab === "diagram" && <ArchDiagram ranked={result.ranked} />}
            {activeTab === "implementation" && <DevinSpecTab spec={result.spec} />}
          </div>
        </div>
      </div>
    );
  }

  // Wizard: Question view
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {appHeader}
      <main className="flex-1 flex items-center justify-center p-6">
        <WizardStep
          stepNumber={step + 1}
          totalSteps={QUESTIONS.length}
          title={currentQuestion.title}
          description={currentQuestion.description}
          type={currentQuestion.type}
          options={currentQuestion.options}
          value={getValue()}
          onChange={setValue}
          onNext={handleNext}
          onBack={handleBack}
          isFirst={step === 0}
          isLast={step === QUESTIONS.length - 1}
          isValid={isValid()}
        />
      </main>
    </div>
  );
}

export default App;
