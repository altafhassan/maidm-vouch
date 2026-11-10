"use client";

import type { ModelId, ScanRecord } from "@/lib/types";
import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  scans: ScanRecord[];
  primaryModel: ModelId;
  onBack: () => void;
  onOpen: (id: string) => void;
};

export function RecentActivity({ scans, primaryModel, onBack, onOpen }: Props) {
  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-6 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[var(--vouch-navy)]">Recent Activity</h1>
      <p className="mt-1 text-sm text-[var(--vouch-muted)]">Latest scans on this browser.</p>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
        {scans.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--vouch-line)] p-6 text-center text-sm text-[var(--vouch-muted)]">
            No scans yet.
          </p>
        ) : (
          scans.map((s) => {
            const r = s.results[primaryModel];
            const scam = r.verdict === "potential_scam";
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpen(s.id)}
                className="w-full rounded-2xl border border-[var(--vouch-line)] p-4 text-left hover:border-[var(--vouch-blue)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[var(--vouch-navy)]">
                      {s.message.subject || "(no subject)"}
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--vouch-muted)]">
                      {s.message.from}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      scam
                        ? "bg-[var(--vouch-danger-soft)] text-[var(--vouch-danger)]"
                        : "bg-[var(--vouch-safe-soft)] text-[var(--vouch-safe)]"
                    }`}
                  >
                    {scam ? "Scam risk" : "Safe"}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
