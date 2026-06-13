#!/usr/bin/env node
// Fetches screenshots for observability tools and updates src/data/observability.js
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT, 'public', 'screenshots');
const OBS_DATA = path.join(ROOT, 'src', 'data', 'observability.js');
const WIDTH = 1280;
const HEIGHT = 800;
const TODAY = new Date().toISOString().slice(0, 10);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Parse tool URLs from the JS file via regex (avoid ESM import complexity)
const src = fs.readFileSync(OBS_DATA, 'utf8');
const tools = [];
const nameRe = /name:\s*["']([^"']+)["']/g;
const slugRe = /slug:\s*["']([^"']+)["']/g;
const urlRe = /url:\s*["']([^"']+)["']/g;

let nm, sl, ur;
// Reset regex state
nameRe.lastIndex = 0; slugRe.lastIndex = 0; urlRe.lastIndex = 0;

// Walk through object blocks
const blocks = src.split(/\{\s*\n/);
for (const block of blocks) {
  const nameM = /name:\s*["']([^"']+)["']/.exec(block);
  const slugM = /slug:\s*["']([^"']+)["']/.exec(block);
  const urlM = /url:\s*["']([^"']+)["']/.exec(block);
  if (nameM && slugM && urlM) {
    tools.push({ name: nameM[1], slug: slugM[1], url: urlM[1] });
  }
}

console.log(`Found ${tools.length} observability tools`);

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 60000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const updated = [];
const failed = [];

for (const tool of tools) {
  const outPath = path.join(SCREENSHOT_DIR, `obs-${tool.slug}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`  skip ${tool.slug} (exists)`);
    updated.push(tool.slug);
    continue;
  }
  console.log(`  → ${tool.slug} (${tool.url})`);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.setUserAgent('awesome-ai-sre-screenshot/1.0');
    await page.goto(tool.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    await page.close();
    updated.push(tool.slug);
    console.log(`  ✓ ${tool.slug}`);
  } catch (err) {
    failed.push(`${tool.slug}: ${err.message}`);
    console.log(`  ✗ ${tool.slug}: ${err.message}`);
  }
}

await browser.close();

// Patch observability.js to add screenshot fields
let newSrc = src;
for (const slug of updated) {
  const screenshotPath = `/screenshots/obs-${slug}.png`;
  if (newSrc.includes(screenshotPath)) continue;
  // Match slug line with its trailing comma to avoid double-comma bug
  const slugWithComma = `slug: "${slug}",`;
  const slugWithCommaAlt = `slug: '${slug}',`;
  if (newSrc.includes(slugWithComma)) {
    newSrc = newSrc.replace(slugWithComma, `slug: "${slug}",\n    screenshot: "${screenshotPath}",`);
  } else if (newSrc.includes(slugWithCommaAlt)) {
    newSrc = newSrc.replace(slugWithCommaAlt, `slug: '${slug}',\n    screenshot: "${screenshotPath}",`);
  }
}

fs.writeFileSync(OBS_DATA, newSrc, 'utf8');

console.log(`\nDone. Updated ${updated.length}, failed ${failed.length}`);
if (failed.length) failed.forEach(f => console.log(' ✗', f));
if (failed.length) process.exitCode = 1;
