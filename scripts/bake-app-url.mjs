#!/usr/bin/env node
/**
 * Bakes the deployed APP_URL into the APK shell (www/index.html) before
 * `cap sync`. Idempotent: resets any previously baked URL to the placeholder
 * first, then injects the new one.
 *
 * Usage:  APP_URL=https://mailer.leafsolar.ng node scripts/bake-app-url.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shellPath = path.join(__dirname, '..', 'www', 'index.html');
// Default = the branded domain (mailer.leafsolar.ng), which is the same
// Vercel deployment but reachable from networks that can't route to
// *.vercel.app (common on some Nigerian ISPs/mobile networks). Override with
// APP_URL env if you prefer a different URL.
const url = (process.env.APP_URL || 'https://mailer.leafsolar.ng').replace(/\/$/, '');

let html = fs.readFileSync(shellPath, 'utf-8');

// Reset any previously baked URL to the placeholder, then inject.
html = html.replace(/var APP_URL = '[^']*';/, "var APP_URL = '__APP_URL__';");
if (!html.includes('__APP_URL__')) {
  console.error('[bake-app-url] www/index.html has no __APP_URL__ placeholder — is it the template?');
  process.exit(1);
}
html = html.replace(/__APP_URL__/g, url);
fs.writeFileSync(shellPath, html);
console.log(`[bake-app-url] baked APP_URL=${url} into www/index.html`);
