# ☀️ Leaf Solar Mailer — Bulk Email Marketing App

A full-featured bulk email marketing platform built with **Next.js 14**, designed for [Leaf Solar](https://www.leafsolar.ng). It can be installed as an Android app (APK) via PWA or wrapped with Capacitor.

## ✨ Features

### 📧 Email Campaigns
- Create, edit, and send bulk email campaigns
- Rich text (WYSIWYG) email editor
- Personalization tags: `{{name}}`, `{{email}}`, `{{company}}`
- 5 pre-built solar industry email templates
- Campaign draft, send, and delivery tracking
- Delivery logs with success/failure status

### 👥 Contact Management
- Add contacts manually
- **Import from external sources:**
  - CSV files
  - Excel spreadsheets (.xlsx, .xls)
  - Plain text files (.txt)
  - vCard files (.vcf)
  - Paste email addresses directly
- Search and filter contacts
- Export contacts to CSV
- Organize contacts into email lists

### 🔌 Marketing Platform Integrations (API Leads)
Sync leads directly from popular marketing platforms:
- **Mailchimp** — sync audience subscribers
- **Brevo (Sendinblue)** — import contacts
- **HubSpot** — import CRM contacts
- **Mailgun** — import mailing list members
- **ConvertKit** — sync subscribers
- **ActiveCampaign** — import CRM contacts
- **Custom API/Webhook** — connect to any REST API endpoint

### ⚙️ Email Sending
- SMTP configuration with quick presets (Gmail, Outlook, Brevo, SendGrid, Mailgun, Zoho, etc.)
- Connection testing before saving
- Pooled connections with rate limiting for bulk sending
- Configurable sender name, from email, and reply-to

### 📱 Android App (APK)
- Progressive Web App (PWA) — install directly from Chrome
- Standalone display with app icon
- Offline caching of UI shell
- Capacitor config included for native APK builds

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

Visit `http://localhost:3000`.

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
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Build the web app (static export)
npm run build

# Add Android platform
npx cap add android

# Sync web assets
npx cap sync android

# Open in Android Studio to build APK
npx cap open android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

## ⚙️ SMTP Setup

Go to **Settings** and configure your SMTP server. Common providers:

| Provider | Host | Port | Security |
|----------|------|------|----------|
| Gmail | smtp.gmail.com | 587 | TLS |
| Outlook/365 | smtp.office365.com | 587 | TLS |
| Brevo | smtp-relay.brevo.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| Mailgun | smtp.mailgun.org | 587 | TLS |
| Zoho | smtp.zoho.com | 465 | SSL |

> **Note:** For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) instead of your regular password.

## 🔧 API Integration Setup

### Mailchimp
1. Go to **Account → Extras → API keys**
2. Create an API key (format: `abc123-us14`)
3. The data center is the suffix after `-` (e.g., `us14`)

### Brevo
1. Go to **SMTP & API → API Keys**
2. Create a v3 API key

### HubSpot
1. Go to **Settings → Integrations → Private Apps**
2. Create a private app with `crm.objects.contacts.read` scope
3. Copy the access token

### Custom API
- Provide a REST endpoint returning JSON
- Response can be an array or an object with `contacts`/`data`/`results` array
- Configure which field contains the email address

## 🛠 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite (via better-sqlite3)
- **Email:** Nodemailer (SMTP)
- **File Parsing:** Papa Parse (CSV), SheetJS (Excel)
- **PWA:** Service Worker, Web App Manifest
- **Mobile:** Capacitor config for APK builds

## 📂 Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── campaigns/     # Campaign CRUD + sending
│   │   ├── contacts/      # Contact CRUD + bulk import
│   │   ├── import/        # File upload (CSV/Excel/TXT/VCF)
│   │   ├── integrations/  # Marketing platform sync
│   │   ├── lists/         # Email list management
│   │   ├── templates/     # Email templates
│   │   ├── settings/      # SMTP configuration
│   │   └── stats/         # Dashboard stats
│   ├── campaigns/         # Campaign pages
│   ├── contacts/          # Contacts page
│   ├── lists/             # Email lists page
│   ├── templates/         # Templates page
│   ├── integrations/      # Integrations page
│   └── settings/          # Settings page
├── components/             # React components
├── lib/                    # Database, email service, queries
└── types/                  # TypeScript types
```

## 🌐 Deployment to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Leaf Solar Mailer"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/leafsolar-mailer.git
git branch -M main
git push -u origin main
```

### Deploy to Vercel (recommended)
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repository
3. Deploy — Vercel auto-detects Next.js

## 📄 License
MIT © Leaf Solar
