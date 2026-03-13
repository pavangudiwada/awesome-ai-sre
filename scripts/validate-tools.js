#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(ROOT, 'tools', 'operate');

const REQUIRED_FIELDS = ['name', 'website', 'summary', 'tags', 'deployment', 'open_source'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'name',
  'website',
  'summary',
  'added_at',
  'tags',
  'deployment',
  'open_source',
  'features',
  'links'
]);
const ALLOWED_DEPLOYMENTS = new Set(['saas', 'on-prem', 'hybrid']);
const ALLOWED_TAGS = new Set([
  'incident-response',
  'observability',
  'automation',
  'infrastructure',
  'cost-optimization',
  'security'
]);
const ALLOWED_LINK_KEYS = new Set(['github', 'linkedin', 'x', 'producthunt']);
const USER_AGENT = 'awesome-ai-sre-validator/1.0';
const TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

function getYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('_') && (name.endsWith('.yaml') || name.endsWith('.yml')))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map((name) => path.join(dir, name));
}

function parseScalar(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function parseYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const data = {};
  let section = null;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.trim();

    if (indent === 0) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!m) throw new Error(`Invalid top-level YAML line: "${rawLine}"`);
      const key = m[1];
      const rest = m[2];

      if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
        throw new Error(`Unsupported top-level key "${key}"`);
      }

      if (rest === '') {
        if (key === 'deployment' || key === 'features' || key === 'tags') {
          data[key] = [];
          section = key;
        } else if (key === 'links') {
          data.links = {};
          section = 'links';
        } else {
          throw new Error(`Key "${key}" cannot be an empty section`);
        }
      } else {
        data[key] = parseScalar(rest);
        section = null;
      }
      continue;
    }

    if (indent === 2 && (section === 'deployment' || section === 'features' || section === 'tags')) {
      const m = line.match(/^-\s+(.*)$/);
      if (!m) throw new Error(`Invalid list line under ${section}: "${rawLine}"`);
      data[section].push(parseScalar(m[1]));
      continue;
    }

    if (indent === 2 && section === 'links') {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+)$/);
      if (!m) throw new Error(`Invalid links line: "${rawLine}"`);
      data.links[m[1]] = parseScalar(m[2]);
      continue;
    }

    throw new Error(`Unsupported indentation/structure: "${rawLine}"`);
  }

  return data;
}

function isValidUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateFileName(filePath, errors) {
  const base = path.basename(filePath);
  if (!/^[a-z0-9][a-z0-9-]*\.(yaml|yml)$/.test(base)) {
    errors.push(`${base}: filename should be lowercase kebab-case with .yaml/.yml`);
  }
}

function validateTool(tool, filePath, errors) {
  const base = path.basename(filePath);

  for (const field of REQUIRED_FIELDS) {
    if (tool[field] === undefined || tool[field] === null || tool[field] === '') {
      errors.push(`${base}: missing required field "${field}"`);
    }
  }

  if (tool.website && !isValidUrl(tool.website)) {
    errors.push(`${base}: invalid website URL`);
  }

  if (!Array.isArray(tool.tags) || tool.tags.length === 0) {
    errors.push(`${base}: tags must be a non-empty list`);
  } else {
    for (const t of tool.tags) {
      const tag = String(t).trim().toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        errors.push(
          `${base}: invalid tag "${t}" (allowed: incident-response, observability, automation, infrastructure, cost-optimization, security)`
        );
      }
    }
  }

  if (!Array.isArray(tool.deployment) || tool.deployment.length === 0) {
    errors.push(`${base}: deployment must be a non-empty list`);
  } else {
    for (const d of tool.deployment) {
      const v = String(d).toLowerCase();
      if (!ALLOWED_DEPLOYMENTS.has(v)) {
        errors.push(`${base}: invalid deployment "${d}" (allowed: saas, on-prem, hybrid)`);
      }
    }
  }

  if (typeof tool.open_source !== 'boolean') {
    errors.push(`${base}: open_source must be true/false`);
  }

  if (tool.added_at !== undefined) {
    if (typeof tool.added_at !== 'string' || !ISO_DATE_RE.test(tool.added_at)) {
      errors.push(`${base}: added_at must be in YYYY-MM-DD format`);
    } else if (Number.isNaN(new Date(`${tool.added_at}T00:00:00Z`).getTime())) {
      errors.push(`${base}: added_at must be a valid calendar date`);
    }
  }

  if (tool.features !== undefined) {
    if (!Array.isArray(tool.features)) {
      errors.push(`${base}: features must be a list`);
    } else if (tool.features.length > 3) {
      errors.push(`${base}: features supports at most 3 items`);
    }
  }

  if (tool.links !== undefined) {
    if (typeof tool.links !== 'object' || Array.isArray(tool.links)) {
      errors.push(`${base}: links must be a map`);
    } else {
      for (const [key, url] of Object.entries(tool.links)) {
        if (!ALLOWED_LINK_KEYS.has(key)) {
          errors.push(`${base}: invalid links key "${key}"`);
        }
        if (!isValidUrl(url)) {
          errors.push(`${base}: invalid URL for links.${key}`);
        }
      }
    }
  }
}

