#!/usr/bin/env node
/**
 * Bakes the deployed APP_URL into the APK shell (www/index.html) before
 * `cap sync`. Idempotent: resets any previously baked URL to the placeholder
 * first, then injects the new one.
 *
 * NOTE: the current shell is a static fallback page (the app loads the site
 * via capacitor server.url), so it has no placeholder. In that case this
 * script is a harmless no-op (does NOT fail the build).
 *
 * Usage:  APP_URL=https://mailer.leafsolar.ng node scripts/bake-app-url.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shellPath = path.join(__dirname, '..', 'www', 'index.html');
const url = (process.env.APP_URL || 'https://mailer.leafsolar.ng').replace(/\/$/, '');

let html = fs.readFileSync(shellPath, 'utf-8');

// Reset any previously baked URL to the placeholder, then inject.
html = html.replace(/var APP_URL = '[^']*';/, "var APP_URL = '__APP_URL__';");
if (!html.includes('__APP_URL__')) {
  // No placeholder — static fallback shell; nothing to bake.
  console.log('[bake-app-url] no placeholder in www/index.html — nothing to bake (server.url handles the URL)');
  process.exit(0);
}
html = html.replace(/__APP_URL__/g, url);
fs.writeFileSync(shellPath, html);
console.log(`[bake-app-url] baked APP_URL=${url} into www/index.html`);
