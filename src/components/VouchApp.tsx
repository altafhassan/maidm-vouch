"use client";

import { buildFeedbackExamples } from "@/lib/feedbackExamples";
import { TIPS } from "@/lib/samples";
import {
  computeStats,
  loadPrimaryModel,
  loadProfile,
  loadScans,
  newId,
  savePrimaryModel,
  saveProfile,
  saveScans,
} from "@/lib/storage";
import type { AnalysisEngine, ModelId, ScanRecord, UserProfile } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { CompareModels } from "./screens/CompareModels";
import { Home } from "./screens/Home";
import { LearnMore } from "./screens/LearnMore";
import { Onboarding } from "./screens/Onboarding";
import { Quarantine } from "./screens/Quarantine";
import { RecentActivity } from "./screens/RecentActivity";
import { ScanMessage } from "./screens/ScanMessage";
import { ScanResult } from "./screens/ScanResult";
import { Settings } from "./screens/Settings";

type Screen =
  | "onboarding"
  | "learn"
  | "home"
  | "scan"
  | "result"
  | "quarantine"
  | "recent"
  | "compare"
  | "settings";

type AiStatus = {
  engine: AnalysisEngine;
  configured: boolean;
  model: string;
};

export function VouchApp() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [profile, setProfile] = useState<UserProfile>({ name: "Christine", onboarded: false });
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [primaryModel, setPrimaryModel] = useState<ModelId>("guardian");
  const [draft, setDraft] = useState("");
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [viewModel, setViewModel] = useState<ModelId>("guardian");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    engine: "local",
    configured: false,
    model: "unset",
  });

  const [tip] = useState(() => TIPS[0]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const p = loadProfile();
      const loadedScans = loadScans();
      const model = loadPrimaryModel();
      setProfile(p.name ? p : { name: "Christine", onboarded: p.onboarded });
      setScans(loadedScans);
      setPrimaryModel(model);
      setViewModel(model);
      setScreen(p.onboarded ? "home" : "onboarding");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data: AiStatus) => {
        if (data?.engine) setAiStatus(data);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const stats = useMemo(
    () => computeStats(scans, primaryModel),
    [scans, primaryModel]
  );

  const feedbackCount = useMemo(
    () => scans.filter((s) => s.feedback === "confirmed_scam" || s.feedback === "marked_safe").length,
    [scans]
  );

  const activeScan = scans.find((s) => s.id === activeScanId) ?? null;

  function persistScans(next: ScanRecord[]) {
    setScans(next);
    saveScans(next);
  }

  function persistProfile(next: UserProfile) {
    setProfile(next);
    saveProfile(next);
  }

  function start() {
    persistProfile({ ...profile, onboarded: true, name: profile.name || "Christine" });
    setScreen("home");
  }

  async function runAnalyze() {
    if (!draft.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const feedbackExamples = buildFeedbackExamples(scans);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft,
          primaryModel,
          feedbackExamples,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setAiStatus({
          engine: data.status.configured ? "gemini" : "local",
          configured: Boolean(data.status.configured),
          model: data.status.model || "unset",
        });
      }
      if (!res.ok) {
        throw new Error(data?.error || "Analysis failed.");
      }
      if (data.engine !== "gemini" || !data.analysis) {
        throw new Error("Unexpected analyze response.");
      }

      const record: ScanRecord = {
        ...data.analysis,
        engine: "gemini",
        id: newId(),
        createdAt: new Date().toISOString(),
        quarantined: false,
        feedback: null,
      };
      persistScans([record, ...scans]);
      setActiveScanId(record.id);
      setViewModel(primaryModel);
      setScreen("result");
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : "Analysis failed.");
      setScreen("scan");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateActive(mutator: (scan: ScanRecord) => ScanRecord) {
    if (!activeScanId) return;
    const next = scans.map((s) => (s.id === activeScanId ? mutator(s) : s));
    persistScans(next);
  }

  function reportQuarantine() {
    updateActive((s) => ({
      ...s,
      quarantined: true,
      feedback: "confirmed_scam",
    }));
  }

  function markSafe() {
    updateActive((s) => ({
      ...s,
      quarantined: false,
      feedback: "marked_safe",
    }));
  }

  function openScan(id: string) {
    setActiveScanId(id);
    setViewModel(primaryModel);
    setAnalyzeError(null);
    setScreen("result");
  }

  function resetLocal() {
    persistScans([]);
    setActiveScanId(null);
    setDraft("");
    setAnalyzeError(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--vouch-muted)]">
        Loading Vouch…
      </div>
    );
  }

  return (
    <div className="phone-shell mx-auto flex flex-col">
      {screen === "onboarding" && (
        <Onboarding onGetStarted={start} onLearnMore={() => setScreen("learn")} />
      )}
      {screen === "learn" && (
        <LearnMore onBack={() => setScreen(profile.onboarded ? "home" : "onboarding")} />
      )}
      {screen === "home" && (
        <Home
          name={profile.name || "there"}
          tip={tip}
          stats={stats}
          primaryModel={primaryModel}
          engineLabel={
            aiStatus.configured
              ? `Live Gemini (${aiStatus.model}) · ${feedbackCount} feedback label${feedbackCount === 1 ? "" : "s"}`
              : "Gemini not configured"
          }
          onScan={() => {
            setAnalyzeError(null);
            setScreen("scan");
          }}
          onQuarantine={() => setScreen("quarantine")}
          onRecent={() => setScreen("recent")}
          onCompare={() => setScreen("compare")}
          onSettings={() => setScreen("settings")}
        />
      )}
      {screen === "scan" && (
        <ScanMessage
          value={draft}
          onChange={setDraft}
          onBack={() => setScreen("home")}
          onAnalyze={runAnalyze}
          analyzing={analyzing}
          error={analyzeError}
        />
      )}
      {screen === "result" && activeScan && (
        <ScanResult
          scan={activeScan}
          viewModel={viewModel}
          onViewModelChange={setViewModel}
          onBack={() => setScreen("home")}
          onScanAnother={() => {
            setDraft("");
            setAnalyzeError(null);
            setScreen("scan");
          }}
          onReport={reportQuarantine}
          onMarkSafe={markSafe}
          onOpenCompare={() => setScreen("compare")}
        />
      )}
      {screen === "quarantine" && (
        <Quarantine
          scans={scans}
          primaryModel={primaryModel}
          onBack={() => setScreen("home")}
          onOpen={openScan}
        />
      )}
      {screen === "recent" && (
        <RecentActivity
          scans={scans}
          primaryModel={primaryModel}
          onBack={() => setScreen("home")}
          onOpen={openScan}
        />
      )}
      {screen === "compare" && (
        <CompareModels
          scan={activeScan}
          onBack={() => setScreen(activeScan ? "result" : "home")}
          onScanFirst={() => setScreen("scan")}
        />
      )}
      {screen === "settings" && (
        <Settings
          profile={profile}
          primaryModel={primaryModel}
          aiStatus={aiStatus}
          feedbackCount={feedbackCount}
          onBack={() => setScreen("home")}
          onNameChange={(name) => persistProfile({ ...profile, name })}
          onPrimaryModelChange={(id) => {
            setPrimaryModel(id);
            savePrimaryModel(id);
            setViewModel(id);
          }}
          onReset={resetLocal}
        />
      )}
    </div>
  );
}
