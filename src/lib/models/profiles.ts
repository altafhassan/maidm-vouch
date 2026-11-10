import type { ModelProfile } from "./score";

/**
 * Two local heuristic “models” with the same feature inputs and different
 * weights / thresholds — for classroom ethics comparison without API keys.
 */
export const GUARDIAN: ModelProfile = {
  id: "guardian",
  name: "Guardian",
  blurb:
    "Strict local detector. Weights urgency and brand spoofing heavily, so it flags more borderline messages (higher false positives).",
  threshold: 0.38,
  weights: {
    urgency: 0.28,
    personalInfo: 0.3,
    financial: 0.28,
    vagueSolicitation: 0.26,
    brandImpersonation: 0.35,
    suspiciousSender: 0.22,
    displayNameMismatch: 0.25,
    suspiciousLinks: 0.32,
    linkCount: 0.08,
    attachment: 0.18,
    grammar: 0.1,
  },
};

export const BALANCER: ModelProfile = {
  id: "balancer",
  name: "Balancer",
  blurb:
    "Lenient local detector. Needs stronger combined evidence before flagging, so it misses more subtle scams (higher false negatives).",
  threshold: 0.55,
  weights: {
    urgency: 0.16,
    personalInfo: 0.22,
    financial: 0.2,
    vagueSolicitation: 0.12,
    brandImpersonation: 0.24,
    suspiciousSender: 0.14,
    displayNameMismatch: 0.16,
    suspiciousLinks: 0.22,
    linkCount: 0.04,
    attachment: 0.1,
    grammar: 0.05,
  },
};

export const MODEL_PROFILES = {
  guardian: GUARDIAN,
  balancer: BALANCER,
} as const;
