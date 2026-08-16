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
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

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
2. **Create Vercel KV** (recommended for durable data): Dashboard → **Storage →
   Create Database → KV (Upstash)**. Copy the REST URL + token.
3. **Add environment variables** in Project → Settings → Environment Variables
   (Production):

   | Variable | Value |
   |----------|-------|
   | `APP_URL` | `https://mailer.leafsolar.ng` |
   | `DATABASE_PATH` | `/tmp/leafsolar-data.json` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` | your Truehost/Cloudoon mailbox |
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | from your Vercel KV |
   | `CRON_SECRET` | a long random string |

4. **Redeploy.** On first visit you'll be taken to the **Welcome** page — create
   your admin account (this unlocks the app).

> **Why Vercel KV?** On serverless, the file system is read-only except `/tmp`,
> which is wiped between cold starts. When `KV_REST_API_URL`/`KV_REST_API_TOKEN`
> are set, the app mirrors the whole JSON store to a single KV key
> (`leafsolar:data`) — hydrated on cold start, flushed after writes. Without KV
> the app still works locally and on a VPS (persistent `./data/` folder), and on
> Vercel it degrades to per-instance memory (data resets).

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
