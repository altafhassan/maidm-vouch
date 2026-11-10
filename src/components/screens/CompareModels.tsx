"use client";

import type { ScanRecord } from "@/lib/types";
import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  scan: ScanRecord | null;
  onBack: () => void;
  onScanFirst: () => void;
};

export function CompareModels({ scan, onBack, onScanFirst }: Props) {
  return (
    <div className="screen-enter flex h-full flex-col overflow-y-auto px-5 pb-6 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[var(--vouch-navy)]">Compare Models</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--vouch-muted)]">
        Same message. Same extracted features. Two local scoring policies — so your presentation can
        show how model choice alone can shift outcomes.
      </p>

      {!scan ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--vouch-line)] p-6 text-center">
          <p className="text-sm text-[var(--vouch-muted)]">Scan a message first to compare scores.</p>
          <button type="button" className="btn-primary mt-4 h-11 px-5" onClick={onScanFirst}>
            Scan a Message
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-4 text-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
              Shared input
            </div>
            <p className="mt-2 font-semibold text-[var(--vouch-navy)]">{scan.message.subject}</p>
            <p className="mt-1 text-[var(--vouch-muted)]">From: {scan.message.from}</p>
          </div>

          <div className="grid gap-3">
            <ModelCard result={scan.results.guardian} />
            <ModelCard result={scan.results.balancer} />
          </div>

          {scan.results.guardian.verdict !== scan.results.balancer.verdict ? (
            <div className="rounded-2xl border border-[#f6d6a8] bg-[#fff7eb] p-4 text-sm text-[var(--vouch-amber)]">
              <strong>Ethics note:</strong> the models disagree. Ask: who is harmed by a false
              positive vs a false negative? Should the product default to the stricter policy?
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--vouch-line)] bg-white p-4 text-sm text-[var(--vouch-muted)]">
              Both models agree on this sample. Try the <em>Borderline</em> sample on the scan screen
              to increase the chance of a split verdict.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelCard({
  result,
}: {
  result: ScanRecord["results"]["guardian"];
}) {
  const scam = result.verdict === "potential_scam";
  return (
    <div className="rounded-2xl border border-[var(--vouch-line)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-bold text-[var(--vouch-navy)]">
            {result.modelName}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--vouch-muted)]">{result.modelBlurb}</p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            scam
              ? "bg-[var(--vouch-danger-soft)] text-[var(--vouch-danger)]"
              : "bg-[var(--vouch-safe-soft)] text-[var(--vouch-safe)]"
          }`}
        >
          {scam ? "Potential scam" : "Safe"}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-semibold text-[var(--vouch-muted)]">
          <span>Risk score</span>
          <span>{Math.round(result.riskScore * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e8eef8]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(result.riskScore * 100)}%`,
              background: scam ? "var(--vouch-danger)" : "var(--vouch-safe)",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--vouch-muted)]">
          Threshold {Math.round(result.threshold * 100)}% · {result.indicators.length} indicator
          {result.indicators.length === 1 ? "" : "s"} listed
        </p>
      </div>
    </div>
  );
}
