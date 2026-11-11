import type { ScanRecord } from "./types";
import type { FeedbackExample } from "./ai/feedback";

/** Build few-shot examples from user Report/Mark Safe actions. */
export function buildFeedbackExamples(scans: ScanRecord[], limit = 6): FeedbackExample[] {
  const labeled = scans.filter(
    (s) => s.feedback === "confirmed_scam" || s.feedback === "marked_safe"
  );
  return labeled.slice(0, limit).map((s) => ({
    label: s.feedback as "confirmed_scam" | "marked_safe",
    from: s.message.from,
    subject: s.message.subject,
    body: s.message.body,
  }));
}
