# ☀️ Leaf Solar Mailer — Bulk Email Marketing App

A full-featured bulk email marketing platform built with **Next.js 16**, designed for [Leaf Solar](https://www.leafsolar.ng). It can be installed as an Android app (APK) via PWA or wrapped with Capacitor.

## ✨ Features

### 🔐 Admin Account & Security
- First-run **Welcome** page creates your admin account (email + password, salted & hashed)
- **Login** page protects the whole workspace; API routes are token-checked
- Change password and sign out from Settings
- Session cookie is httpOnly — the token never reaches JavaScript

### 📧 Email Campaigns
- Create, edit, and send bulk email campaigns
- Rich text (WYSIWYG) email editor
- Personalization tags: `{{name}}`, `{{email}}`, `{{company}}`
- **108 professional templates** reflecting the real content of www.leafsolar.ng
  (solar packages, appliances, offers, newsletters, follow-ups, seasonal, welcome, trust — all with
  Leaf Solar's emerald/amber brand, email-safe HTML and live store links)
- **Campaign scheduling** — pick a date & time; the app auto-sends when due
- **Open & click tracking** — a tracking pixel and rewritten links on every send; see who opened,
  who clicked, and how many times
- **Unsubscribe links** — every send includes a `{{unsubscribe}}` link; recipients can opt out on a
  public page and are suppressed from future sends
- **Delivery reports** — export the full per-recipient log (status, opens, clicks) as CSV
- Campaign draft, send, scheduled and delivery tracking

### 👥 Contact Management
- Add contacts manually, edit them, assign them to multiple lists at once
- **Import from external sources:** CSV, Excel (.xlsx/.xls), TXT, vCard (.vcf), or paste emails
- Imports can be assigned directly to a list
- **Select all** checkboxes + bulk actions: add/remove from lists, export, delete
- Contact cards show which lists each contact belongs to (list chips)
- Search and filter contacts; export to CSV
- Organize contacts into email lists; list pages support select-all, bulk add-existing and bulk remove

### 🔌 Marketing Platform Integrations (API Leads)
Sync leads directly from popular marketing platforms:
- **Mailchimp**, **Brevo (Sendinblue)**, **HubSpot**, **Mailgun**, **ConvertKit**, **ActiveCampaign**, **Custom API/Webhook**
- **Social lead ads:** Facebook/Meta, Instagram, LinkedIn, X/Twitter, TikTok, YouTube, Pinterest, Snapchat
- **Messaging:** WhatsApp Business Cloud, Telegram

### ⚙️ Email Sending
- SMTP configuration with quick presets (Truehost/Cloudoon default, Gmail, Outlook, Brevo, SendGrid, Mailgun, Zoho, etc.)
- Connection testing before saving
- Pooled connections with rate limiting for bulk sending
- Configurable sender name, from email, and reply-to
- Single-email **Compose** page with contact autocomplete and delivery logging

### 💾 Backups & Cloud Sync
- **Download** a full JSON backup of everything (contacts, lists, campaigns, templates, integrations, logs)
- **Save server snapshots** (kept locally, last 20) and download them
- **Restore** from any previous backup file (safety snapshot taken first)
- **Automatic backups** after every campaign send and contact import (toggle in Settings)
- **Cloud backups:** save a webhook URL (e.g. Zapier → Google Drive/Dropbox) and push backups to the
  cloud with one click; direct links to Drive, Dropbox and OneDrive

### 📊 Analytics
- Per-campaign dashboard: recipients, delivered, failed, opened, clicked, engaged (with rates)
- Per-recipient engagement log (open/click counts) in the campaign detail page
- CSV export of the full delivery + engagement report

### 📱 Android App (APK)
- Progressive Web App (PWA) — install directly from Chrome
- Standalone display with app icon; offline caching of UI shell
- Offline outbox queues sends/contact adds while offline and flushes on reconnect
- Capacitor config included for native APK builds (loads the live app from `APP_URL`)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Visit `http://localhost:3000` — you'll be taken to the **Welcome** page to create your admin account.

## ⚙️ SMTP Setup

Go to **Settings** and configure your SMTP server (Truehost/Cloudoon is pre-filled for `mail.leafsolar.ng`).
Common providers:

| Provider | Host | Port | Security |
|----------|------|------|----------|
| Truehost / Cloudoon | mail.leafsolar.ng | 587 | TLS |
| Gmail | smtp.gmail.com | 587 | TLS |
| Outlook/365 | smtp.office365.com | 587 | TLS |
| Brevo | smtp-relay.brevo.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| Mailgun | smtp.mailgun.org | 587 | TLS |
| Zoho | smtp.zoho.com | 465 | SSL |

> **Note:** For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) instead of your regular password.

## 📦 Building the APK

### Option A: PWA (Easiest — No Android Studio needed)
1. Deploy the app to any HTTPS host (Vercel, Netlify, your VPS)
2. Open the URL in **Chrome on Android**
3. Tap the menu (⋮) → **"Install app"**
4. The app appears on your home screen like a native app

### Option B: PWABuilder (Generates a real APK)
1. Deploy the app with HTTPS
2. Go to [pwabuilder.com](https://www.pwabuilder.com)
3. Enter your app URL → **Start** → **Build My PWA**
4. Download the Android package

### Option C: Capacitor (Full native build)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
APP_URL=https://leafsolar-mailer.vercel.app npm run build:android
npx cap add android
npx cap open android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

> The APK bundles a small loading shell (`www/index.html`) that probes the app
> URL baked at build time (default `https://leafsolar-mailer.vercel.app` — the
> stable Vercel project URL), then loads the live app. If the server can't be
> reached, the APK shows a clear message with **Retry** and **Open in browser**
> instead of a blank green screen. `npm run build:android` / `npm run apk`
> bake `APP_URL` automatically (`scripts/bake-app-url.mjs`).

## ⏰ Scheduling & Cron

Scheduled campaigns are auto-sent by:
1. **In-app poller** — checks every 60s while the app is open.
2. **GitHub Actions scheduler** (`.github/workflows/scheduler.yml`) — pings
   `/api/scheduler` every 10 minutes even when nobody has the app open. Free on
   public repos.
3. **Vercel cron** — only if you're on Pro/Enterprise (Hobby fails the build
   with any schedule more frequent than once per day; we deliberately leave
   `crons` out of `vercel.json` for Hobby compatibility).

### To enable the GitHub Actions scheduler
1. Generate a long random string (e.g. `openssl rand -hex 32`).
2. Add it as a **GitHub repo secret** named `CRON_SECRET`
   (Settings → Secrets and variables → Actions).
3. Set the **same value** as the `CRON_SECRET` environment variable in Vercel
   (Project → Settings → Environment Variables → Production).

The scheduler endpoint also runs when called manually — you can hit
`/api/scheduler` with `Authorization: Bearer <CRON_SECRET>` from any cron service.

## ☁️ Deploying to Vercel

1. **Push to GitHub** — Vercel imports the repo and auto-detects Next.js.
2. **Set up durable storage** (recommended so data survives serverless cold
   starts). "Vercel KV" no longer exists — pick **one** of:

   **Option A — Supabase (easiest, no Vercel marketplace):**
   1. Create a free project at [supabase.com](https://supabase.com) (no card)
   2. Open the **SQL Editor** and run:
      ```sql
      create table if not exists app_state (
        id text primary key,
        payload jsonb,
        updated_at timestamptz default now()
      );
      ```
   3. In Project → Settings → **API**, copy the **Project URL** and
      **service_role key**, and add them as env vars (below).

   **Option B — Upstash Redis** (successor to Vercel KV): create a Redis
   database at [upstash.com](https://upstash.com) (or Vercel Marketplace →
   "Upstash Redis") and use its REST URL + token.

3. **Add environment variables** in Project → Settings → Environment Variables
   (Production):

   | Variable | Value |
   |----------|-------|
   | `APP_URL` | `https://leafsolar-mailer.vercel.app` (or `https://mailer.leafsolar.ng`) |
   | `DATABASE_PATH` | `/tmp/leafsolar-data.json` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` | your Truehost/Cloudoon mailbox |
   | `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | *(Option A)* from Supabase |
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | *(Option B)* from Upstash Redis |
   | `CRON_SECRET` | a long random string |

4. **Redeploy.** On first visit you'll be taken to the **Welcome** page — create
   your admin account (this unlocks the app).

> **Why durable storage?** On serverless, the file system is read-only except
> `/tmp`, which is wiped between cold starts. With Supabase or Upstash
> configured, the app mirrors the whole JSON store (contacts, campaigns,
> settings…) to the external store — hydrated on cold start, flushed after
> writes. Without it the app still works locally and on a VPS (persistent
> `./data/` folder); on Vercel it degrades to per-instance memory (data resets).

## 🛠 Tech Stack

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Zero-dependency JSON store (Vercel-safe; swap for Postgres/KV easily)
- **Email:** Nodemailer (SMTP) + imapflow/mailparser (inbox)
- **File Parsing:** Papa Parse (CSV), SheetJS (Excel)
- **PWA:** Service Worker, Web App Manifest
- **Mobile:** Capacitor config for APK builds

## 📄 License
MIT © Leaf Solar

## 🔔 Notifications & Background Sync

### In-app + device notifications (works now, no setup)
- **Sounds** — a chime when a new email arrives, a blip when an email is sent
  (toggle in Settings → Notification Sounds).
- **Device notifications** — real Android pop-ups (even when the phone is
  locked or you're in another app) for new mail, sent emails and campaign
  results, via `@capacitor/local-notifications`. The app asks for permission
  on your first tap (Android 13+). Toggle in Settings → Device Notifications.
- **Background sync** — the service worker's background sync flushes the
  offline outbox (queued sends/contact adds) when connectivity returns, even
  if the app is backgrounded.

### True closed-app push (Firebase Cloud Messaging) — optional, ~10 min
For push notifications that arrive even when the app is fully force-closed,
wire up FCM:

1. Create a free project at https://console.firebase.google.com → **Add app** →
   Android → package name **`ng.leafsolar.mailer`**.
2. Download **`google-services.json`** and place it at
   `android/app/google-services.json`.
3. In the CI workflow (`.github/workflows/android.yml`), the Android build will
   pick it up automatically if present (commit it or make it available to the
   runner). The app's `src/lib/notifications.ts` already centralizes
   permission + channels; add `@capacitor/push-notifications` and register the
   FCM token there.
4. Add your **FCM server key** (or service account) as a Vercel env var
   (`FCM_SERVER_KEY`), then any server event (new email detected by the
   scheduler, campaign finished, reply received) can push to the device.

Until step 1–2 are done, local notifications cover the "locked/idle/other
app" case whenever the app process is alive.
