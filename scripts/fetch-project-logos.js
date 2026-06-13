#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join('tools', 'operate');
const OUTPUT_DIR = path.join('public', 'logos');
const TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 600000;
const FORCE = process.argv.includes('--force');
const MIN_PNG_BYTES = 2000;

// Paths that indicate a non-logo SVG/PNG (third-party icons, team photos, etc.)
const BAD_PATH_PATTERNS = [
  '/customers/', '/testimonials/', '/team/', '/people/', '/social/',
  '/partners/', '/sprite', '/avatar', '/headshot', '/docker-icon',
  '/fontawesome', '/bootstrap', '/twitter-', '/facebook-', '/linkedin-',
  '/youtube-', '/instagram-', '/github-mark', '/check-', '/arrow-',
  '/chevron-', '/close-', '/menu-', '/search-', '/user-', '/bell-',
  '/adopters/', '/integrations/', '/plugins/', 'octocat', '/revisit',
];

// Third-party brand names that should not appear as the file's own logo
const THIRD_PARTY_BRAND_FILENAMES = [
  'slack-logo', 'slack_logo', 'github-logo', 'github_logo',
  'docker-logo', 'kubernetes-logo', 'k8s-logo', 'k8s.svg',
  'salesforce', 'microsoft-logo', 'google-logo', 'amazon-logo',
  'aws-logo', 'azure-logo', 'twitter-logo', 'linkedin-logo',
  'facebook-logo', 'datadog-logo', 'pagerduty-logo', 'jira-logo',
  'atlassian-logo', 'notion-logo', 'krateo',
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function withTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    headers: {
      'user-agent': 'awesome-ai-sre-logo-fetcher/1.0',
      ...(options.headers || {})
    },
    signal: ctrl.signal
  }).finally(() => clearTimeout(id));
}

