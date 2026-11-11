"use client";

import type { ModelId, ModelResult, ScanRecord } from "@/lib/types";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  WarningTriangleIcon,
} from "../ui/Icons";

type Props = {
  scan: ScanRecord;
  viewModel: ModelId;
  onViewModelChange: (id: ModelId) => void;
  onBack: () => void;
  onScanAnother: () => void;
  onReport: () => void;
  onMarkSafe: () => void;
  onOpenCompare: () => void;
  notice?: string | null;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ScanResult({
  scan,
  viewModel,
  onViewModelChange,
  onBack,
  onScanAnother,
  onReport,
  onMarkSafe,
  onOpenCompare,
  notice = null,
}: Props) {
  const result = scan.results[viewModel];
  const other: ModelId = viewModel === "guardian" ? "balancer" : "guardian";
  const disagree = scan.results.guardian.verdict !== scan.results.balancer.verdict;
  const isScam = result.verdict === "potential_scam";
  const engineLabel = scan.engine === "gemini" ? "Gemini" : "Local rules";

  return (
    <div className="screen-enter flex h-full flex-col overflow-y-auto px-5 pb-6 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
        >
          <ArrowLeftIcon size={18} /> Back
        </button>
        <h1 className="font-display text-lg font-bold text-[var(--vouch-navy)]">Scan Result</h1>
        <span className="w-12" />
      </div>

      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--vouch-muted)]">
        Engine: {engineLabel}
      </p>

      {notice && (
        <div className="mb-3 rounded-xl border border-[#f6d6a8] bg-[#fff7eb] px-3 py-2 text-xs text-[var(--vouch-amber)]">
          {notice}
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-[#eef3ff] p-1">
        <ModelTab
          active={viewModel === "guardian"}
          label="Guardian"
          score={scan.results.guardian.riskScore}
          onClick={() => onViewModelChange("guardian")}
        />
        <ModelTab
          active={viewModel === "balancer"}
          label="Balancer"
          score={scan.results.balancer.riskScore}
          onClick={() => onViewModelChange("balancer")}
        />
      </div>

      {disagree && (
        <button
          type="button"
          onClick={onOpenCompare}
          className="mb-3 rounded-xl border border-[#f6d6a8] bg-[#fff7eb] px-3 py-2 text-left text-xs leading-relaxed text-[var(--vouch-amber)]"
        >
          Models disagree on this message ({scan.results.guardian.verdict.replace("_", " ")} vs{" "}
          {scan.results.balancer.verdict.replace("_", " ")}). Tap to compare — useful ethics talking
          point. Viewing {result.modelName}; switch to {scan.results[other].modelName} above.
        </button>
      )}

      {isScam ? (
        <ScamBanner result={result} engineLabel={engineLabel} />
      ) : (
        <SafeBanner result={result} engineLabel={engineLabel} />
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <MetaRow label="From" value={scan.message.from} />
        <MetaRow label="Subject" value={scan.message.subject || "(no subject)"} />
        <MetaRow label="Scanned" value={formatWhen(scan.createdAt)} />
        <MetaRow
          label="Risk score"
          value={`${Math.round(result.riskScore * 100)}% (threshold ${Math.round(result.threshold * 100)}%)`}
        />
      </dl>

      <div className="mt-4 rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
          Message preview
        </div>
        <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--vouch-ink)]">
          {scan.message.body.slice(0, 420)}
          {scan.message.body.length > 420 ? "…" : ""}
        </p>
      </div>

      {isScam ? (
        <div className="mt-5">
          <h2 className="font-display text-lg font-bold text-[var(--vouch-navy)]">
            Why this looks suspicious
          </h2>
          <ol className="mt-3 space-y-3">
            {result.indicators.map((ind, i) => (
              <li key={ind.id} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vouch-danger)] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-bold text-[var(--vouch-navy)]">{ind.label}</span>
                  <span className="mt-0.5 block text-[var(--vouch-muted)]">{ind.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-[var(--vouch-line)] pt-4">
            <h3 className="font-bold text-[var(--vouch-navy)]">Recommendation</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--vouch-muted)]">
              {result.recommendation}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <h2 className="font-display text-lg font-bold text-[var(--vouch-navy)]">
            Why this looks safe
          </h2>
          <ul className="mt-3 space-y-2">
            {result.safeReasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-sm text-[var(--vouch-navy)]">
                <span className="text-[var(--vouch-safe)]">
                  <CheckCircleIcon size={18} />
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {isScam ? (
          <>
            <button type="button" className="btn-danger flex h-auto min-h-12 items-center justify-center gap-2 px-4 py-3" onClick={onReport}>
              <WarningTriangleIcon size={18} />
              <span className="text-left">
                <span className="block">Report &amp; Quarantine</span>
                <span className="block text-xs font-medium opacity-90">
                  Save feedback to improve detection over time
                </span>
              </span>
            </button>
            <button type="button" className="btn-secondary flex h-auto min-h-12 items-center justify-center gap-2 px-4 py-3" onClick={onMarkSafe}>
              <ShieldCheckIcon size={18} />
              <span className="text-left">
                <span className="block">This is a Safe Message</span>
                <span className="block text-xs font-medium text-[var(--vouch-muted)]">
                  Mark false positive and keep learning labels
                </span>
              </span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary h-12 w-full" onClick={onScanAnother}>
              Scan Another Message
            </button>
            <button type="button" className="text-sm font-semibold text-[var(--vouch-danger)]" onClick={onReport}>
              Actually a scam? Report &amp; quarantine
            </button>
          </>
        )}
        {scan.feedback && (
          <p className="text-center text-xs text-[var(--vouch-muted)]">
            Feedback saved locally: {scan.feedback === "confirmed_scam" ? "confirmed scam" : "marked safe"}
          </p>
        )}
      </div>
    </div>
  );
}

function ModelTab({
  active,
  label,
  score,
  onClick,
}: {
  active: boolean;
  label: string;
  score: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
        active ? "bg-white text-[var(--vouch-blue)] shadow-sm" : "text-[var(--vouch-muted)]"
      }`}
    >
      {label} · {Math.round(score * 100)}%
    </button>
  );
}

function SafeBanner({ result, engineLabel }: { result: ModelResult; engineLabel: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--vouch-safe-soft)] p-4">
      <span className="text-[var(--vouch-safe)]">
        <CheckCircleIcon size={28} />
      </span>
      <div>
        <div className="text-lg font-bold text-[var(--vouch-safe)]">Looks Safe</div>
        <p className="text-sm text-[var(--vouch-navy)]">No strong scam indicators detected.</p>
        <p className="mt-1 text-xs text-[var(--vouch-muted)]">
          {result.modelName} · {engineLabel}
        </p>
      </div>
    </div>
  );
}

function ScamBanner({ result, engineLabel }: { result: ModelResult; engineLabel: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--vouch-danger-soft)] p-4">
      <span className="text-[var(--vouch-danger)]">
        <AlertCircleIcon size={28} />
      </span>
      <div>
        <div className="text-lg font-bold text-[var(--vouch-danger)]">Potential Scam</div>
        <p className="text-sm text-[var(--vouch-navy)]">This message has several red flags.</p>
        <p className="mt-1 text-xs text-[var(--vouch-muted)]">
          {result.modelName} · {engineLabel}
        </p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[var(--vouch-muted)]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[var(--vouch-navy)]">{value}</dd>
    </div>
  );
}
