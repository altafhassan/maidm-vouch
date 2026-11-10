"use client";

import { ShieldCheckIcon } from "../ui/Icons";

type Props = {
  onGetStarted: () => void;
  onLearnMore: () => void;
};

export function Onboarding({ onGetStarted, onLearnMore }: Props) {
  return (
    <div className="screen-enter flex h-full flex-col px-6 pb-8 pt-14">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="pulse-dot mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--vouch-blue)] text-white shadow-[0_16px_40px_rgba(30,94,255,0.35)]">
          <ShieldCheckIcon size={44} />
        </div>
        <h1 className="font-display text-5xl font-bold text-[var(--vouch-blue)]">Vouch</h1>
        <p className="mt-2 text-lg font-semibold text-[var(--vouch-navy)]">
          Spam &amp; Scam Detector
        </p>
        <p className="mt-5 max-w-[18rem] text-[15px] leading-relaxed text-[var(--vouch-muted)]">
          Check messages, emails and calls for potential scams with on-device AI-style analysis.
          Stay informed. Stay safe.
        </p>
        <div className="mt-8 flex items-center gap-2" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[var(--vouch-blue)]" />
          <span className="h-2 w-2 rounded-full bg-[#c5d0e4]" />
          <span className="h-2 w-2 rounded-full bg-[#c5d0e4]" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" className="btn-primary h-12 w-full" onClick={onGetStarted}>
          Get Started
        </button>
        <button type="button" className="btn-secondary h-12 w-full" onClick={onLearnMore}>
          Learn More
        </button>
      </div>
    </div>
  );
}
