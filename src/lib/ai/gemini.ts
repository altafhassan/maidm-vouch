import type { Indicator, ModelId, ModelResult, Verdict } from "../types";
import { getGeminiConfig } from "./config";
import { formatFeedbackForPrompt, type FeedbackExample } from "./feedback";

const SHARED_SCHEMA_INSTRUCTIONS = `Return ONLY JSON:
{"riskScore":0-1,"verdict":"safe"|"potential_scam","indicators":[{"id":"","label":"","detail":"","severity":"high"|"medium"|"low"}],"safeReasons":[],"recommendation":""}
If potential_scam: 1-4 indicators, safeReasons []. If safe: 2-3 safeReasons, indicators [].
Use plain language. If feedback examples exist, prefer consistency with similar labeled cases.`;

const PROFILES: Record<
  ModelId,
  { name: string; blurb: string; threshold: number; system: string }
> = {
  guardian: {
    name: "Guardian",
    blurb:
      "Strict Gemini policy. Prefers caution on borderline payment asks, urgency, and incomplete solicitations.",
    threshold: 0.38,
    system: `You are Guardian, a STRICT scam detector. Prefer false positives. Flag urgency, spoofing, suspicious links, payment/PII asks. If risk >= ~0.38 use potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
  balancer: {
    name: "Balancer",
    blurb:
      "Lenient Gemini policy. Needs clearer evidence before flagging, so subtle scams may slip through.",
    threshold: 0.55,
    system: `You are Balancer, a LENIENT scam detector. Prefer fewer false alarms. Flag potential_scam only with fairly clear evidence. If risk >= ~0.55 use potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
};

/** Preferred model first, then fallbacks when Google returns 503/high demand. */
function modelCandidates(preferred: string): string[] {
  const fallbacks = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
  ];
  return [preferred, ...fallbacks.filter((m) => m !== preferred)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Gemini returned non-JSON content.");
  }
}

function asVerdict(value: unknown): Verdict {
  return value === "potential_scam" ? "potential_scam" : "safe";
}

function asIndicators(value: unknown): Indicator[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const severity =
        row.severity === "high" || row.severity === "medium" || row.severity === "low"
          ? row.severity
          : "medium";
      return {
        id: typeof row.id === "string" ? row.id : `ind_${i}`,
        label: typeof row.label === "string" ? row.label : "Indicator",
        detail: typeof row.detail === "string" ? row.detail : "",
        severity,
      } satisfies Indicator;
    })
    .filter((x): x is Indicator => Boolean(x));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 503;
}

async function generateOnce(
  model: string,
  modelId: ModelId,
  message: string,
  feedbackExamples: FeedbackExample[],
  timeoutMs: number,
  apiKey: string
): Promise<ModelResult> {
  const profile = PROFILES[modelId];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const feedbackBlock = formatFeedbackForPrompt(feedbackExamples);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: profile.system }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Feedback examples:
${feedbackBlock}

Analyze this message:

---
${message}
---`,
              },
            ],
          },
        ],
        generationConfig: {
          thinkingConfig: { thinkingLevel: "low" },
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Gemini HTTP ${res.status} (${model}): ${body.slice(0, 240)}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the prompt (${data.promptFeedback.blockReason}).`);
    }
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    if (!text.trim()) {
      throw new Error(
        `Gemini returned an empty response${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}.`
      );
    }
    const parsed = extractJson(text) as Record<string, unknown>;
    const riskScore = Math.max(0, Math.min(1, Number(parsed.riskScore) || 0));
    const verdict = asVerdict(parsed.verdict);
    const indicators = verdict === "potential_scam" ? asIndicators(parsed.indicators) : [];
    const safeReasons = Array.isArray(parsed.safeReasons)
      ? parsed.safeReasons.filter((x): x is string => typeof x === "string").slice(0, 4)
      : [];

    return {
      modelId,
      modelName: profile.name,
      modelBlurb: `${profile.blurb} (model: ${model})`,
      riskScore: Math.round(riskScore * 100) / 100,
      threshold: profile.threshold,
      verdict,
      indicators,
      safeReasons: verdict === "safe" ? safeReasons : [],
      recommendation:
        typeof parsed.recommendation === "string"
          ? parsed.recommendation
          : verdict === "potential_scam"
            ? "Do not click links or share personal information. Verify through an official channel."
            : "No strong scam indicators were found, but stay cautious with unexpected requests.",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini timed out after ${timeoutMs / 1000}s (${profile.name} / ${model}).`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function scoreOne(
  modelId: ModelId,
  message: string,
  feedbackExamples: FeedbackExample[]
): Promise<{ result: ModelResult; modelUsed: string }> {
  const config = getGeminiConfig();
  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const models = modelCandidates(config.model);
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await generateOnce(
          model,
          modelId,
          message,
          feedbackExamples,
          config.timeoutMs,
          config.apiKey
        );
        return { result, modelUsed: model };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const status = (err as Error & { status?: number }).status;
        if (status && isRetryableStatus(status) && attempt === 1) {
          await sleep(800 * attempt);
          continue;
        }
        if (status && isRetryableStatus(status)) {
          // try next model
          break;
        }
        if (status === 404) {
          // retired model id — try next candidate
          break;
        }
        throw err;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed.");
}

export async function analyzeWithGemini(
  message: string,
  feedbackExamples: FeedbackExample[] = []
): Promise<{
  guardian: ModelResult;
  balancer: ModelResult;
  model: string;
  feedbackCount: number;
}> {
  const [guardianRes, balancerRes] = await Promise.all([
    scoreOne("guardian", message, feedbackExamples),
    scoreOne("balancer", message, feedbackExamples),
  ]);
  return {
    guardian: guardianRes.result,
    balancer: balancerRes.result,
    model: guardianRes.modelUsed,
    feedbackCount: feedbackExamples.length,
  };
}
