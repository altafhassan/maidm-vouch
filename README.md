# Vouch — Spam & Scam Detector

Classroom prototype for an ethics course. Check messages/emails for scam signals with **two scoring policies** (Guardian vs Balancer).

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — only if using Gemini
npm run dev
```

Open the URL Next prints (usually http://localhost:3000).

### Offline mode (default)
If `GEMINI_API_KEY` is empty, Vouch uses built-in local rules. No paid services required.

### Live Gemini mode (optional)
1. Get a key from https://aistudio.google.com/apikey  
2. Put it in `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0.2
```

3. Restart `npm run dev`  
4. Settings should show **Live Gemini**

Never commit `.env.local` or paste the key into chat/GitHub.

## What it does

- Paste a message → **Safe** or **Potential Scam** with plain-language reasons
- Two policies, same input:
  - **Guardian** (strict)
  - **Balancer** (lenient)
- Built-in samples: safe / scam / borderline
- Report & quarantine feedback stored in the browser

## Deploy on Vercel

1. Import the `maidm-vouch` GitHub/Origin repo
2. Framework: Next.js · Root Directory: blank
3. Add env var **only if using Gemini**:
   - `GEMINI_API_KEY` = your key
   - optional: `GEMINI_MODEL=gemini-2.0-flash`
4. Deploy and share the `*.vercel.app` URL

Without the env var, the deployed site stays on offline local rules.

## Tests

```bash
npm test
```

## Notes

- Demo only — not a guarantee of safety
- Do not paste real passwords or sensitive personal data
