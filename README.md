# Vouch — Spam & Scam Detector

Classroom prototype. Runs entirely in your browser — **no API keys, no ChatGPT, no paid services**.

## Run on your laptop (from the project root)

Open this repository folder in a terminal. You should see `package.json` and an `src` folder here.

Then run:

```bash
npm install
npm run dev
```

Open the URL Next prints (usually http://localhost:3000).

That is it. **Do not `cd` into any subfolder.**

### If `npm` is missing

Install Node.js LTS from https://nodejs.org then reopen the terminal and run the two commands above again.

### If you are on the wrong branch

Vouch lives on branch `cursor/vouch-scam-detector-b546` until the PR is merged:

```bash
git fetch origin
git checkout cursor/vouch-scam-detector-b546
npm install
npm run dev
```

## What this app does

- Paste a message → Safe / Potential Scam with plain-language reasons
- Two local models with the same inputs: **Guardian** (strict) and **Balancer** (lenient)
- Built-in samples for demos (safe / scam / borderline)
- Report & quarantine feedback stored in the browser

## Deploy on Vercel (share with classmates)

1. Import this repo in Vercel  
2. Leave **Root Directory** as the repository root (do not set it to `vouch`)  
3. Deploy — no environment variables needed  
4. Share the `*.vercel.app` link  

## Other folders in this repo

| Folder | What it is |
| --- | --- |
| *(root)* | **Vouch** — the app you want for class |
| `ethics-of-prediction/` | Separate earlier ethics simulator |
| `ai-life-simulator/` | Earlier life-path demo (archived here) |

## Tests

```bash
npm test
```
