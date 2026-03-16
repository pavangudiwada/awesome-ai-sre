#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, "tools", "operate");
const README_PATH = path.join(ROOT, "README.md");
const ICON_ASSETS = {
  website: "assets/icons/website.svg",
  oss: "assets/icons/oss.svg",
  github: "assets/icons/github.svg",
  linkedin: "assets/icons/linkedin.svg",
  x: "assets/icons/x.svg",
  producthunt: "assets/icons/producthunt.svg",
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAG_ORDER = [
  "Incident Response",
  "Observability",
  "AIOps",
  "IDP",
  "IaC",
  "FinOps",
  "Security",
  "Deployment",
  "Other",
];

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|");
}

function isValidDate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function normalizeDeployment(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value) {
    return [String(value)];
  }
  return [];
}

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

function loadTool(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const tool = yaml.load(raw);

  if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
    throw new Error(`Invalid YAML object in ${filePath}`);
  }

  tool.deployment = normalizeDeployment(tool.deployment);
  tool.tags = Array.isArray(tool.tags) ? tool.tags.map((tag) => String(tag)) : [];
  return tool;
}

function deploymentForReadme(deployments) {
  if (!Array.isArray(deployments) || deployments.length === 0) return "-";
  const unique = Array.from(new Set(deployments.map((item) => String(item).trim())));
  if (unique.length > 1) return "Multi";
  const value = unique[0].toLowerCase();
  if (value === "saas") return "SaaS";
  if (value === "on-prem") return "On-Prem";
  if (value === "hybrid") return "Hybrid";
  return unique[0];
}

function buildIconLinks(tool) {
  const icon = (alt, src, url) => `[<img alt="${alt}" src="${src}" width="16" />](${url})`;
  const hasIcon = (key) => fs.existsSync(path.join(ROOT, ICON_ASSETS[key]));
  const renderIconLink = (key, alt, url) => {
    if (!url || !hasIcon(key)) return null;
    return icon(alt, ICON_ASSETS[key], url);
  };

  const ordered = [
    renderIconLink("website", "Website", tool.url),
    renderIconLink("github", "GitHub", tool.github),
    renderIconLink("linkedin", "LinkedIn", tool.linkedin),
    renderIconLink("x", "X", tool.x),
    renderIconLink("producthunt", "Product Hunt", tool.producthunt),
  ];

  return ordered.filter(Boolean).join(" ") || "-";
}

function buildNameCell(tool) {
  const nameLink = `[${escapeMarkdown(tool.name)}](${tool.url})`;
  return tool.opensource ? `:green_heart:${nameLink}` : nameLink;
}

function parseAddedDate(value) {
  if (!isValidDate(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00Z`);
}

function daysSince(date, now = new Date()) {
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcNow - utcDate) / 86400000);
}

function selectRecentTools(tools, now = new Date()) {
  const datedTools = tools
    .filter((tool) => parseAddedDate(tool.dateAdded))
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const withinDays = (dayLimit) =>
    datedTools.filter((tool) => {
      const parsed = parseAddedDate(tool.dateAdded);
      if (!parsed) return false;
      const age = daysSince(parsed, now);
      return age >= 0 && age <= dayLimit;
    });

  const lastWeek = withinDays(7);
  const expanded = lastWeek.length >= 1 && lastWeek.length <= 2 ? withinDays(14) : lastWeek;

  return {
    tools: expanded.slice(0, 5),
    rangeDays: lastWeek.length >= 1 && lastWeek.length <= 2 ? 14 : 7,
  };
}

function anchorForTag(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildReadme(tools) {
  const groups = new Map(TAG_ORDER.map((tag) => [tag, []]));

  for (const tool of tools) {
    const primaryTag = tool.tags[0] || "Other";
    const bucket = groups.get(primaryTag) || groups.get("Other");
    bucket.push(tool);
  }

  const jumpLinks = TAG_ORDER
    .filter((tag) => groups.get(tag).length > 0)
    .map((tag) => `[${tag}](#${anchorForTag(tag)})`)
    .join(" | ");

  const lines = [
    "![Awesome AI SRE](assets/header-image.png)",
    "",
    "If this repository is useful, please consider starring :star: it.",
    "",
    "## Tools",
    "",
    "Items with :green_heart: indicate open source projects.",
    "",
    "> AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.",
    "> Auto-generated by CI workflow or pre-commit hooks using `node generate-readme.js`.",
    "",
  ];

  if (tools.length === 0) {
    lines.push("| Name | Summary | Deployment | Links |");
    lines.push("| --- | --- | --- | --- |");
    lines.push("| _No tools found_ | Add YAML files under `tools/operate/`. | - | - |");
    return `${lines.join("\n")}\n`;
  }

  const recent = selectRecentTools(tools);
  if (recent.tools.length > 0) {
    lines.push(`### Recent Additions (Last ${recent.rangeDays} Days)`);
    lines.push("");
    for (const tool of recent.tools) {
      lines.push(`- ${tool.dateAdded} - ${buildNameCell(tool)} (${tool.tags[0] || "Other"})`);
    }
    lines.push("");
  }

  lines.push(`Jump to: ${jumpLinks}`);

  for (const tag of TAG_ORDER) {
    const sectionTools = groups.get(tag);
    if (!sectionTools || sectionTools.length === 0) continue;

    lines.push("");
    lines.push(`<a id="${anchorForTag(tag)}"></a>`);
    lines.push(`### ${tag} (${sectionTools.length})`);
    lines.push("");
    lines.push("| Name | Summary | Deployment | Links |");
    lines.push("| --- | --- | --- | --- |");

    for (const tool of sectionTools) {
      lines.push(
        `| ${buildNameCell(tool)} | ${escapeMarkdown(tool.summary)} | ${escapeMarkdown(
          deploymentForReadme(tool.deployment)
        )} | ${buildIconLinks(tool)} |`
      );
    }

    lines.push("");
    lines.push('<p align="left"><a href="#tools">Back to top ↑</a></p>');
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const tools = getYamlFiles(TOOLS_DIR)
    .map(loadTool)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const output = buildReadme(tools);
  fs.writeFileSync(README_PATH, output, "utf8");
  console.log(`README.md generated with ${tools.length} tool(s).`);
}

main();
