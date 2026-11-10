import { extractFeatures } from "../extract";
import type { ModelId, ModelResult, ScanRecord } from "../types";
import { MODEL_PROFILES } from "./profiles";
import { scoreWithProfile } from "./score";

export { MODEL_PROFILES } from "./profiles";
export { scoreWithProfile, buildIndicators } from "./score";

export function analyzeMessage(
  raw: string,
  primaryModel: ModelId = "guardian"
): Omit<ScanRecord, "id" | "createdAt" | "quarantined" | "feedback"> {
  const features = extractFeatures(raw);
  const results = {
    guardian: scoreWithProfile(features, MODEL_PROFILES.guardian),
    balancer: scoreWithProfile(features, MODEL_PROFILES.balancer),
  } satisfies Record<ModelId, ModelResult>;

  return {
    message: {
      from: features.from,
      subject: features.subject,
      body: features.body,
      raw: features.raw,
    },
    features,
    results,
    primaryModel,
  };
}

export function modelsDisagree(results: Record<ModelId, ModelResult>): boolean {
  return results.guardian.verdict !== results.balancer.verdict;
}
