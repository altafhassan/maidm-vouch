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
          Vouch is a classroom prototype of a spam and scam detector. It runs entirely in your
          browser — no API keys, no cloud model calls, and no paid services.
        </p>
        <p>
          When you paste a message, Vouch extracts signals from your design (urgency, suspicious
          links, brand impersonation, requests for personal or financial information, sender
          mismatch, and more). Two built-in local models — <strong>Guardian</strong> (strict) and{" "}
          <strong>Balancer</strong> (lenient) — score the same features with different weights.
        </p>
        <p>
          That dual scoring lets your team show an ethics point: given identical input and the same
          feature set, different model choices can produce different risk scores and verdicts.
        </p>
        <p>
          User feedback (“Report &amp; Quarantine” / “Mark as Safe”) is stored locally so you can
          describe a learning loop in your presentation without training a real neural network.
        </p>
      </div>
    </div>
  );
}
