#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const matter = require("gray-matter");
const yaml = require("js-yaml");

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, "tools", "operate");
const OBSERVABILITY_PATH = path.join(ROOT, "src", "data", "observability.js");
const RESOURCES_DIR = path.join(ROOT, "content", "resources");
const README_PATH = path.join(ROOT, "README.md");
const SITE_URL = "https://aisrewatchlist.vercel.app";
const REPOSITORY_URL = "https://github.com/pavangudiwada/awesome-ai-sre";

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
const TAG_LABELS = {
  Observability: "AI-powered observability",
};

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function isValidDate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function getFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        !name.startsWith("_") &&
        extensions.some((extension) => name.endsWith(extension))
    )
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .map((name) => path.join(dir, name));
}

function loadTool(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const tool = yaml.load(raw);

  if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
    throw new Error(`Invalid YAML object in ${filePath}`);
  }

  tool.tags = Array.isArray(tool.tags) ? tool.tags.map((tag) => String(tag)) : [];
  return tool;
}

function loadResource(filePath) {
  const { data } = matter(fs.readFileSync(filePath, "utf8"));

  if (data.kind !== "resource" || data.status !== "published") {
    return null;
  }

  if (!data.title || !data.slug || !data.description) {
    throw new Error(`Published resource is missing README metadata in ${filePath}`);
  }

  return data;
}

function loadObservabilityTools(filePath) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/export const/g, "const")
    .concat("\nOBSERVABILITY_TOOLS;");
  const tools = vm.runInNewContext(source, {}, { filename: filePath });

  if (!Array.isArray(tools)) {
    throw new Error(`Observability catalog must export an array in ${filePath}`);
  }

  return tools;
}

function buildToolLink(tool) {
  const marker = tool.opensource ? "💚 " : "";
  return `${marker}[${cleanText(tool.name)}](${SITE_URL}/tools/${tool.slug})`;
}

function buildToolItem(tool) {
  const links = [`[Website](${tool.url})`];
  if (tool.github) links.push(`[GitHub](${tool.github})`);

  return `- ${buildToolLink(tool)} — ${cleanText(tool.summary)} ${links.join(" · ")}`;
}

function buildObservabilityLink(tool) {
  const marker = tool.ossStatus === "Open source" ? "💚 " : "";
  return `${marker}[${cleanText(tool.name)}](${SITE_URL}/observability/${tool.slug})`;
}

function buildObservabilityItem(tool) {
  const links = [`[Website](${tool.url})`];
  if (tool.links?.github) links.push(`[GitHub](${tool.links.github})`);

  return `- ${buildObservabilityLink(tool)} — ${cleanText(tool.summary)} ${links.join(" · ")}`;
}

function parseAddedDate(value) {
  if (!isValidDate(value)) return null;
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
    .sort(
      (a, b) =>
        b.dateAdded.localeCompare(a.dateAdded) ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    );

  const withinDays = (dayLimit) =>
    datedTools.filter((tool) => {
      const age = daysSince(parseAddedDate(tool.dateAdded), now);
      return age >= 0 && age <= dayLimit;
    });

  const lastWeek = withinDays(7);
  const rangeDays = lastWeek.length >= 1 && lastWeek.length <= 2 ? 14 : 7;

  return { tools: withinDays(rangeDays).slice(0, 5), rangeDays };
}

