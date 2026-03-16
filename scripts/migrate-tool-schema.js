#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "tools", "operate");
const TODAY = new Date().toISOString().slice(0, 10);

const TAG_OVERRIDES = {
  "agent-sre": ["Incident Response", "AIOps", "FinOps"],
  alertd: ["Incident Response", "AIOps"],
  "autonomops-ai": ["AIOps", "Incident Response", "Observability"],
  "azure-sre-agent": ["Incident Response", "Observability", "AIOps"],
  "bacca-ai": ["Incident Response", "Observability", "AIOps"],
  beeps: ["Incident Response", "AIOps"],
  "better-stack": ["Observability", "Incident Response"],
  bigpanda: ["AIOps", "Incident Response", "Observability"],
  causely: ["Observability", "Incident Response"],
  ciroos: ["AIOps", "Incident Response", "Observability"],
  cleric: ["Incident Response", "AIOps"],
  "cloudship-ai": ["AIOps", "Deployment"],
  cokpit: ["AIOps", "Incident Response"],
  cutover: ["Deployment", "Incident Response"],
  "dagknows-inc": ["Observability", "Incident Response", "AIOps"],
  "datadog-bits-ai": ["Observability", "Incident Response", "AIOps"],
  "deductive-ai": ["Observability", "Incident Response", "AIOps"],
  deeptrace: ["Observability", "Incident Response"],
  drdroid: ["Incident Response", "Observability", "AIOps"],
  "edge-delta": ["Observability", "FinOps"],
  elastic: ["Observability", "Incident Response"],
  firehydrant: ["Incident Response"],
  "harness-incident-response": ["Incident Response", "Observability", "Deployment"],
  holmesgpt: ["AIOps", "Incident Response", "Observability"],
  "incident-io": ["Incident Response"],
  incidentfox: ["Incident Response", "Observability", "AIOps"],
  infrabase: ["Security", "IaC", "FinOps"],
  k8sgpt: ["AIOps", "Incident Response", "Deployment"],
  kagent: ["AIOps", "Deployment", "Observability"],
  komodor: ["AIOps", "Incident Response", "FinOps"],
  kura: ["AIOps", "Incident Response"],
  "lens-k8s-ide": ["Deployment", "Observability", "Incident Response"],
  lightrun: ["Observability", "Incident Response"],
  "logz-io": ["Observability", "Incident Response"],
  mezmo: ["Observability", "AIOps"],
  "neubird-ai": ["Incident Response", "AIOps"],
  "nofire-ai": ["Incident Response", "AIOps"],
  nudgebee: ["AIOps", "FinOps", "Incident Response"],
  obot: ["AIOps", "IDP"],
  "observe-inc": ["Observability", "FinOps"],
  ops0: ["IaC", "Deployment", "AIOps"],
  opscompanion: ["Incident Response", "Observability", "AIOps"],
  opsy: ["AIOps", "Incident Response"],
  pagerduty: ["Incident Response", "AIOps"],
  phoebe: ["Incident Response", "AIOps"],
  "prodrescue-ai": ["Incident Response"],
  rebase: ["IDP", "AIOps", "Deployment"],
  "resolve-ai": ["Incident Response", "AIOps"],
  robinrelay: ["Incident Response", "AIOps"],
  robusta: ["AIOps", "Incident Response", "Observability"],
  rootly: ["Incident Response", "AIOps"],
  runllm: ["Incident Response", "Observability", "AIOps"],
  runwhen: ["AIOps", "Incident Response"],
  scoutflo: ["Incident Response", "Observability", "AIOps"],
  sentry: ["Observability", "Incident Response"],
  "sherlocks-ai": ["Incident Response", "AIOps"],
  sixta: ["Observability", "Incident Response"],
  "skyflo-ai": ["Deployment", "AIOps", "Incident Response"],
  "sre-ai": ["AIOps", "Deployment", "Incident Response"],
  "sre-bench": ["AIOps", "Observability"],
  stackgen: ["IDP", "Deployment", "AIOps"],
  stakpak: ["AIOps", "Incident Response"],
  starsling: ["AIOps", "Incident Response", "Deployment"],
  steadwing: ["Incident Response", "Observability", "AIOps"],
  "tierzero-ai": ["Incident Response", "AIOps"],
  traversal: ["Incident Response", "AIOps"],
  "vibranium-labs": ["Incident Response", "AIOps"],
  vigiles: ["Incident Response"],
  "wild-moose": ["Incident Response", "AIOps"],
};

