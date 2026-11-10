"use client";

import type { AnalysisEngine, ModelId, UserProfile } from "@/lib/types";
import { ArrowLeftIcon } from "../ui/Icons";

type Props = {
  profile: UserProfile;
  primaryModel: ModelId;
  aiStatus: { engine: AnalysisEngine; configured: boolean; model: string };
  onBack: () => void;
  onNameChange: (name: string) => void;
  onPrimaryModelChange: (id: ModelId) => void;
  onReset: () => void;
};

export function Settings({
  profile,
  primaryModel,
  aiStatus,
  onBack,
  onNameChange,
  onPrimaryModelChange,
  onReset,
}: Props) {
  const live = aiStatus.engine === "gemini" && aiStatus.configured;

  return (
    <div className="screen-enter flex h-full flex-col px-5 pb-6 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vouch-blue)]"
      >
        <ArrowLeftIcon size={18} /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[var(--vouch-navy)]">Settings</h1>

      <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
        Display name
      </label>
      <input
        value={profile.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-[var(--vouch-line)] bg-white px-4 text-sm outline-none focus:border-[var(--vouch-blue)]"
        maxLength={40}
      />

      <div className="mt-6 text-xs font-bold uppercase tracking-wide text-[var(--vouch-muted)]">
        Default policy profile
      </div>
      <div className="mt-2 space-y-2">
        <ModelChoice
          selected={primaryModel === "guardian"}
          title="Guardian (strict)"
          desc="Flags more borderline messages — fewer missed scams, more false alarms."
          onClick={() => onPrimaryModelChange("guardian")}
        />
        <ModelChoice
          selected={primaryModel === "balancer"}
          title="Balancer (lenient)"
          desc="Needs stronger evidence — quieter inbox, higher chance of missing subtle scams."
          onClick={() => onPrimaryModelChange("balancer")}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--vouch-line)] bg-[#f8faff] p-4 text-sm text-[var(--vouch-muted)]">
        <p className="font-semibold text-[var(--vouch-navy)]">
          {live ? `Live Gemini · ${aiStatus.model}` : "Offline local rules"}
        </p>
        <p className="mt-1">
          {live
            ? "GEMINI_API_KEY is configured on the server. Guardian and Balancer use the same Gemini model with different strictness prompts."
            : "No GEMINI_API_KEY found. Scoring uses built-in local heuristics. Add the key in .env.local (laptop) or Vercel env vars (deployed)."}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-auto h-11 text-sm font-semibold text-[var(--vouch-danger)]"
      >
        Clear local scans &amp; feedback
      </button>
    </div>
  );
}

function ModelChoice({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left ${
        selected
          ? "border-[var(--vouch-blue)] bg-[#eef3ff]"
          : "border-[var(--vouch-line)] bg-white"
      }`}
    >
      <div className="font-bold text-[var(--vouch-navy)]">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--vouch-muted)]">{desc}</p>
    </button>
  );
}
