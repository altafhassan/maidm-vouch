"use client";

import type { AppStats, ModelId } from "@/lib/types";
import {
  BulbIcon,
  ClipboardIcon,
  ClockIcon,
  CompareIcon,
  GearIcon,
  MessageIcon,
  ShieldCheckIcon,
} from "../ui/Icons";

type Props = {
  name: string;
  tip: string;
  stats: AppStats;
  primaryModel: ModelId;
  engineLabel?: string;
  onScan: () => void;
  onQuarantine: () => void;
  onRecent: () => void;
  onCompare: () => void;
  onSettings: () => void;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Home({
  name,
  tip,
  stats,
  primaryModel,
  engineLabel = "Offline local rules",
  onScan,
  onQuarantine,
  onRecent,
  onCompare,
  onSettings,
}: Props) {
  const actions = [
    {
      title: "Scan a Message",
      desc: "Paste, type or forward a message to check for scams",
      icon: <MessageIcon size={22} />,
      onClick: onScan,
    },
    {
      title: "View Quarantined",
      desc: "Review and categorize flagged messages",
      icon: <ClipboardIcon size={22} />,
      onClick: onQuarantine,
    },
    {
      title: "Recent Activity",
      desc: "See your latest scans and results",
      icon: <ClockIcon size={22} />,
      onClick: onRecent,
    },
    {
      title: "Compare Models",
      desc: "Same message, Guardian vs Balancer scoring",
      icon: <CompareIcon size={22} />,
      onClick: onCompare,
    },
  ];

  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--vouch-blue)]">
          <ShieldCheckIcon size={22} />
          <span className="font-display text-xl font-bold">Vouch</span>
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={onSettings}
          className="rounded-full p-2 text-[var(--vouch-muted)] hover:bg-[#eef3ff]"
        >
          <GearIcon size={20} />
        </button>
      </header>

      <div className="mt-6">
        <h1 className="font-display text-[1.65rem] font-bold leading-tight text-[var(--vouch-navy)]">
          {greeting()}, {name}!
        </h1>
        <p className="mt-1 text-sm text-[var(--vouch-muted)]">You&apos;re one step ahead.</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-3 text-center">
        <div>
          <div className="text-lg font-bold text-[var(--vouch-blue)]">{stats.scansThisWeek}</div>
          <div className="text-[11px] leading-tight text-[var(--vouch-muted)]">Scans this week</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--vouch-danger)]">{stats.potentialScams}</div>
          <div className="text-[11px] leading-tight text-[var(--vouch-muted)]">Potential scams</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--vouch-safe)]">{stats.safeMessages}</div>
          <div className="text-[11px] leading-tight text-[var(--vouch-muted)]">Safe messages</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--vouch-muted)]">
        Active detector:{" "}
        <span className="font-semibold text-[var(--vouch-navy)]">
          {primaryModel === "guardian" ? "Guardian (strict)" : "Balancer (lenient)"}
        </span>
        {" · "}
        <span className="font-semibold text-[var(--vouch-navy)]">{engineLabel}</span>
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {actions.map((a) => (
          <button
            key={a.title}
            type="button"
            onClick={a.onClick}
            className="flex items-start gap-3 rounded-2xl border border-[var(--vouch-line)] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--vouch-blue)] hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[var(--vouch-blue)]">
              {a.icon}
            </span>
            <span>
              <span className="block font-bold text-[var(--vouch-navy)]">{a.title}</span>
              <span className="mt-0.5 block text-sm text-[var(--vouch-muted)]">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div className="flex gap-3 rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-4">
          <span className="text-[var(--vouch-blue)]">
            <BulbIcon size={22} />
          </span>
          <div>
            <div className="text-sm font-bold text-[var(--vouch-navy)]">Tip of the day</div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--vouch-muted)]">{tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
