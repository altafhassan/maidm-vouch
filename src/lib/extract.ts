import type { ExtractedFeatures } from "./types";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const EMAIL_FROM_RE =
  /(?:^|\n)\s*(?:from|sender)\s*:\s*(.+?)(?:\n|$)/i;
const SUBJECT_RE =
  /(?:^|\n)\s*(?:subject|subj)\s*:\s*(.+?)(?:\n|$)/i;
const DATE_RE = /(?:^|\n)\s*(?:date|sent)\s*:\s*(.+?)(?:\n|$)/i;

const URGENCY_PATTERNS = [
  /\burgent\b/i,
  /\bimmediately\b/i,
  /\bact now\b/i,
  /\bwithin\s+\d+\s*(hours?|hrs?|minutes?|mins?|days?)\b/i,
  /\baccount\s+(will be|is being)\s+(suspended|locked|closed)\b/i,
  /\bfinal notice\b/i,
  /\blimited time\b/i,
  /\bverify (now|immediately|within)\b/i,
  /\baction required\b/i,
  /\brespond (asap|immediately)\b/i,
];

const PERSONAL_INFO_PATTERNS = [
  /\bpassword\b/i,
  /\bssn\b|\bsocial security\b/i,
  /\bdate of birth\b|\bdob\b/i,
  /\bcredit card\b|\bcvv\b/i,
  /\bbank (account|routing)\b/i,
  /\blog[\s-]?in (details|credentials|information)\b/i,
  /\bverify your (identity|account|information)\b/i,
  /\bconfirm your (password|pin|credentials)\b/i,
  /\bone[- ]time (code|password|pin)\b/i,
];

const FINANCIAL_PATTERNS = [
  /\bwire transfer\b/i,
  /\bgift card\b/i,
  /\bcrypto(currency)?\b|\bbitcoin\b|\busdt\b/i,
  /\bsend (money|payment|funds)\b/i,
  /\bpay (now|immediately|today)\b/i,
  /\binvoice attached\b/i,
  /\brefund\b.*\b(click|claim|process)\b/i,
  /\bunusual (activity|transaction)\b/i,
];

const BRANDS: { name: string; domains: string[] }[] = [
  { name: "amazon", domains: ["amazon.com", "amazon.ca"] },
  { name: "paypal", domains: ["paypal.com"] },
  { name: "apple", domains: ["apple.com", "icloud.com"] },
  { name: "microsoft", domains: ["microsoft.com", "office.com", "live.com"] },
  { name: "google", domains: ["google.com", "gmail.com"] },
  { name: "netflix", domains: ["netflix.com"] },
  { name: "bc hydro", domains: ["bchydro.com"] },
  { name: "canada post", domains: ["canadapost-postescanada.ca", "canadapost.ca"] },
  { name: "cra", domains: ["canada.ca", "cra-arc.gc.ca"] },
  { name: "td", domains: ["td.com"] },
  { name: "rbc", domains: ["rbc.com"] },
  { name: "scotia", domains: ["scotiabank.com"] },
];

const LOOKALIKE_CHARS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
};

function normalizeLookalike(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((ch) => LOOKALIKE_CHARS[ch] ?? ch)
    .join("");
}

