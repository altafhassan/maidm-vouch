"use client";

import type { ModelId, ScanRecord } from "@/lib/types";
import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  scans: ScanRecord[];
  primaryModel: ModelId;
  onBack: () => void;
  onOpen: (id: string) => void;
};

export function Quarantine({ scans, primaryModel, onBack, onOpen }: Props) {
  const items = scans.filter((s) => s.quarantined);

  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-6 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[var(--vouch-navy)]">Quarantined</h1>
      <p className="mt-1 text-sm text-[var(--vouch-muted)]">
        Messages you reported. Feedback stays on this device for the learning-loop story.
      </p>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--vouch-line)] p-6 text-center text-sm text-[var(--vouch-muted)]">
            Nothing quarantined yet. Report a potential scam from a scan result to see it here.
          </p>
        ) : (
          items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpen(s.id)}
              className="w-full rounded-2xl border border-[var(--vouch-line)] p-4 text-left hover:border-[var(--vouch-blue)]"
            >
              <div className="text-sm font-bold text-[var(--vouch-navy)]">
                {s.message.subject || "(no subject)"}
              </div>
              <div className="mt-1 text-xs text-[var(--vouch-muted)]">{s.message.from}</div>
              <div className="mt-2 text-xs font-semibold text-[var(--vouch-danger)]">
                {s.results[primaryModel].verdict === "potential_scam"
                  ? "Flagged"
                  : "User-reported"}{" "}
                · feedback: {s.feedback ?? "none"}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
