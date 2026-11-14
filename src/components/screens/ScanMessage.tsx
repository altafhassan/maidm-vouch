"use client";

import { SAMPLE_BORDERLINE, SAMPLE_SAFE, SAMPLE_SCAM } from "@/lib/samples";
import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onAnalyze: () => void;
  analyzing?: boolean;
  error?: string | null;
};

export function ScanMessage({
  value,
  onChange,
  onBack,
  onAnalyze,
  analyzing = false,
  error = null,
}: Props) {
  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-6 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[var(--vouch-navy)]">Scan a Message</h1>
      <p className="mt-1 text-sm text-[var(--vouch-muted)]">
        Paste an email or text. Include From / Subject lines when you have them.
      </p>

      <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
        Message
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`From: someone@example.com\nSubject: ...\n\nMessage body...`}
        className="mt-2 min-h-[240px] w-full flex-1 resize-none rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-4 text-sm leading-relaxed text-[var(--vouch-ink)] outline-none focus:border-[var(--vouch-blue)]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <SampleChip label="Safe sample" onClick={() => onChange(SAMPLE_SAFE)} />
        <SampleChip label="Scam sample" onClick={() => onChange(SAMPLE_SCAM)} />
        <SampleChip label="Borderline (soft ask)" onClick={() => onChange(SAMPLE_BORDERLINE)} />
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-[var(--vouch-danger-soft)] bg-[var(--vouch-danger-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--vouch-danger)]">
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn-primary mt-4 h-12 w-full disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!value.trim() || analyzing}
        onClick={onAnalyze}
      >
        {analyzing ? "Analyzing with Gemini…" : "Analyze Message"}
      </button>
    </div>
  );
}

function SampleChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--vouch-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--vouch-navy)] hover:border-[var(--vouch-blue)] hover:text-[var(--vouch-blue)]"
    >
      {label}
    </button>
  );
}
