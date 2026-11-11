import { describe, expect, it } from "vitest";
import { formatFeedbackForPrompt, sanitizeFeedbackExamples } from "./feedback";

describe("sanitizeFeedbackExamples", () => {
  it("keeps only valid labeled examples and caps count", () => {
    const cleaned = sanitizeFeedbackExamples([
      { label: "confirmed_scam", from: "a@b.com", subject: "Urgent", body: "Pay now" },
      { label: "nope", from: "x", subject: "y", body: "z" },
      { label: "marked_safe", from: "bank@bank.com", subject: "Statement", body: "Your bill is ready" },
    ]);
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0].label).toBe("confirmed_scam");
    expect(cleaned[1].label).toBe("marked_safe");
  });
});

describe("formatFeedbackForPrompt", () => {
  it("formats labels for the model prompt", () => {
    const text = formatFeedbackForPrompt([
      {
        label: "confirmed_scam",
        from: "evil@x.com",
        subject: "Account",
        body: "Send money now",
      },
    ]);
    expect(text).toContain("USER_LABELED_SCAM");
    expect(text).toContain("Send money now");
  });
});
