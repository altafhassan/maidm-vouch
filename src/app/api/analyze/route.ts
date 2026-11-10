import { getGeminiConfig, getPublicAiStatus } from "@/lib/ai/config";
import { analyzeWithGemini } from "@/lib/ai/gemini";
import { analyzeMessage } from "@/lib/models";
import { extractFeatures } from "@/lib/extract";
import type { ModelId } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  message?: string;
  primaryModel?: ModelId;
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

  try {
    if (getGeminiConfig().configured) {
      const features = extractFeatures(message);
      const gemini = await analyzeWithGemini(message);
      return Response.json({
        engine: "gemini",
        status,
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
    }

    const local = analyzeMessage(message, primaryModel);
    return Response.json({
      engine: "local",
      status,
      analysis: local,
    });
  } catch (error) {
    const local = analyzeMessage(message, primaryModel);
    return Response.json({
      engine: "local",
      status: { ...status, configured: false, engine: "local", model: "local-rules" },
      fallbackReason:
        error instanceof Error ? error.message : "Gemini request failed; used local rules.",
      analysis: local,
    });
  }
}
