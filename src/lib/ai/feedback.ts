export type FeedbackExample = {
  label: "confirmed_scam" | "marked_safe";
  from: string;
  subject: string;
  body: string;
};

const MAX_EXAMPLES = 6;
const MAX_BODY_CHARS = 500;

export function sanitizeFeedbackExamples(input: unknown): FeedbackExample[] {
  if (!Array.isArray(input)) return [];
  const out: FeedbackExample[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const label = item.label;
    if (label !== "confirmed_scam" && label !== "marked_safe") continue;
    const from = typeof item.from === "string" ? item.from.trim() : "";
    const subject = typeof item.subject === "string" ? item.subject.trim() : "";
    const body = typeof item.body === "string" ? item.body.trim() : "";
    if (!body && !subject) continue;
    out.push({
      label,
      from: from.slice(0, 120) || "Unknown sender",
      subject: subject.slice(0, 160) || "(no subject)",
      body: body.slice(0, MAX_BODY_CHARS),
    });
    if (out.length >= MAX_EXAMPLES) break;
  }
  return out;
}

export function formatFeedbackForPrompt(examples: FeedbackExample[]): string {
  if (examples.length === 0) {
    return "No user-labeled feedback examples yet.";
  }
  return examples
    .map((ex, i) => {
      const tag = ex.label === "confirmed_scam" ? "USER_LABELED_SCAM" : "USER_LABELED_SAFE";
      return `Example ${i + 1} [${tag}]
From: ${ex.from}
Subject: ${ex.subject}
Body:
${ex.body}`;
    })
    .join("\n\n");
}
