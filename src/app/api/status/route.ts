import { getPublicAiStatus } from "@/lib/ai/config";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(getPublicAiStatus());
}
