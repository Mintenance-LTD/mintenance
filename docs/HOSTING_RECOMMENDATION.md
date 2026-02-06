# Mintenance – Best Hosting Recommendation

**Last updated:** January 2025  
**Scope:** Web app backend (Next.js API + SSR) and mobile app distribution (Expo).  
**Based on:** Full review of `apps/web` and `apps/mobile` backends, API surface, and existing config.

---

## Summary

| Layer | Recommended host | Why |
|-------|------------------|-----|
| **Web app (Next.js)** | **Vercel** (already configured) | Best fit for Next.js 16, serverless API routes, crons, and your `vercel.json`. |
| **Mobile app** | **EAS (Expo Application Services)** (already in use) | Builds (iOS/Android), OTA updates, and env injection are already set up. |
| **Database / Auth / Storage** | **Supabase Cloud** (unchanged) | Managed PostgreSQL, auth, storage, Realtime. |
| **Payments** | **Stripe** (unchanged) | No hosting; API only. |
| **Rate limiting** | **Upstash Redis** (unchanged) | Serverless Redis; works from Vercel. |
| **Heavy ML / long jobs** | Optional: **GCP / AWS** | Only if you outgrow Vercel’s 60s serverless limit. |

**Best overall hosting for this app: keep web on Vercel and mobile on EAS; add a dedicated worker or VM only if you need longer-running AI/ML jobs.**

---

## 1. Web app backend (what actually needs “hosting”)

### 1.1 What the web app is

- **Framework:** Next.js 16 (App Router), React 19.
- **Server pieces:**
  - **SSR / pages:** Server Components and server-rendered pages.
  - **API routes:** `apps/web/app/api/*` — 280+ route files (auth, payments, jobs, AI, building-surveyor, maintenance, crons, webhooks, etc.).
- **Heavy APIs (memory/time):**
  - `app/api/building-surveyor/**` — ONNX / ML (already set to 2048 MB, 60 s in `vercel.json`).
  - `app/api/ai/**` — embeddings, search (2048 MB, 60 s).
  - `app/api/maintenance/**` — assessments (2048 MB, 60 s).
- **Crons (in `vercel.json`):**
  - Escrow auto-release, notification/agent processors, no-show/homeowner/admin reminders, payment-setup reminders, model-retraining (daily).
- **External dependencies (no extra “hosting”):**
  - Supabase (DB, auth, storage, Realtime).
  - Stripe (payments + webhooks).
  - Upstash Redis (rate limiting).
  - GCP (Vision, Storage, AI Platform), optional AWS Rekognition, OpenWeatherMap, etc.

So the only thing you host yourself for the product is the **Next.js app** (SSR + API + crons). Everything else is SaaS.

### 1.2 Why Vercel is the best fit

1. **Already set up**  
   - `vercel.json` configures:
     - Framework: Next.js.
     - Build: `npm run build:packages && npm run build:web`.
     - Output: `apps/web/.next`.
     - Region: `iad1`.
     - Function memory/duration for default API routes and for AI/building-surveyor/maintenance.
     - Security headers and cron schedules.

2. **Matches your architecture**  
   - Serverless API routes and SSR.
   - Cron triggers map cleanly to your `/api/cron/*` routes.
   - No need to run a long-lived Node process unless you hit limits.

3. **Operational simplicity**  
   - One platform for frontend + API + crons.
   - Good DX for Next.js, env vars, preview deployments, and monitoring.

4. **Limits to be aware of**  
   - **Max serverless duration:** 60 s (you already use 60 s for heavy routes). If some jobs (e.g. model retraining, very heavy ONNX) need longer, you have two paths:
     - Move only those jobs to a **scheduled worker** (e.g. GCP Cloud Run, AWS Lambda with higher timeout, or a small VM), and keep the rest on Vercel; or
     - Use Vercel Crons to **invoke** an external endpoint that runs the long job elsewhere.

So: **Vercel is the best hosting place for the web app** as it stands today.

### 1.3 Vercel deployment checklist (monorepo)

- **Root Directory:** Leave as **repository root** (so `npm run build:packages && npm run build:web` runs from root).
- **Build Command:** `npm run build:packages && npm run build:web` (already in `vercel.json`).
- **Output Directory:** `apps/web/.next` (already in `vercel.json`).
- **Install Command:** e.g. `npm ci --ignore-scripts` (or as in `vercel.json`).
- **Environment variables:** Set in Vercel dashboard (or via CLI) for:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - App URL: `NEXT_PUBLIC_APP_URL` = your production URL (e.g. `https://app.mintenance.com` or `https://mintenance.vercel.app`)
  - Plus any optional: OpenAI, Roboflow, Google Maps, GCP, Sentry, etc.
