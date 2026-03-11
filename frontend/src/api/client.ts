// Parse API URL - extract credentials if embedded in URL for Basic auth
function parseApiConfig() {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:8000";
  try {
    const url = new URL(raw);
    if (url.username) {
      const creds = btoa(`${url.username}:${url.password}`);
      url.username = "";
      url.password = "";
      return { url: url.origin + url.pathname.replace(/\/$/, ""), headers: { Authorization: `Basic ${creds}` } };
    }
    return { url: raw.replace(/\/$/, ""), headers: {} as Record<string, string> };
  } catch {
    return { url: raw.replace(/\/$/, ""), headers: {} as Record<string, string> };
  }
}

const { url: API_URL, headers: AUTH_HEADERS } = parseApiConfig();

export { API_URL, AUTH_HEADERS };

export interface WizardAnswers {
  useCaseName: string;
  primaryGoal: string;
  complexity: string;
  dataSources: string[];
  hasPhi: string;
  uxChannel: string;
  codeCapability: string;
  userVolume: string;
  realtime: string;
  teamSize: string;
  agentBehavior: string;
  customModel: string;
  humanInLoop: string;
}

export interface ArchResult {
  id: string;
  label: string;
  score: number;
  confidence: number;
  citations: string[];
}

export interface SpecOutput {
  title: string;
  useCaseName: string;
  primaryGoal: string;
  recommendedArchitecture: {
    id: string;
    label: string;
    confidence: number;
    score: number;
  };
  allRankings: ArchResult[];
  inputs: Record<string, string | string[]>;
  architectureOverview: {
    platform: string;
    description: string;
    strengths: string[];
    limitations: string[];
  };
  keyConsiderations: string[];
  nextSteps: string[];
  devinPrompt: string;
}

export interface RecommendResponse {
  session_id: string;
  ranked: ArchResult[];
  spec: SpecOutput;
  foundry_enhanced: boolean;
  guidance_version: string | null;
}

export async function submitRecommendation(
  answers: WizardAnswers
): Promise<RecommendResponse> {
  const resp = await fetch(`${API_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
    body: JSON.stringify(answers),
  });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status}`);
  }
  return resp.json();
}