const FALLBACK_TAGS = {
  "incident-response": "Incident Response",
  observability: "Observability",
  automation: "AIOps",
  infrastructure: "Deployment",
  "cost-optimization": "FinOps",
  security: "Security",
};

function listToolFiles() {
  return fs
    .readdirSync(TOOLS_DIR)
    .filter((name) => name.endsWith(".yaml") && !name.startsWith("_"))
    .sort();
}

function pickTags(slug, existingTags) {
  if (TAG_OVERRIDES[slug]) {
    return TAG_OVERRIDES[slug];
  }

  const mapped = [];
  for (const tag of Array.isArray(existingTags) ? existingTags : []) {
    const next = FALLBACK_TAGS[String(tag).trim().toLowerCase()];
    if (next && !mapped.includes(next)) {
      mapped.push(next);
    }
  }

  return mapped.length > 0 ? mapped : ["AIOps"];
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return TODAY;
}

function migrateTool(source, slug) {
  const links = source.links && typeof source.links === "object" ? source.links : {};
  const deployment = Array.isArray(source.deployment)
    ? source.deployment
    : source.deployment
      ? [source.deployment]
      : [];

  return {
    name: source.name,
    slug,
    url: source.url || source.website,
    summary: source.summary,
    deployment,
    opensource: Boolean(source.opensource ?? source.open_source),
    tags: pickTags(slug, source.tags),
    screenshot: typeof source.screenshot === "string" ? source.screenshot : "",
    logo: typeof source.logo === "string" ? source.logo : "",
    screenshot_last_fetched:
      typeof source.screenshot_last_fetched === "string" ? source.screenshot_last_fetched : "",
    claimed: Boolean(source.claimed),
    dateAdded: normalizeDate(source.dateAdded || source.added_at),
    features: Array.isArray(source.features) ? source.features : [],
    linkedin: source.linkedin || links.linkedin || "",
    github: source.github || links.github || "",
    x: source.x || links.x || "",
    producthunt: source.producthunt || links.producthunt || "",
  };
}

function pruneEmptyFields(tool) {
  const result = {
    name: tool.name,
    slug: tool.slug,
    url: tool.url,
    summary: tool.summary,
    deployment: tool.deployment,
    opensource: tool.opensource,
    tags: tool.tags,
    dateAdded: tool.dateAdded,
    claimed: tool.claimed,
  };

  if (tool.screenshot) result.screenshot = tool.screenshot;
  if (tool.logo) result.logo = tool.logo;
  if (tool.screenshot_last_fetched) result.screenshot_last_fetched = tool.screenshot_last_fetched;
  if (tool.features.length > 0) result.features = tool.features;
  if (tool.linkedin) result.linkedin = tool.linkedin;
  if (tool.github) result.github = tool.github;
  if (tool.x) result.x = tool.x;
  if (tool.producthunt) result.producthunt = tool.producthunt;

  return result;
}

function main() {
  const files = listToolFiles();

  for (const fileName of files) {
    const fullPath = path.join(TOOLS_DIR, fileName);
    const slug = path.basename(fileName, ".yaml");
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = yaml.load(raw);

    const migrated = pruneEmptyFields(migrateTool(parsed || {}, slug));
    const output = yaml.dump(migrated, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    fs.writeFileSync(fullPath, output);
  }

  const templatePath = path.join(TOOLS_DIR, "_template.yaml");
  const template = {
    name: "Tool Name",
    slug: "tool-name",
    url: "https://example.com",
    summary: "One-line summary of what the tool does.",
    deployment: ["saas"],
    opensource: false,
    tags: ["AIOps"],
    dateAdded: TODAY,
    claimed: false,
    screenshot: "/screenshots/tool-name.png",
    logo: "/logos/tool-name.png",
    screenshot_last_fetched: TODAY,
    features: ["Feature one", "Feature two", "Feature three"],
    linkedin: "https://linkedin.com/company/example",
    github: "https://github.com/org/repo",
    x: "https://x.com/example",
    producthunt: "https://www.producthunt.com/products/example",
  };

  fs.writeFileSync(
    templatePath,
    yaml.dump(template, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    })
  );

  console.log(`Migrated ${files.length} tool files to the new schema.`);
}

main();
