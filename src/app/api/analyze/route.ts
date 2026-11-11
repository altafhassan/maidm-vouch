import { getGeminiConfig, getPublicAiStatus } from "@/lib/ai/config";
import { sanitizeFeedbackExamples } from "@/lib/ai/feedback";
import { analyzeWithGemini } from "@/lib/ai/gemini";
import { extractFeatures } from "@/lib/extract";
import type { ModelId } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  message?: string;
  primaryModel?: ModelId;
  feedbackExamples?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 12000) {
    return Response.json({ error: "Message is too long." }, { status: 400 });
  }

  const primaryModel: ModelId =
    body.primaryModel === "balancer" ? "balancer" : "guardian";
  const status = getPublicAiStatus();
  const feedbackExamples = sanitizeFeedbackExamples(body.feedbackExamples);

  if (!getGeminiConfig().configured) {
    return Response.json(
      {
        error:
          "GEMINI_API_KEY is not configured. Add it in .env.local or Vercel Environment Variables, then redeploy.",
        status,
      },
      { status: 503 }
    );
  }

  try {
    const features = extractFeatures(message);
    const gemini = await analyzeWithGemini(message, feedbackExamples);
    console.info(
      "[vouch/analyze] engine=gemini model=%s feedback=%d",
      gemini.model,
      gemini.feedbackCount
    );
    return Response.json({
      engine: "gemini",
      status,
      feedbackCount: gemini.feedbackCount,
      analysis: {
        message: {
          from: features.from,
          subject: features.subject,
          body: features.body,
          raw: features.raw,
        },
        features,
        results: {
          guardian: gemini.guardian,
          balancer: gemini.balancer,
        },
        primaryModel,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Gemini request failed.";
    console.error("[vouch/analyze] engine=gemini error=%s", reason);
    return Response.json(
      {
        error: `Gemini failed: ${reason}`,
        status,
      },
      { status: 502 }
    );
  }
}
