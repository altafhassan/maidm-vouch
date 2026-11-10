import type { Indicator, ModelId, ModelResult, Verdict } from "../types";
import { getGeminiConfig } from "./config";

const SHARED_SCHEMA_INSTRUCTIONS = `Return ONLY valid JSON with this exact shape:
{
  "riskScore": number between 0 and 1,
  "verdict": "safe" or "potential_scam",
  "indicators": [{"id": string, "label": string, "detail": string, "severity": "high"|"medium"|"low"}],
  "safeReasons": string[],
  "recommendation": string
}
Rules:
- If verdict is "potential_scam", put red flags in indicators (1-5) and leave safeReasons as [].
- If verdict is "safe", put 2-4 short reasons in safeReasons and leave indicators as [].
- Use plain language for a non-technical user.
- riskScore must be consistent with verdict.`;

const PROFILES: Record<
  ModelId,
  { name: string; blurb: string; threshold: number; system: string }
> = {
  guardian: {
    name: "Guardian",
    blurb:
      "Strict Gemini policy. Prefers caution: flag borderline payment asks, urgency, and incomplete solicitations even with weaker evidence.",
    threshold: 0.38,
    system: `You are Guardian, a STRICT scam/spam message detector for an ethics class demo.
Prefer false positives over missed scams. Flag vague payment demands, urgency, brand impersonation, suspicious links, and requests for secrets.
Decision threshold mindset: if risk seems >= about 0.38, verdict should be potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
  balancer: {
    name: "Balancer",
    blurb:
      "Lenient Gemini policy. Needs clearer combined evidence before flagging, so subtle scams may slip through.",
    threshold: 0.55,
    system: `You are Balancer, a LENIENT scam/spam message detector for an ethics class demo.
Prefer fewer false alarms. Only flag potential_scam when evidence is fairly clear (spoofed brands/links, strong urgency + payment/PII asks, etc.).
Decision threshold mindset: if risk seems >= about 0.55, verdict should be potential_scam.
${SHARED_SCHEMA_INSTRUCTIONS}`,
  },
};

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

async function scoreOne(modelId: ModelId, message: string): Promise<ModelResult> {
  const config = getGeminiConfig();
  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const profile = PROFILES[modelId];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: profile.system }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this message for scam/spam risk.\n\n---\n${message}\n---`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
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
    modelBlurb: profile.blurb,
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
}

export async function analyzeWithGemini(message: string): Promise<{
  guardian: ModelResult;
  balancer: ModelResult;
  model: string;
}> {
  const config = getGeminiConfig();
  const [guardian, balancer] = await Promise.all([
    scoreOne("guardian", message),
    scoreOne("balancer", message),
  ]);
  return { guardian, balancer, model: config.model };
}