function anchorForTag(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildReadme(tools, observabilityTools, resources) {
  const groups = new Map(TAG_ORDER.map((tag) => [tag, []]));

  for (const tool of tools) {
    const primaryTag = tool.tags[0] || "Other";
    const bucket = groups.get(primaryTag) || groups.get("Other");
    bucket.push(tool);
  }

  const jumpLinks = TAG_ORDER
    .filter((tag) => groups.get(tag).length > 0)
    .map((tag) => {
      const label = TAG_LABELS[tag] || tag;
      return `[${label}](#${anchorForTag(label)})`;
    })
    .join(" · ");

  const lines = [
    "![Awesome AI SRE](assets/header-image.png)",
    "",
    "# Awesome AI SRE",
    "",
    "A curated directory of AI-powered tools and practical resources for site reliability engineering, incident response, observability, and AIOps.",
    "",
    `**[Explore the AI SRE Watchlist](${SITE_URL})** for searchable profiles, filters, evidence, and evaluation guides.`,
    "",
    `[Browse tools](${SITE_URL}/tools) · [Read resources](${SITE_URL}/resources) · [See the methodology](${SITE_URL}/methodology) · [Get updates](${SITE_URL}/updates)`,
    "",
    "Jump to: [AI SRE tools](#ai-sre-tools) · [Observability tools](#observability-tools) · [Resources](#resources)",
    "",
    "If this project is useful, please consider giving it a ⭐.",
    "",
    "> This README is generated from the catalog and published resources in this repository. Edit the source files, then run `npm run generate:readme`.",
    "",
    '<a id="ai-sre-tools"></a>',
    "## AI SRE tools",
    "",
    `Browse all ${tools.length} AI SRE tools on the **[Watchlist website](${SITE_URL}/tools)** for richer profiles and easier comparison. 💚 marks open-source projects.`,
    "",
  ];

  if (tools.length === 0) {
    lines.push("_No tools found. Add YAML files under `tools/operate/`._");
  } else {
    const recent = selectRecentTools(tools);
    if (recent.tools.length > 0) {
      lines.push(`### Recent additions (last ${recent.rangeDays} days)`);
      lines.push("");
      for (const tool of recent.tools) {
        lines.push(`- ${tool.dateAdded} — ${buildToolLink(tool)} (${tool.tags[0] || "Other"})`);
      }
      lines.push("");
    }

    lines.push(jumpLinks);

    for (const tag of TAG_ORDER) {
      const sectionTools = groups.get(tag);
      if (!sectionTools || sectionTools.length === 0) continue;
      const label = TAG_LABELS[tag] || tag;

      lines.push("");
      lines.push(`<a id="${anchorForTag(label)}"></a>`);
      lines.push(`### ${label} (${sectionTools.length})`);
      lines.push("");
      for (const tool of sectionTools) {
        lines.push(buildToolItem(tool));
      }
    }
  }

  lines.push("");
  lines.push('<a id="observability-tools"></a>');
  lines.push("## Observability tools");
  lines.push("");
  lines.push(
    `Browse all ${observabilityTools.length} observability tools on the **[Observability directory](${SITE_URL}/observability)**. This catalog covers telemetry standards, collectors, storage, monitoring, and visualization tools separately from AI SRE products.`
  );
  lines.push("");

  if (observabilityTools.length === 0) {
    lines.push("_No observability tools found._");
  } else {
    for (const tool of observabilityTools) {
      lines.push(buildObservabilityItem(tool));
    }
  }

  lines.push("");
  lines.push('<a id="resources"></a>');
  lines.push("## Resources");
  lines.push("");
  lines.push(
    `Practical, evidence-led material for evaluating AI SRE products. **[Browse the full resource library](${SITE_URL}/resources)**.`
  );
  lines.push("");

  if (resources.length === 0) {
    lines.push("_No published resources found._");
  } else {
    for (const resource of resources) {
      lines.push(
        `- [${cleanText(resource.title)}](${SITE_URL}/resources/${resource.slug}) — ${cleanText(resource.description)}`
      );
    }
  }

  lines.push("");
  lines.push("## Contributing");
  lines.push("");
  lines.push(
    `Suggestions and corrections are welcome. [Open an issue](${REPOSITORY_URL}/issues/new/choose) or add a tool record under \`tools/operate/\`; catalog changes are reviewed before publication.`
  );
  lines.push("");
  lines.push(
    `The GitHub list is a quick overview. **[Visit AI SRE Watchlist](${SITE_URL})** for the complete browsing and evaluation experience.`
  );
  lines.push("");
  lines.push("## License");
  lines.push("");
  lines.push("[MIT](LICENSE)");

  return `${lines.join("\n")}\n`;
}

function main() {
  const tools = getFiles(TOOLS_DIR, [".yaml", ".yml"])
    .map(loadTool)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const observabilityTools = loadObservabilityTools(OBSERVABILITY_PATH).sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );

  const resources = getFiles(RESOURCES_DIR, [".mdx"])
    .map(loadResource)
    .filter(Boolean)
    .sort(
      (a, b) =>
        String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")) ||
        String(a.title).localeCompare(String(b.title), "en", { sensitivity: "base" })
    );

  fs.writeFileSync(
    README_PATH,
    buildReadme(tools, observabilityTools, resources),
    "utf8"
  );
  console.log(
    `README.md generated with ${tools.length} AI SRE tool(s), ${observabilityTools.length} observability tool(s), and ${resources.length} resource(s).`
  );
}

main();
