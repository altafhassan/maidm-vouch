import type { ExtractedFeatures, Indicator, ModelId, ModelResult, Verdict } from "../types";

export type ModelProfile = {
  id: ModelId;
  name: string;
  blurb: string;
  threshold: number;
  weights: {
    urgency: number;
    personalInfo: number;
    financial: number;
    vagueSolicitation: number;
    brandImpersonation: number;
    suspiciousSender: number;
    displayNameMismatch: number;
    suspiciousLinks: number;
    linkCount: number;
    attachment: number;
    grammar: number;
  };
};

function suspiciousLinkScore(features: ExtractedFeatures): number {
  if (features.links.length === 0) return 0;
  let score = 0;
  for (const link of features.links) {
    const lower = link.toLowerCase();
    if (/amaz0n|paypa1|micros0ft|app1e|g00gle|secure-?login|verify-?account/i.test(lower)) {
      score += 0.45;
    } else if (/\.(tk|ml|ga|cf|gq|zip|mov|top|xyz)\b/i.test(lower)) {
      score += 0.35;
    } else if (/login|verify|secure|account|update|confirm/i.test(lower)) {
      score += 0.15;
    } else {
      score += 0.05;
    }
  }
  return Math.min(1, score);
}

export function buildIndicators(features: ExtractedFeatures): Indicator[] {
  const indicators: Indicator[] = [];

  if (features.brandImpersonation) {
    indicators.push({
      id: "brand",
      label: "Possible brand impersonation",
      detail:
        "The message references a known organization, but the sender or links do not clearly match that brand’s official domain.",
      severity: "high",
    });
  }

  if (features.suspiciousSender || features.displayNameMismatch) {
    indicators.push({
      id: "sender",
      label: "Sender looks mismatched or suspicious",
      detail: features.displayNameMismatch
        ? "The display name suggests a trusted brand, but the email address does not match."
        : "The sender address uses patterns common in phishing (odd domain, digits, or security-themed subdomain).",
      severity: "high",
    });
  }

  if (features.urgencyScore >= 0.34) {
    indicators.push({
      id: "urgency",
      label: "Creates a sense of urgency",
      detail:
        "Language pressures you to act quickly (e.g., “urgent”, “act now”, account suspension), which scammers use to skip careful checking.",
      severity: features.urgencyScore >= 0.67 ? "high" : "medium",
    });
  }

  if (features.requestsPersonalInfo) {
    indicators.push({
      id: "pii",
      label: "Requests personal or login information",
      detail:
        "Legitimate organizations rarely ask for passwords, banking details, or identity data through an unexpected message.",
      severity: "high",
    });
  }

  if (features.financialRequest) {
    indicators.push({
      id: "money",
      label: "Financial or payment pressure",
      detail:
        "The message pushes payment, transfers, gift cards, crypto, or unexpected refunds — common scam tactics.",
      severity: "high",
    });
  }

  if (features.vagueSolicitation) {
    indicators.push({
      id: "vague",
      label: "Vague or incomplete payment / action ask",
      detail:
        "The message is very short and asks you to pay or act without clear context, sender detail, or a legitimate destination — a common social-engineering pattern.",
      severity: "high",
    });
  }

  if (features.linkCount > 0 && suspiciousLinkScore(features) >= 0.2) {
    indicators.push({
      id: "links",
      label: "Contains suspicious link(s)",
      detail:
        features.links.length === 1
          ? `A link looks unusual: ${features.links[0]}`
          : `${features.links.length} links were found; at least one looks unusual or spoofed.`,
      severity: "high",
    });
  } else if (features.linkCount >= 3) {
    indicators.push({
      id: "many-links",
      label: "Unusually many links",
      detail: "A high number of links can be a spam or phishing signal when paired with other red flags.",
      severity: "low",
    });
  }

  if (features.hasAttachmentCue) {
    indicators.push({
      id: "attachment",
      label: "Mentions attachments or risky file types",
      detail: "Unexpected attachments — especially executables or archives — are a common malware delivery method.",
      severity: "medium",
    });
  }

  if (features.grammarIssues) {
    indicators.push({
      id: "language",
      label: "Odd or template-like language",
      detail: "Awkward phrasing, generic greetings, or exaggerated punctuation often appear in mass scam templates.",
      severity: "low",
    });
  }

  return indicators;
}

export function buildSafeReasons(features: ExtractedFeatures): string[] {
  const reasons: string[] = [];
  if (!features.suspiciousSender && !features.displayNameMismatch) {
    reasons.push("Sender does not show obvious spoofing patterns.");
  }
  if (features.linkCount === 0) {
    reasons.push("No links detected in the message.");
  } else if (suspiciousLinkScore(features) < 0.2) {
    reasons.push("Links do not match common phishing patterns.");
  }
  if (features.urgencyScore < 0.34) {
    reasons.push("Language and tone look relatively calm / normal.");
  }
  if (!features.requestsPersonalInfo) {
    reasons.push("No clear request for passwords or sensitive personal data.");
  }
  if (!features.financialRequest) {
    reasons.push("No strong pressure to send money or payment details.");
  }
  if (!features.brandImpersonation) {
    reasons.push("No clear brand-impersonation signals.");
  }
  if (reasons.length === 0) {
    reasons.push("Overall risk stayed below this model’s threshold.");
  }
  return reasons.slice(0, 4);
}

export function scoreWithProfile(
  features: ExtractedFeatures,
  profile: ModelProfile
): ModelResult {
  const w = profile.weights;
  const linkRisk = suspiciousLinkScore(features);

  const raw =
    features.urgencyScore * w.urgency +
    (features.requestsPersonalInfo ? w.personalInfo : 0) +
    (features.financialRequest ? w.financial : 0) +
    (features.vagueSolicitation ? w.vagueSolicitation : 0) +
    (features.brandImpersonation ? w.brandImpersonation : 0) +
    (features.suspiciousSender ? w.suspiciousSender : 0) +
    (features.displayNameMismatch ? w.displayNameMismatch : 0) +
    linkRisk * w.suspiciousLinks +
    Math.min(1, features.linkCount / 4) * w.linkCount +
    (features.hasAttachmentCue ? w.attachment : 0) +
    (features.grammarIssues ? w.grammar : 0);

  // Soft cap then normalize into 0–1 for display
  const riskScore = Math.max(0, Math.min(1, raw));
  const indicators = buildIndicators(features);
  const verdict: Verdict =
    riskScore >= profile.threshold ? "potential_scam" : "safe";

  const recommendation =
    verdict === "potential_scam"
      ? "Do not click links or share personal information. Contact the organization through a channel you already trust (official website or app), not through this message."
      : "No strong scam indicators were found, but stay cautious with unexpected requests. When unsure, verify through an official channel.";

  return {
    modelId: profile.id,
    modelName: profile.name,
    modelBlurb: profile.blurb,
    riskScore: Math.round(riskScore * 100) / 100,
    threshold: profile.threshold,
    verdict,
    indicators: verdict === "potential_scam" ? indicators : [],
    safeReasons: verdict === "safe" ? buildSafeReasons(features) : [],
    recommendation,
  };
}
