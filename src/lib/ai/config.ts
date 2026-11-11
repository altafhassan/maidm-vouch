export type GeminiConfig = {
  configured: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  timeoutMs: number;
};

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  return {
    configured: Boolean(apiKey),
    apiKey,
    model: (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim(),
    temperature: num(process.env.GEMINI_TEMPERATURE, 0.2),
    timeoutMs: num(process.env.GEMINI_TIMEOUT_MS, 25000),
  };
}

export function getPublicAiStatus(config = getGeminiConfig()) {
  return {
    engine: config.configured ? ("gemini" as const) : ("local" as const),
    configured: config.configured,
    model: config.configured ? config.model : "unset",
    temperature: config.temperature,
  };
}
