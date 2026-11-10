import { describe, expect, it } from "vitest";
import { extractFeatures } from "../extract";
import { SAMPLE_BORDERLINE, SAMPLE_SAFE, SAMPLE_SCAM } from "../samples";
import { analyzeMessage, modelsDisagree } from "./index";
import { MODEL_PROFILES } from "./profiles";
import { scoreWithProfile } from "./score";

describe("extractFeatures", () => {
  it("parses headers and links from a scam sample", () => {
    const f = extractFeatures(SAMPLE_SCAM);
    expect(f.from.toLowerCase()).toContain("amaz0n");
    expect(f.subject.toLowerCase()).toContain("urgent");
    expect(f.linkCount).toBeGreaterThan(0);
    expect(f.urgencyScore).toBeGreaterThan(0.3);
    expect(f.requestsPersonalInfo).toBe(true);
    expect(f.brandImpersonation).toBe(true);
  });

  it("treats the hydro bill as calmer", () => {
    const f = extractFeatures(SAMPLE_SAFE);
    expect(f.urgencyScore).toBeLessThan(0.34);
    expect(f.requestsPersonalInfo).toBe(false);
  });

  it("flags a vague payment demand as a financial request", () => {
    const f = extractFeatures("make the payment at this.");
    expect(f.financialRequest).toBe(true);
  });
});

describe("vague payment message", () => {
  it("does not mark a bare payment demand as clearly safe on Guardian", () => {
    const scan = analyzeMessage("make the payment at this.");
    expect(scan.results.guardian.verdict).toBe("potential_scam");
    expect(scan.results.guardian.riskScore).toBeGreaterThan(0);
  });
});

describe("dual local models", () => {
  it("flags the obvious scam on both models", () => {
    const scan = analyzeMessage(SAMPLE_SCAM);
    expect(scan.results.guardian.verdict).toBe("potential_scam");
    expect(scan.results.balancer.verdict).toBe("potential_scam");
  });

  it("marks the hydro bill safe on both models", () => {
    const scan = analyzeMessage(SAMPLE_SAFE);
    expect(scan.results.guardian.verdict).toBe("safe");
    expect(scan.results.balancer.verdict).toBe("safe");
  });

  it("disagrees on the borderline delivery notice", () => {
    const features = extractFeatures(SAMPLE_BORDERLINE);
    const guardian = scoreWithProfile(features, MODEL_PROFILES.guardian);
    const balancer = scoreWithProfile(features, MODEL_PROFILES.balancer);
    expect(guardian.riskScore).toBeGreaterThan(balancer.riskScore);
    const scan = analyzeMessage(SAMPLE_BORDERLINE);
    expect(modelsDisagree(scan.results)).toBe(true);
    expect(scan.results.guardian.verdict).toBe("potential_scam");
    expect(scan.results.balancer.verdict).toBe("safe");
  });
});