function collectUrlChecks(tool, filePath) {
  const checks = [];
  const base = path.basename(filePath);

  if (tool.website && isValidUrl(tool.website)) {
    checks.push({ file: base, label: 'website', url: tool.website });
  }

  if (tool.links && typeof tool.links === 'object' && !Array.isArray(tool.links)) {
    for (const [key, url] of Object.entries(tool.links)) {
      if (isValidUrl(url)) {
        checks.push({ file: base, label: `links.${key}`, url });
      }
    }
  }

  return checks;
}

async function checkUrlReachable(url) {
  const methods = ['HEAD', 'GET'];

  for (const method of methods) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT }
      });

      const s = res.status;
      if ((s >= 200 && s < 400) || s === 401 || s === 403 || s === 405 || s === 429) {
        return { ok: true, status: s };
      }

      if (method === 'HEAD' && s === 405) {
        continue;
      }

      return { ok: false, status: s, reason: `HTTP ${s}` };
    } catch (err) {
      if (method === 'HEAD') {
        continue;
      }
      return { ok: false, reason: err.message || 'network error' };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: 'request failed' };
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = idx;
      idx += 1;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const checkLinks = args.has('--check-links');

  const files = getYamlFiles(TOOLS_DIR);
  const errors = [];
  const seenNames = new Map();
  const urlChecks = [];

  for (const file of files) {
    validateFileName(file, errors);

    let tool;
    try {
      tool = parseYaml(file);
    } catch (err) {
      errors.push(`${path.basename(file)}: ${err.message}`);
      continue;
    }

    validateTool(tool, file, errors);
    urlChecks.push(...collectUrlChecks(tool, file));

    if (tool.name) {
      const key = String(tool.name).toLowerCase();
      if (seenNames.has(key)) {
        errors.push(
          `${path.basename(file)}: duplicate tool name "${tool.name}" also seen in ${path.basename(seenNames.get(key))}`
        );
      } else {
        seenNames.set(key, file);
      }
    }
  }

  if (checkLinks && errors.length === 0) {
    const results = await runWithConcurrency(urlChecks, CONCURRENCY, async (target) => {
      const result = await checkUrlReachable(target.url);
      return { ...target, ...result };
    });

    for (const r of results) {
      if (!r.ok) {
        errors.push(`${r.file}: unreachable ${r.label} (${r.url}) - ${r.reason || 'failed'}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Validation failed:\n');
    for (const e of errors) {
      console.error(`- ${e}`);
    }
    process.exit(1);
  }

  console.log(
    `Validation passed for ${files.length} tool file(s).${checkLinks ? ` Checked ${urlChecks.length} URL(s).` : ''}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
