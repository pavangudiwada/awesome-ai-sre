#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(ROOT, 'tools', 'operate');
const USER_AGENT = 'awesome-ai-sre-bot/1.0 (+https://github.com/pavangudiwada/awesome-ai-sre)';
const TIMEOUT_MS = 12000;

function getYamlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('_') && (name.endsWith('.yaml') || name.endsWith('.yml')))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map((name) => path.join(dir, name));
}

function parseTopLevel(filePath) {
  const out = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const m = raw.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();
    if (value === '') continue;
    out[key] = value;
  }
  return out;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function cleanText(text) {
  return decodeEntities(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      const text = cleanText(m[1]);
      if (text) return text;
    }
  }
  return '';
}

function bestDescriptionFromHtml(html) {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["'][^>]*>/i
  ];

  return extractMeta(html, patterns);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html')) {
      throw new Error(`Unsupported content-type: ${ctype}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function truncateSummary(text, maxLen = 170) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, Math.max(0, lastSpace)).trim()}.`;
}

function escapeYamlSummary(text) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  const escaped = oneLine.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function replaceSummaryLine(content, newSummary) {
  const line = `summary: ${escapeYamlSummary(newSummary)}`;
  if (/^summary:\s*.*$/m.test(content)) {
    return content.replace(/^summary:\s*.*$/m, line);
  }

  const idx = content.search(/^website:\s*.*$/m);
  if (idx === -1) return `${line}\n${content}`;

  const websiteLine = content.match(/^website:\s*.*$/m)[0];
  return content.replace(websiteLine, `${websiteLine}\n${line}`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const overwrite = args.has('--overwrite');

  if (!overwrite) {
    console.log('Safe mode enabled: existing summaries are protected.');
    console.log('Use --overwrite to replace existing summary values.');
    console.log('');
  }

  const files = getYamlFiles(TOOLS_DIR);
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const base = path.basename(file);
    const data = parseTopLevel(file);
    const website = (data.website || '').trim();

    if (!website) {
      console.log(`SKIP ${base}: missing website`);
      skipped += 1;
      continue;
    }

    try {
      const currentSummary = (data.summary || '').trim();
      if (currentSummary && !overwrite) {
        console.log(`SKIP ${base}: summary exists (protected)`);
        skipped += 1;
        continue;
      }

      const html = await fetchHtml(website);
      const desc = bestDescriptionFromHtml(html);
      if (!desc) {
        console.log(`SKIP ${base}: no meta description found`);
        skipped += 1;
        continue;
      }

      const summary = truncateSummary(desc);
      const before = fs.readFileSync(file, 'utf8');
      const after = replaceSummaryLine(before, summary);

      if (before !== after) {
        fs.writeFileSync(file, after, 'utf8');
        console.log(`OK   ${base}: summary updated`);
        updated += 1;
      } else {
        console.log(`OK   ${base}: summary unchanged`);
      }
    } catch (err) {
      console.log(`SKIP ${base}: ${err.message}`);
      skipped += 1;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Total: ${files.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
