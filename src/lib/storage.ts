"use client";

import type { AppStats, ModelId, ScanRecord, UserProfile } from "./types";

const PROFILE_KEY = "vouch.profile.v1";
const SCANS_KEY = "vouch.scans.v1";
const PRIMARY_MODEL_KEY = "vouch.primaryModel.v1";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadProfile(): UserProfile {
  if (!canUseStorage()) return { name: "Guest", onboarded: false };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: "Guest", onboarded: false };
    return JSON.parse(raw) as UserProfile;
  } catch {
    return { name: "Guest", onboarded: false };
  }
}

export function saveProfile(profile: UserProfile) {
  if (!canUseStorage()) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadScans(): ScanRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(SCANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScans(scans: ScanRecord[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans.slice(0, 100)));
}

export function loadPrimaryModel(): ModelId {
  if (!canUseStorage()) return "guardian";
  const v = localStorage.getItem(PRIMARY_MODEL_KEY);
  return v === "balancer" ? "balancer" : "guardian";
}

export function savePrimaryModel(model: ModelId) {
  if (!canUseStorage()) return;
  localStorage.setItem(PRIMARY_MODEL_KEY, model);
}

export function computeStats(scans: ScanRecord[], primary: ModelId): AppStats {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = scans.filter((s) => new Date(s.createdAt).getTime() >= weekAgo);
  let potentialScams = 0;
  let safeMessages = 0;
  for (const s of recent) {
    const verdict = s.results[primary]?.verdict;
    if (verdict === "potential_scam") potentialScams += 1;
    else safeMessages += 1;
  }
  return {
    scansThisWeek: recent.length,
    potentialScams,
    safeMessages,
  };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
