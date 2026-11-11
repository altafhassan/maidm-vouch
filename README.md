# Vouch — Spam & Scam Detector

Classroom prototype. Scans use **Gemini only** (Guardian vs Balancer policies). User Report / Mark Safe labels are fed into later prompts as few-shot examples.

## Required setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
# optional override (default: gemini-3.8-flash)
# GEMINI_MODEL=gemini-3.8-flash
```

```bash
npm run dev
```

Open http://localhost:3000

Without `GEMINI_API_KEY`, scans return an error (no local-rules fallback).

## What it does

- Paste a message → Gemini scores with **Guardian** (strict) and **Balancer** (lenient)
- Report & Quarantine / Mark Safe stores labels in the browser
- Later scans send those labels to Gemini as few-shot guidance
- Compare view highlights policy disagreement for ethics discussion

## Deploy on Vercel

1. Import `maidm-vouch`
2. Framework: Next.js · Root Directory: blank
3. Environment variable: `GEMINI_API_KEY`
4. Deploy / Redeploy after changing env vars

## Tests

```bash
npm test
```

## Notes

- Demo only — not a guarantee of safety
- Feedback labels stay in the browser (`localStorage`), not a shared server DB
- Do not paste real passwords or sensitive personal data
