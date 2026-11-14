"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheckIcon } from "../ui/Icons";

type Props = {
  onGetStarted: (name: string) => void;
  onLearnMore: () => void;
};

export function Onboarding({ onGetStarted, onLearnMore }: Props) {
  const [askingName, setAskingName] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!askingName) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [askingName]);

  function submitName() {
    const cleaned = name.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      setError("Please enter your name.");
      inputRef.current?.focus();
      return;
    }
    onGetStarted(cleaned.slice(0, 40));
  }

  return (
    <div className="relative flex h-full flex-col px-6 pb-8 pt-14">
      <div className="screen-enter flex flex-1 flex-col">
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
          <button
            type="button"
            className="btn-primary h-12 w-full"
            onClick={() => {
              setError(null);
              setAskingName(true);
            }}
          >
            Get Started
          </button>
          <button type="button" className="btn-secondary h-12 w-full" onClick={onLearnMore}>
            Learn More
          </button>
        </div>
      </div>

      {askingName && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center bg-[rgba(15,28,63,0.45)] px-4 pb-6 pt-10 sm:items-center sm:pb-10"
          role="presentation"
          onClick={() => setAskingName(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_20px_50px_rgba(15,28,63,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="font-display text-xl font-bold text-[var(--vouch-navy)]">
              What should we call you?
            </h2>
            <p className="mt-1 text-sm text-[var(--vouch-muted)]">
              Your name is saved only on this device for the home greeting.
            </p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
              Name
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitName();
              }}
              placeholder="e.g. Alex"
              maxLength={40}
              autoComplete="nickname"
              className="mt-2 h-12 w-full rounded-xl border border-[var(--vouch-line)] bg-[#f8faff] px-4 text-sm outline-none focus:border-[var(--vouch-blue)]"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-[var(--vouch-danger)]">{error}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-secondary h-11 flex-1"
                onClick={() => setAskingName(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary h-11 flex-1" onClick={submitName}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