async function fetchBody(url) {
  try {
    const res = await withTimeout(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    return { body, contentType };
  } catch {
    return null;
  }
}

function absolutize(baseUrl, ref) {
  if (!ref || typeof ref !== 'string') return null;
  const clean = ref.trim();
  if (!clean || clean.startsWith('data:') || clean.startsWith('javascript:')) return null;
  try {
    return new URL(clean, baseUrl).toString();
  } catch {
    return null;
  }
}

// Returns { iconLinks: string[], scoredLinks: string[] }
// iconLinks: from <link rel="icon"> — accepted even at score 0
// scoredLinks: from general href/src/og — only accepted if score > 0
function extractAssetLinks(baseUrl, html) {
  if (!html) return { iconLinks: [], scoredLinks: [] };

  const iconLinks = new Set();
  const scoredLinks = new Set();

  const icon1 = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi;
  for (const m of html.matchAll(icon1)) {
    const abs = absolutize(baseUrl, m[1]);
    if (abs) iconLinks.add(abs);
  }

  const icon2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/gi;
  for (const m of html.matchAll(icon2)) {
    const abs = absolutize(baseUrl, m[1]);
    if (abs) iconLinks.add(abs);
  }

  const srcHref = /(?:href|src)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(srcHref)) {
    const ref = m[1];
    if (!/\.(svg|png)(?:\?|#|$)/i.test(ref)) continue;
    const abs = absolutize(baseUrl, ref);
    if (abs && !iconLinks.has(abs)) scoredLinks.add(abs);
  }

  const og1 = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  for (const m of html.matchAll(og1)) {
    const abs = absolutize(baseUrl, m[1]);
    if (abs) scoredLinks.add(abs);
  }

  const og2 = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;
  for (const m of html.matchAll(og2)) {
    const abs = absolutize(baseUrl, m[1]);
    if (abs) scoredLinks.add(abs);
  }

  return { iconLinks: [...iconLinks], scoredLinks: [...scoredLinks] };
}

function parseGithub(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('github.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    return { owner: parts[0], repo: parts[1] || null };
  } catch {
    return null;
  }
}

function commonWebsiteCandidates(website) {
  if (!website) return [];
  try {
    const root = website.endsWith('/') ? website : `${website}/`;
    return [
      new URL('logo.svg', root).toString(),
      new URL('logo.png', root).toString(),
      new URL('assets/logo.svg', root).toString(),
      new URL('assets/logo.png', root).toString(),
      new URL('static/logo.svg', root).toString(),
      new URL('static/logo.png', root).toString(),
      new URL('img/logo.svg', root).toString(),
      new URL('img/logo.png', root).toString(),
      new URL('favicon.svg', root).toString(),
      new URL('favicon.png', root).toString(),
      new URL('apple-touch-icon.png', root).toString()
    ];
  } catch {
    return [];
  }
}

function githubCandidates(githubUrl) {
  const parsed = parseGithub(githubUrl);
  if (!parsed) return [];

  const urls = [`https://github.com/${parsed.owner}.png`];
  if (!parsed.repo) return urls;

  const branches = ['main', 'master'];
  const paths = [
    'logo.svg', 'logo.png',
    'assets/logo.svg', 'assets/logo.png',
    'docs/logo.svg', 'docs/logo.png',
    '.github/logo.svg', '.github/logo.png',
    'images/logo.svg', 'images/logo.png'
  ];

  for (const branch of branches) {
    for (const p of paths) {
      urls.push(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/refs/heads/${branch}/${p}`);
    }
  }

  return urls;
}

// Hosts that serve site-infrastructure assets, not the tool's own logo
const BAD_HOSTS = [
  'github.githubassets.com',
  'assets-cdn.github.com',
];

function scoreCandidateUrl(url) {
  try {
    const parsed = new URL(url);
    if (BAD_HOSTS.some((h) => parsed.hostname.includes(h))) return -1;
    const pathname = parsed.pathname.toLowerCase();
    if (BAD_PATH_PATTERNS.some((p) => pathname.includes(p))) return -1;
    const filename = pathname.split('/').pop() || '';
    if (THIRD_PARTY_BRAND_FILENAMES.some((b) => filename.includes(b))) return -1;
    let score = 0;
    if (/\blogo\b/.test(pathname)) score += 20;
    if (/\bbrand\b/.test(pathname)) score += 10;
    if (/\bicon\b/.test(pathname)) score += 3;
    if (/favicon/.test(pathname)) score += 1;
    return score;
  } catch {
    return 0;
  }
}

function domainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extFor(url, contentType, body) {
  const b = body || Buffer.alloc(0);
  const sniff = b.slice(0, 256).toString('utf8').trimStart();
  const bodyText = b.toString('utf8').slice(0, 1024).toLowerCase();
  const isHtml = /<\s*!?doctype html|<html[\s>]/i.test(bodyText);

  if (isHtml) {
    if (sniff.startsWith('<svg')) return 'svg';
    return null;
  }

  if (contentType.includes('image/svg') || sniff.startsWith('<svg')) return 'svg';
  if (contentType.includes('image/png')) return 'png';

  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.endsWith('.svg')) return 'svg';
    if (p.endsWith('.png')) return 'png';
  } catch {}

  return null;
}

function validImage(body, ext) {
  if (!body || !body.length) return false;
  if (ext === 'svg') return body.toString('utf8').includes('<svg');
  if (ext === 'png') {
    const sig = [...body.slice(0, 8)];
    return JSON.stringify(sig) === JSON.stringify([137, 80, 78, 71, 13, 10, 26, 10]);
  }
  return false;
}

function parseToolYaml(text) {
  const result = { name: null, website: null, github: null };
  const lines = text.split('\n');
  let inLinks = false;

  for (const line of lines) {
    if (/^\S/.test(line)) inLinks = false;

    const nameMatch = line.match(/^name:\s*(.+)\s*$/);
    if (nameMatch && !result.name) {
      result.name = nameMatch[1].trim();
      continue;
    }

    const websiteMatch = line.match(/^url:\s*(.+)\s*$/) || line.match(/^website:\s*(.+)\s*$/);
    if (websiteMatch && !result.website) {
      result.website = websiteMatch[1].trim();
      continue;
    }

    if (/^links:\s*$/.test(line)) {
      inLinks = true;
      continue;
    }

    if (inLinks) {
      const githubMatch = line.match(/^\s+github:\s*(.+)\s*$/);
      if (githubMatch && !result.github) {
        result.github = githubMatch[1].trim();
      }
    }

    const githubTopLevel = line.match(/^github:\s*(.+)\s*$/);
    if (githubTopLevel && !result.github) {
      result.github = githubTopLevel[1].trim();
    }
  }

  return result;
}

async function run() {
  const files = fs.readdirSync(TOOLS_DIR)
    .filter((f) => f.endsWith('.yaml') && f !== '_template.yaml')
    .sort();

  const results = [];

  for (const file of files) {
    const slug = file.replace(/\.yaml$/, '');
    const full = path.join(TOOLS_DIR, file);
    const data = parseToolYaml(fs.readFileSync(full, 'utf8'));

    const name = data.name || slug;
    const website = data.website || null;
    const github = data.github || null;

    // Skip if already have a logo and not forced
    const existingSvg = path.join(OUTPUT_DIR, `${slug}.svg`);
    const existingPng = path.join(OUTPUT_DIR, `${slug}.png`);
    if (!FORCE && (fs.existsSync(existingSvg) || fs.existsSync(existingPng))) {
      const ext = fs.existsSync(existingSvg) ? 'svg' : 'png';
      results.push({ name, slug, format: ext, source: '(existing)' });
      console.log(`[SKIP] ${slug} (${ext} exists)`);
      continue;
    }

    // Reliable candidates: common logo paths + GitHub
    const reliableCandidates = [...commonWebsiteCandidates(website), ...githubCandidates(github)];

    // HTML-extracted icon links only (from <link rel="icon"> tags — trusted source)
    let iconLinks = [];
    if (website) {
      const htmlResp = await fetchBody(website);
      if (htmlResp) {
        const html = htmlResp.body.slice(0, MAX_HTML_BYTES).toString('utf8');
        iconLinks = extractAssetLinks(website, html).iconLinks;
      }
    }

    const domain = domainFromUrl(website);
    const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

    // Priority order: explicit logo paths → icon links → clearbit
    // Deliberately exclude page-scraped src/href assets — too noisy (integration logos, etc.)
    const allCandidates = [
      ...reliableCandidates,
      ...iconLinks,
      ...(clearbitUrl ? [clearbitUrl] : []),
    ];

    const uniqueCandidates = [...new Set(allCandidates)]
      .filter(Boolean)
      .filter((url) => scoreCandidateUrl(url) >= 0)
      .sort((a, b) => scoreCandidateUrl(b) - scoreCandidateUrl(a));

    let svgMatch = null;
    let pngMatch = null;

    for (const url of uniqueCandidates) {
      const resp = await fetchBody(url);
      if (!resp) continue;
      const ext = extFor(url, resp.contentType, resp.body);
      if (!ext || !validImage(resp.body, ext)) continue;
      if (ext === 'png' && resp.body.length < MIN_PNG_BYTES) continue;

      if (ext === 'svg' && !svgMatch) svgMatch = { url, body: resp.body };
      if (ext === 'png' && !pngMatch) pngMatch = { url, body: resp.body };

      if (svgMatch) break;
    }

    const chosen = svgMatch || pngMatch;
    if (chosen) {
      const ext = chosen === svgMatch ? 'svg' : 'png';
      const out = path.join(OUTPUT_DIR, `${slug}.${ext}`);
      fs.writeFileSync(out, chosen.body);
      results.push({ name, slug, format: ext, source: chosen.url });
      console.log(`[OK] ${slug} -> ${ext} (${chosen.url})`);
    } else {
      results.push({ name, slug, format: 'none', source: '' });
      console.log(`[MISS] ${slug}`);
    }
  }

  const lines = ['name\tslug\tformat\tsource'];
  for (const r of results) {
    lines.push(`${r.name}\t${r.slug}\t${r.format}\t${r.source}`);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sources.tsv'), `${lines.join('\n')}\n`);

  const ok = results.filter((r) => r.format !== 'none').length;
  console.log(`\nFetched logos: ${ok}/${results.length}`);
  console.log(`Source map: ${path.join(OUTPUT_DIR, 'sources.tsv')}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
