"use client";

import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  onBack: () => void;
};

export function LearnMore({ onBack }: Props) {
  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-8 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-3xl font-bold text-[var(--vouch-navy)]">How Vouch works</h1>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[var(--vouch-muted)]">
        <p>
          Vouch is a classroom prototype of a spam and scam detector. Scans are powered by{" "}
          <strong>Gemini</strong>. Without a configured API key, analysis will not run.
        </p>
        <p>
          Each message is scored twice with the same Gemini model and parameters, but different
          policy prompts: <strong>Guardian</strong> (strict) and <strong>Balancer</strong>{" "}
          (lenient). That supports an ethics discussion about disagreement under identical inputs.
        </p>
        <p>
          When you tap <strong>Report &amp; Quarantine</strong> or <strong>Mark as Safe</strong>,
          those labels stay in this browser and are included in later Gemini prompts as few-shot
          examples, so similar future messages can be judged more consistently.
        </p>
      </div>
    </div>
  );
}
