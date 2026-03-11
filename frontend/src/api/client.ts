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
  implementationPrompt: string;
  whyThisArchitecture?: string;
  alternativeConsidered?: string;
  aiLightning?: {
    applicable: boolean;
    framework: string;
    summary: string;
    optimizationPaths: Array<{ name: string; description: string }>;
    trainingStrategy: string;
  };
  validation?: {
    status: "validated" | "needs_correction" | "warning";
    issues: Array<{ severity: string; check: string; message: string; fix: string }>;
    passed_checks: string[];
    total_checks: number;
    pass_rate: number;
  };
  requirementsTest?: {
    simplification_options: Array<{ architecture: string; label: string; viable: boolean; reasoning: string }>;
    reasons_needs_current: string[];
    could_simplify: boolean;
    verdict: string;
  };
  corrective?: {
    action: "none" | "advisory" | "corrected";
    message: string;
    original_arch: string;
    corrected_arch?: string;
    corrections: Array<{ issue: string; problem: string; fix: string }>;
  };
}

export interface Citation {
  text: string;
  url: string;
  arch: string;
  similarity: number;
}

export interface RecommendResponse {
  session_id: string;
  ranked: ArchResult[];
  spec: SpecOutput;
  foundry_enhanced: boolean;
  guidance_version: string | null;
  citations: Citation[];
}

export interface SSEEvent {
  status: string;
  result?: { ranked: ArchResult[]; spec: SpecOutput; citations: Citation[] };
  enhanced_narrative?: string;
  reason?: string;
  msg?: string;
}

export interface GuidanceStatus {
  doc_count: number;
  last_sync: { synced_at: string; sources_synced: number; chunks_added: number } | null;
}

export interface AdminStats {
  total_cases: number;
  feedback: { total: number; correct: number; accuracy: number };
  architecture_distribution: { arch: string; count: number }[];
  guidance_sync: GuidanceStatus;
  chroma_docs: number;
  foundry_available: boolean;
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

export async function streamEnhancedRecommend(
  answers: WizardAnswers,
  onEvent: (event: SSEEvent) => void,
  bearerToken?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...AUTH_HEADERS,
  };
  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  const resp = await fetch(`${API_URL}/api/recommend/enhanced`, {
    method: "POST",
    headers,
    body: JSON.stringify(answers),
  });

  if (!resp.ok) {
    throw new Error(`API error: ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const event: SSEEvent = JSON.parse(data);
          onEvent(event);
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

export async function fetchGuidanceStatus(): Promise<GuidanceStatus> {
  const resp = await fetch(`${API_URL}/api/guidance/status`, { headers: AUTH_HEADERS });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function triggerGuidanceSync(): Promise<{ status: string }> {
  const resp = await fetch(`${API_URL}/api/guidance/sync`, {
    method: "POST",
    headers: AUTH_HEADERS,
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const resp = await fetch(`${API_URL}/api/admin/stats`, { headers: AUTH_HEADERS });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function fetchHealthCheck(): Promise<{ status: string; chroma_docs: number; foundry_available: boolean }> {
  const resp = await fetch(`${API_URL}/api/health`, { headers: AUTH_HEADERS });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export interface ValidationResult {
  id: string;
  useCaseName: string;
  category: string;
  recommended_arch: string;
  validation: {
    overall_status: string;
    validator: { status: string; issues: Array<{ severity: string; check: string; message: string; fix: string }>; passed_checks: string[]; total_checks: number; pass_rate: number };
    requirements_test: { simplification_options: Array<{ architecture: string; label: string; viable: boolean; reasoning: string }>; reasons_needs_current: string[]; could_simplify: boolean; verdict: string };
    corrective: { action: string; message: string; original_arch: string; corrected_arch?: string; corrections: Array<{ issue: string; problem: string; fix: string }> };
  };
}

export interface ValidateAllResponse {
  results: ValidationResult[];
  stats: { validated: number; warning: number; corrected: number; advisory: number };
  total: number;
}

export async function validateAllCases(): Promise<ValidateAllResponse> {
  const resp = await fetch(`${API_URL}/api/validate-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export interface UploadCaseRequest {
  useCaseName: string;
  primaryGoal: string;
  category?: string;
  complexity?: string;
  dataSources?: string[];
  hasPhi?: string;
  uxChannel?: string;
  codeCapability?: string;
  userVolume?: string;
  realtime?: string;
  teamSize?: string;
  agentBehavior?: string;
  customModel?: string;
  humanInLoop?: string;
  description?: string;
}

export async function uploadCase(req: UploadCaseRequest): Promise<Record<string, unknown>> {
  const resp = await fetch(`${API_URL}/api/upload-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
    body: JSON.stringify(req),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
