export type Verdict = "safe" | "potential_scam";

export type ModelId = "guardian" | "balancer";

export type ExtractedFeatures = {
  subject: string;
  from: string;
  body: string;
  raw: string;
  links: string[];
  linkCount: number;
  hasAttachmentCue: boolean;
  urgencyScore: number;
  requestsPersonalInfo: boolean;
  financialRequest: boolean;
  vagueSolicitation: boolean;
  brandImpersonation: boolean;
  suspiciousSender: boolean;
  displayNameMismatch: boolean;
  grammarIssues: boolean;
  channel: "email" | "sms" | "unknown";
};

export type Indicator = {
  id: string;
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
  safeHint?: boolean;
};

export type ModelResult = {
  modelId: ModelId;
  modelName: string;
  modelBlurb: string;
  riskScore: number;
  threshold: number;
  verdict: Verdict;
  indicators: Indicator[];
  safeReasons: string[];
  recommendation: string;
};

export type AnalysisEngine = "local" | "gemini";

export type ScanRecord = {
  id: string;
  createdAt: string;
  message: {
    from: string;
    subject: string;
    body: string;
    raw: string;
  };
  features: ExtractedFeatures;
  results: Record<ModelId, ModelResult>;
  primaryModel: ModelId;
  engine?: AnalysisEngine;
  quarantined: boolean;
  feedback: "confirmed_scam" | "marked_safe" | null;
};

export type UserProfile = {
  name: string;
  onboarded: boolean;
};

export type AppStats = {
  scansThisWeek: number;
  potentialScams: number;
  safeMessages: number;
};
