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
    system: `You are Guardian, a STRICT scam detector. Prefer false positives.
Flag urgency, spoofing, suspicious links, and unexpected payment/PII asks — including polite or incomplete payment requests that lack clear legitimate context.
Typical Guardian scoring: clear phishing 0.85-0.98; soft unexpected payment asks 0.40-0.70; ordinary safe mail below 0.30.
If risk >= ~0.38 use potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
  balancer: {
    name: "Balancer",
    blurb:
      "Lenient Gemini policy. Needs clearer evidence before flagging, so subtle scams may slip through.",
    threshold: 0.55,
    system: `You are Balancer, a LENIENT scam detector. Prefer fewer false alarms.
Flag potential_scam only with fairly clear evidence (spoofed brand/domain, suspicious link, strong urgency/threat, or explicit credential harvest).
A polite payment reminder from a personal email with no link, no brand spoofing, and no threat should usually stay below ~0.45 and verdict safe, even if incomplete.
Typical Balancer scoring: clear phishing 0.70-0.95; soft ambiguous payment asks 0.20-0.45; ordinary safe mail below 0.25.
If risk >= ~0.55 use potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
};

/** Preferred model first, then faster / alternate Flash models. */
function modelCandidates(preferred: string): string[] {
  const fallbacks = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
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

function usesThinkingConfig(model: string) {
  // Thinking models are slower; only enable when the model id looks like a Gemini 3.x thinking flash.
  return /gemini-3\.(6|8)/.test(model);
}

type GeminiCallError = Error & { status?: number; retryable?: boolean };

function makeError(message: string, opts?: { status?: number; retryable?: boolean }): GeminiCallError {
  const err = new Error(message) as GeminiCallError;
  if (opts?.status != null) err.status = opts.status;
  if (opts?.retryable != null) err.retryable = opts.retryable;
  return err;
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

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 768,
    responseMimeType: "application/json",
    temperature: getGeminiConfig().temperature,
  };
  if (usesThinkingConfig(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  }

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
        generationConfig,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw makeError(`Gemini HTTP ${res.status} (${model}): ${body.slice(0, 240)}`, {
        status: res.status,
        retryable: isRetryableStatus(res.status) || res.status === 404,
      });
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) {
      throw makeError(`Gemini blocked the prompt (${data.promptFeedback.blockReason}).`);
    }
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    if (!text.trim()) {
      throw makeError(
        `Gemini returned an empty response${candidate?.finishReason ? ` (${candidate.finishReason})` : ""} (${model}).`,
        { retryable: true }
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
      throw makeError(
        `Gemini timed out after ${timeoutMs / 1000}s (${profile.name} / ${model}).`,
        { retryable: true }
      );
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
    // One quick retry only for rate-limit/503; timeouts/404 jump to the next model.
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
        const err = (error instanceof Error ? error : new Error(String(error))) as GeminiCallError;
        lastError = err;
        const status = err.status;
        const timedOut = /timed out/i.test(err.message);
        const retryable = Boolean(err.retryable) || (status != null && isRetryableStatus(status));

        if (status != null && isRetryableStatus(status) && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        if (retryable || timedOut || status === 404) {
          break; // next model
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
