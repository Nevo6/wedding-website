# Deployment Guide

This site is split into two pieces:

- **Frontend** (`index.html`, `registry.html`, `static/`) — static files, hosted on **GitHub Pages**, served at `caramucci.com`.
- **Backend** (`backend/`) — a small Flask API hosted on **Render**, served at `api.caramucci.com`. Handles RSVP/donation submissions, emails (via Gmail SMTP), and data storage (Google Sheets).

The `backend/` folder is gitignored in this repo (it's not part of the public Pages site). Push it as its **own, separate (private) GitHub repo** for Render to deploy from.

---

## 1. Google Sheets storage

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project (e.g. "wedding-website").
2. Enable the **Google Sheets API** for that project.
3. Create a **Service Account** (IAM & Admin → Service Accounts), then create a JSON key for it and download it.
4. Create a new Google Sheet (e.g. "Wedding RSVPs & Donations"). Open it and click **Share** — share it with the service account's email address (looks like `something@project.iam.gserviceaccount.com`) with **Editor** access.
5. Copy the Sheet ID from its URL: `https://docs.google.com/spreadsheets/d/`**`<SHEET_ID>`**`/edit`.
6. The backend will automatically create `RSVPs` and `Donations` tabs (with headers) the first time it writes to the sheet.

You'll need:
- `GOOGLE_SERVICE_ACCOUNT_JSON` — the entire contents of the downloaded JSON key file, as a single-line string.
- `GOOGLE_SHEET_ID` — from step 5.

---

## 2. Gmail SMTP (sal.caramucci@gmail.com)

1. Go to your [Google Account → Security](https://myaccount.google.com/security).
2. Make sure **2-Step Verification** is turned ON (App Passwords won't appear otherwise).
3. Search for **App passwords**, create a new one named e.g. "Wedding Backend".
4. Copy the 16-character password (no spaces) — this is `SMTP_PASS`.

---

## 3. Render (backend hosting)

1. Push the `backend/` folder as its own Git repo (private is fine) to GitHub.
2. In [Render](https://render.com/), create a new **Web Service** from that repo.
3. Build command: leave default (Render detects `requirements.txt`). Start command: `gunicorn backend:app` (from the `Procfile`).
4. Add these **Environment Variables** (see `backend/.env.example`):

   | Variable | Value |
   |---|---|
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `sal.caramucci@gmail.com` |
   | `SMTP_PASS` | *(16-char app password from step 2)* |
   | `EMAIL_FROM` | `sal.caramucci@gmail.com` |
   | `EMAIL_TO_HOST` | `sal.caramucci@gmail.com` |
   | `EMAIL_OVERRIDE_LOG` | `sal.caramucci@gmail.com` |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | *(JSON key from step 1, one line)* |
   | `GOOGLE_SHEET_ID` | *(Sheet ID from step 1)* |
   | `ALLOWED_ORIGIN` | `https://caramucci.com` |
   | `FUND_GOAL` | `5000` |

5. Deploy. Note the generated URL, e.g. `https://wedding-backend.onrender.com`.
6. Once DNS (step 5 below) is set up, add `api.caramucci.com` as a **Custom Domain** for this service in Render.

> Note: Render's free tier spins the service down after ~15 minutes of inactivity. The first request after idling takes 30-60s to wake up — fine for an RSVP form, just don't be alarmed by a slow first submission.

---

## 4. GitHub Pages (frontend hosting)

1. Push this repo (the one containing `index.html`, `registry.html`, `static/`, `CNAME`, `.nojekyll`) to GitHub — this repo **can be public**.
2. In the repo's **Settings → Pages**, set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Under **Custom domain**, enter `caramucci.com` (this matches the `CNAME` file already in the repo) and save.
4. Wait for GitHub to issue the HTTPS certificate (can take a few minutes to an hour), then enable **Enforce HTTPS**.

---

## 5. Cloudflare DNS

In the Cloudflare dashboard for `caramucci.com`, DNS tab:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only (grey cloud) — see note |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `caramucci.com` | DNS only |
| CNAME | `api` | `<your-render-app>.onrender.com` | DNS only |

- The four A records point the apex domain at GitHub Pages' IPs.
- `api` points at your Render service. Add `api.caramucci.com` as a custom domain in Render (step 3.6) — Render will tell you if any extra TXT verification record is needed.
- Start with **proxy off (grey cloud / "DNS only")** for `api` while Render issues its TLS certificate, since Render needs to see the real hostname. You can switch it to proxied (orange cloud) afterward if you want Cloudflare's caching/protection — just make sure SSL mode is "Full" or "Full (strict)" in Cloudflare so it doesn't conflict with Render's cert.
- For the GitHub Pages apex records, Cloudflare proxy (orange cloud) is fine either way.

---

## 6. Frontend config

Already done in this repo:
- `static/Script.js` → `CONFIG.BACKEND_URL = 'https://api.caramucci.com/submit-rsvp'`
- `static/registry.js` → `API_URL = 'https://api.caramucci.com'`

If your Render URL ends up different from `api.caramucci.com`, update these two values to match.

---

## 7. Migrating existing RSVP/donation data

If you have existing data in `backend/RSVP_Responses.xlsx` / `Wedding_Donations.xlsx` from the old self-hosted setup:

```bash
cd backend
pip install -r requirements.txt openpyxl
set GOOGLE_SERVICE_ACCOUNT_JSON=<...>
set GOOGLE_SHEET_ID=<...>
python migrate_to_sheets.py
```

This appends the existing rows into the new Google Sheet. Run it once, locally.

---

## 8. Smoke test checklist

- [ ] `https://caramucci.com` loads the site over HTTPS
- [ ] `https://api.caramucci.com/health` returns `{"status": "running", ...}`
- [ ] Submit a test RSVP → row appears in the `RSVPs` Google Sheet tab, confirmation email arrives, host notification email arrives
- [ ] Re-submit the same email → "Is Override" = Yes, override audit-log email arrives
- [ ] `https://api.caramucci.com/fund-status` returns `{"totalRaised": ..., "goal": 5000}`
- [ ] Submit a test donation (once registry is live) → row appears in `Donations` tab, thank-you email arrives, `/fund-status` total updates