- **Crons:** Already defined in `vercel.json`; ensure the cron routes are deployed and that auth/verification (e.g. `CRON_SECRET`) is implemented if you use it.

### 1.4 If you outgrow Vercel (long-running jobs)

- **Option A – External worker:**  
  Keep Next.js on Vercel. Run “heavy” jobs (e.g. model retraining, long ONNX runs) on:
  - **GCP Cloud Run** (container, up to 60 min), or
  - **AWS Lambda** (higher timeout) / **ECS**, or
  - A small **Railway / Render / Fly.io** Node service that exposes a single HTTP endpoint called by Vercel Cron.

- **Option B – Move entire API off Vercel:**  
  Only consider if you want one long-running Node process (e.g. `next start` with `output: 'standalone'`). You already have `output: 'standalone'` in `next.config.js`, so you could host that on:
  - **Railway / Render / Fly.io** (single Node server + external cron hitting `/api/cron/*`), or
  - **AWS ECS/Fargate** or **GCP Cloud Run** (container).

For most cases, **staying on Vercel and offloading only the heaviest jobs** is the best balance.

---

## 2. Mobile app “backend” (no extra backend to host)

### 2.1 How mobile works

- **Expo (React Native)** app in `apps/mobile`.
- **Data:** Talks to **Supabase** directly (auth, DB, storage, Realtime) via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Web API:** `ApiClient` uses `EXPO_PUBLIC_API_URL`:
  - Dev: defaults to `http://localhost:3000/api`.
  - Prod: should be set to your **web app’s API base** (e.g. `https://app.mintenance.com/api` or `https://your-app.vercel.app/api`).

So the “backend” for mobile is: **Supabase + the same Next.js API** you host on Vercel. You don’t host a separate backend for mobile.

### 2.2 Where to “host” the mobile app

- **Builds & distribution:** **EAS (Expo Application Services)** — already configured in `eas.json` and `app.config.js` (profiles: development, stable, staging, preview, production, production-store).
- **OTA updates:** Expo Updates (e.g. `u.expo.dev`), configured in app config.
- **Env for production:** In EAS, set `EXPO_PUBLIC_API_URL` to your **production web API URL** (same as `NEXT_PUBLIC_APP_URL` + `/api`), plus Supabase and Stripe publishable key so production builds point at the right backend.

So the **best “hosting” for the mobile app** is: **EAS for builds and OTA**, and **Vercel-hosted web app** as the API backend.

---

## 3. End-to-end picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Users                                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Web browser          Mobile app (Expo)                                │
│  → Next.js (Vercel)    → EAS Build + OTA                                 │
│       │                         │                                        │
│       └────────────┬─────────────┘                                        │
│                    ▼                                                     │
│  Next.js on Vercel (SSR + API routes + Crons)                            │
│       │                                                                  │
│       ├── Supabase (DB, Auth, Storage, Realtime)  ← Supabase Cloud       │
│       ├── Stripe (payments, webhooks)            ← Stripe                │
│       ├── Upstash Redis (rate limiting)          ← Upstash                │
│       ├── GCP / OpenAI / etc. (optional)         ← existing SaaS         │
│       └── Optional: long job worker (GCP/AWS)    ← only if needed        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Direct answers

- **Best hosting for the app (web + mobile):**  
  **Web:** Vercel. **Mobile:** EAS for builds and OTA; API = same Vercel-hosted Next.js app.

- **Best single place for the “backend” (API + crons):**  
  **Vercel** for the Next.js app; Supabase/Stripe/Upstash stay as they are.

- **When to add another host:**  
  Only if you need **longer than 60 s** or **more control** for a few heavy AI/ML/cron jobs — then add a small worker (e.g. GCP Cloud Run or a tiny Node service on Railway/Render) and call it from Vercel Cron or from an API route.

- **What to set in production:**  
  - **Vercel:** All env vars from `.env.example` (Supabase, Stripe, Redis, `NEXT_PUBLIC_APP_URL`, etc.).  
  - **EAS:** `EXPO_PUBLIC_API_URL` = `https://<your-web-domain>/api`, plus Supabase and Stripe publishable keys.  
  - **Mobile deep links:** Already set for `mintenance.app` / `www.mintenance.app`; point your domain to the Vercel deployment.

This keeps one primary host (Vercel) for the backend, uses EAS for mobile distribution, and leaves room to add a dedicated worker only if you hit serverless limits.
