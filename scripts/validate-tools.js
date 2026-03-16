#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "tools", "operate");
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USER_AGENT = "awesome-ai-sre-validator/2.0";
const TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

const REQUIRED_FIELDS = ["name", "slug", "url", "summary", "deployment", "opensource", "tags", "dateAdded"];
const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "name",
  "slug",
  "url",
  "summary",
  "deployment",
  "opensource",
  "tags",
  "screenshot",
  "logo",
  "screenshot_last_fetched",
  "claimed",
  "dateAdded",
  "features",
  "linkedin",
  "github",
  "x",
  "producthunt",
]);
const ALLOWED_DEPLOYMENTS = new Set(["saas", "on-prem", "hybrid"]);
const ALLOWED_TAGS = new Set([
  "Incident Response",
  "Observability",
  "AIOps",
  "IDP",
  "IaC",
  "FinOps",
  "Security",
  "Deployment",
]);
const ALLOWED_LINK_KEYS = ["linkedin", "github", "x", "producthunt"];

function getYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_") && (name.endsWith(".yaml") || name.endsWith(".yml")))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .map((name) => path.join(dir, name));
}

function loadYaml(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = yaml.load(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("tool file must contain a single YAML object");
  }

  return parsed;
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function normalizeDeployment(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((item) => String(item).trim().toLowerCase());
}

function validateFileName(filePath, errors) {
  const base = path.basename(filePath);
  if (!/^[a-z0-9][a-z0-9-]*\.(yaml|yml)$/.test(base)) {
    errors.push(`${base}: filename should be lowercase kebab-case with .yaml/.yml`);
  }
}

function validateTool(tool, filePath, errors) {
  const base = path.basename(filePath);
  const expectedSlug = path.basename(filePath).replace(/\.(yaml|yml)$/, "");

  for (const key of Object.keys(tool)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      errors.push(`${base}: unsupported top-level key "${key}"`);
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (tool[field] === undefined || tool[field] === null || tool[field] === "") {
      errors.push(`${base}: missing required field "${field}"`);
    }
  }

  if (tool.slug && tool.slug !== expectedSlug) {
    errors.push(`${base}: slug "${tool.slug}" must match filename "${expectedSlug}"`);
  }

  if (tool.slug && !/^[a-z0-9][a-z0-9-]*$/.test(String(tool.slug))) {
    errors.push(`${base}: slug must be lowercase kebab-case`);
  }

  if (tool.url && !isValidUrl(tool.url)) {
    errors.push(`${base}: invalid url`);
  }

  const deployments = normalizeDeployment(tool.deployment);
  if (deployments.length === 0) {
    errors.push(`${base}: deployment must be a non-empty string or list`);
  } else {
    for (const deployment of deployments) {
      if (!ALLOWED_DEPLOYMENTS.has(deployment)) {
        errors.push(`${base}: invalid deployment "${deployment}" (allowed: saas, on-prem, hybrid)`);
      }
    }
  }

  if (typeof tool.opensource !== "boolean") {
    errors.push(`${base}: opensource must be true/false`);
  }

  if (!Array.isArray(tool.tags) || tool.tags.length === 0) {
    errors.push(`${base}: tags must be a non-empty list`);
  } else {
    for (const tag of tool.tags) {
      if (!ALLOWED_TAGS.has(tag)) {
        errors.push(
          `${base}: invalid tag "${tag}" (allowed: ${Array.from(ALLOWED_TAGS).join(", ")})`
        );
      }
    }
  }

  if (!isValidDate(tool.dateAdded)) {
    errors.push(`${base}: dateAdded must be a valid YYYY-MM-DD date`);
  }

  if (tool.screenshot !== undefined && tool.screenshot !== "" && !String(tool.screenshot).startsWith("/screenshots/")) {
    errors.push(`${base}: screenshot must be blank or start with /screenshots/`);
  }

  if (tool.logo !== undefined && tool.logo !== "" && !String(tool.logo).startsWith("/logos/")) {
    errors.push(`${base}: logo must be blank or start with /logos/`);
  }

  if (tool.screenshot_last_fetched !== undefined && tool.screenshot_last_fetched !== "" && !isValidDate(tool.screenshot_last_fetched)) {
    errors.push(`${base}: screenshot_last_fetched must be blank or a valid YYYY-MM-DD date`);
  }

  if (tool.claimed !== undefined && typeof tool.claimed !== "boolean") {
    errors.push(`${base}: claimed must be true/false`);
  }

  if (tool.features !== undefined) {
    if (!Array.isArray(tool.features)) {
      errors.push(`${base}: features must be a list`);
    } else if (tool.features.length > 3) {
      errors.push(`${base}: features supports at most 3 items`);
    }
  }

  for (const key of ALLOWED_LINK_KEYS) {
    if (tool[key] !== undefined && tool[key] !== "" && !isValidUrl(tool[key])) {
      errors.push(`${base}: invalid URL for ${key}`);
    }
  }
}

function collectUrlChecks(tool, filePath) {
  const checks = [];
  const base = path.basename(filePath);

  if (tool.url && isValidUrl(tool.url)) {
    checks.push({ file: base, label: "url", url: tool.url });
  }

  for (const key of ALLOWED_LINK_KEYS) {
    if (tool[key] && isValidUrl(tool[key])) {
      checks.push({ file: base, label: key, url: tool[key] });
    }
  }

  return checks;
}

async function checkUrlReachable(url) {
  const methods = ["HEAD", "GET"];

  for (const method of methods) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });

      const status = res.status;
      if ((status >= 200 && status < 400) || status === 401 || status === 403 || status === 405 || status === 429) {
        return { ok: true, status };
      }

      if (method === "HEAD" && status === 405) {
        continue;
      }

      return { ok: false, status, reason: `HTTP ${status}` };
    } catch (error) {
      if (method === "HEAD") {
        continue;
      }

      return { ok: false, reason: error.message || "network error" };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: "request failed" };
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const checkLinks = args.has("--check-links");
  const files = getYamlFiles(TOOLS_DIR);
  const errors = [];
  const seenNames = new Map();
  const seenSlugs = new Map();
  const urlChecks = [];

  for (const file of files) {
    validateFileName(file, errors);

    let tool;
    try {
      tool = loadYaml(file);
    } catch (error) {
      errors.push(`${path.basename(file)}: ${error.message}`);
      continue;
    }

    validateTool(tool, file, errors);
    urlChecks.push(...collectUrlChecks(tool, file));

    if (tool.name) {
      const key = String(tool.name).toLowerCase();
      if (seenNames.has(key)) {
        errors.push(`${path.basename(file)}: duplicate tool name "${tool.name}" also seen in ${path.basename(seenNames.get(key))}`);
      } else {
        seenNames.set(key, file);
      }
    }

    if (tool.slug) {
      const key = String(tool.slug).toLowerCase();
      if (seenSlugs.has(key)) {
        errors.push(`${path.basename(file)}: duplicate slug "${tool.slug}" also seen in ${path.basename(seenSlugs.get(key))}`);
      } else {
        seenSlugs.set(key, file);
      }
    }
  }

  if (checkLinks && errors.length === 0) {
    const results = await runWithConcurrency(urlChecks, CONCURRENCY, async (target) => {
      const result = await checkUrlReachable(target.url);
      return { ...target, ...result };
    });

    for (const result of results) {
      if (!result.ok) {
        errors.push(`${result.file}: unreachable ${result.label} (${result.url}) - ${result.reason || "failed"}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Validation failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Validation passed for ${files.length} tool file(s).${checkLinks ? ` Checked ${urlChecks.length} URL(s).` : ""}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