function extractDomain(emailOrUrl: string): string | null {
  const emailMatch = emailOrUrl.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch) return emailMatch[1].toLowerCase();
  try {
    const withProto = /^https?:\/\//i.test(emailOrUrl)
      ? emailOrUrl
      : `https://${emailOrUrl}`;
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isBrandDomain(domain: string, official: string[]): boolean {
  return official.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
}

function detectBrandImpersonation(text: string, from: string, links: string[]): boolean {
  const hay = `${from}\n${text}`.toLowerCase();
  const fromDomain = extractDomain(from);

  for (const brand of BRANDS) {
    const mentionsBrand =
      hay.includes(brand.name) ||
      normalizeLookalike(hay).includes(normalizeLookalike(brand.name));
    if (!mentionsBrand) continue;

    const senderOk =
      fromDomain != null && isBrandDomain(fromDomain, brand.domains);
    const linkOk = links.some((link) => {
      const d = extractDomain(link);
      return d != null && isBrandDomain(d, brand.domains);
    });

    const lookalikeSender =
      fromDomain != null &&
      !senderOk &&
      normalizeLookalike(fromDomain).includes(normalizeLookalike(brand.name.replace(/\s+/g, "")));

    const lookalikeLink = links.some((link) => {
      const d = extractDomain(link);
      if (!d) return false;
      if (isBrandDomain(d, brand.domains)) return false;
      return normalizeLookalike(d).includes(
        normalizeLookalike(brand.name.replace(/\s+/g, ""))
      );
    });

    if ((lookalikeSender || lookalikeLink) && !(senderOk && (links.length === 0 || linkOk))) {
      return true;
    }
    if (mentionsBrand && fromDomain && !senderOk && (links.length === 0 || !linkOk)) {
      // Mentions brand but sender/links aren't official
      if (lookalikeSender || lookalikeLink || links.length > 0) return true;
    }
  }
  return false;
}

function suspiciousSender(from: string): boolean {
  if (!from.trim()) return false;
  const domain = extractDomain(from);
  if (!domain) return /support|secure|account|verify|billing/i.test(from);
  if (/\d/.test(domain.split(".")[0] ?? "")) return true;
  if (/-(secure|login|verify|account|support)\./i.test(domain)) return true;
  if (/\.(ru|tk|ml|ga|cf|gq|top|xyz|zip|mov)\b/i.test(domain)) return true;
  return false;
}

function displayNameMismatch(from: string): boolean {
  // "Amazon Support" <not-amazon@evil.com>
  const match = from.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (!match) return false;
  const display = match[1].toLowerCase();
  const email = match[2].toLowerCase();
  const domain = extractDomain(email);
  if (!domain) return false;
  for (const brand of BRANDS) {
    if (display.includes(brand.name) && !isBrandDomain(domain, brand.domains)) {
      return true;
    }
  }
  return false;
}

function grammarIssues(text: string): boolean {
  const clues = [
    /\byou account\b/i,
    /\bkindly\b.*\b(click|verify|confirm)\b/i,
    /\bdear customer\b/i,
    /\bvalued customer\b/i,
    /\bclick here\s+click here\b/i,
    /!!!+/,
    /\bcongratulations you (have|won)\b/i,
  ];
  return clues.filter((r) => r.test(text)).length >= 1;
}

function scoreUrgency(text: string): number {
  const hits = URGENCY_PATTERNS.reduce(
    (n, re) => n + (re.test(text) ? 1 : 0),
    0
  );
  return Math.min(1, hits / 3);
}

function stripHeaders(raw: string, from: string, subject: string): string {
  let body = raw;
  if (from) body = body.replace(EMAIL_FROM_RE, "\n");
  if (subject) body = body.replace(SUBJECT_RE, "\n");
  body = body.replace(DATE_RE, "\n");
  return body.trim();
}

export function extractFeatures(rawInput: string): ExtractedFeatures {
  const raw = rawInput.trim();
  const fromMatch = raw.match(EMAIL_FROM_RE);
  const subjectMatch = raw.match(SUBJECT_RE);
  const from = (fromMatch?.[1] ?? "").trim();
  const subject = (subjectMatch?.[1] ?? "").trim();
  const body = stripHeaders(raw, from, subject) || raw;
  const links = Array.from(body.matchAll(URL_RE)).map((m) => m[0]);
  const combined = `${subject}\n${from}\n${body}`;

  const channel: ExtractedFeatures["channel"] =
    from.includes("@") || subject ? "email" : links.length || raw.length < 320 ? "sms" : "unknown";

  return {
    subject: subject || (body.split("\n")[0] ?? "").slice(0, 80),
    from: from || "Unknown sender",
    body,
    raw,
    links,
    linkCount: links.length,
    hasAttachmentCue: /\b(attachment|attached|see attached|\.exe|\.zip|\.scr)\b/i.test(combined),
    urgencyScore: scoreUrgency(combined),
    requestsPersonalInfo: PERSONAL_INFO_PATTERNS.some((r) => r.test(combined)),
    financialRequest: FINANCIAL_PATTERNS.some((r) => r.test(combined)),
    brandImpersonation: detectBrandImpersonation(combined, from, links),
    suspiciousSender: suspiciousSender(from),
    displayNameMismatch: displayNameMismatch(from),
    grammarIssues: grammarIssues(combined),
    channel,
  };
}
