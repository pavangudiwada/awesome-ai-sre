#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, 'tools', 'operate');
const README_PATH = path.join(__dirname, 'README.md');
const ICON_ASSETS = {
  website: 'assets/icons/website.svg',
  oss: 'assets/icons/oss.svg',
  github: 'assets/icons/github.svg',
  linkedin: 'assets/icons/linkedin.svg',
  x: 'assets/icons/x.svg',
  producthunt: 'assets/icons/producthunt.svg'
};

const REQUIRED_FIELDS = ['name', 'website', 'summary', 'deployment', 'open_source'];
const CANONICAL_DEPLOYMENTS = new Map([
  ['saas', 'SaaS'],
  ['on-prem', 'On-Prem'],
  ['hybrid', 'Hybrid']
]);
const VALID_LINK_KEYS = new Set(['github', 'linkedin', 'x', 'producthunt']);

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, '\\|');
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

function parsePhase1Yaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const data = {};
  let section = null;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      continue;
    }

    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.trim();

    if (indent === 0) {
      const topMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!topMatch) {
        throw new Error(`Invalid top-level YAML line in ${filePath}: "${rawLine}"`);
      }

      const key = topMatch[1];
      const rest = topMatch[2];

      if (rest === '') {
        if (key === 'deployment') {
          data.deployment = [];
          section = 'deployment';
        } else if (key === 'features') {
          data.features = [];
          section = 'features';
        } else if (key === 'links') {
          data.links = {};
          section = 'links';
        } else {
          throw new Error(`Unsupported nested section "${key}" in ${filePath}`);
        }
      } else {
        data[key] = parseScalar(rest);
        section = null;
      }

      continue;
    }

    if (indent === 2 && section === 'deployment') {
      const listMatch = line.match(/^-\s+(.*)$/);
      if (!listMatch) {
        throw new Error(`Invalid deployment list line in ${filePath}: "${rawLine}"`);
      }
      data.deployment.push(parseScalar(listMatch[1]));
      continue;
    }

    if (indent === 2 && section === 'features') {
      const listMatch = line.match(/^-\s+(.*)$/);
      if (!listMatch) {
        throw new Error(`Invalid features list line in ${filePath}: "${rawLine}"`);
      }
      data.features.push(parseScalar(listMatch[1]));
      continue;
    }

    if (indent === 2 && section === 'links') {
      const linkMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+)$/);
      if (!linkMatch) {
        throw new Error(`Invalid links line in ${filePath}: "${rawLine}"`);
      }
      data.links[linkMatch[1]] = parseScalar(linkMatch[2]);
      continue;
    }

    throw new Error(`Unsupported indentation or structure in ${filePath}: "${rawLine}"`);
  }

  return data;
}

function getYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getYamlFiles(fullPath));
    } else if (
      entry.isFile() &&
      !entry.name.startsWith('_') &&
      (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateTool(tool, filePath) {
  for (const field of REQUIRED_FIELDS) {
    if (tool[field] === undefined || tool[field] === null || tool[field] === '') {
      throw new Error(`Missing required field "${field}" in ${filePath}`);
    }
  }

  if (!Array.isArray(tool.deployment) || tool.deployment.length === 0) {
    throw new Error(`"deployment" must be a non-empty list in ${filePath}`);
  }

  tool.deployment = tool.deployment.map((value) => {
    const normalized = String(value).trim().toLowerCase();
    const canonical = CANONICAL_DEPLOYMENTS.get(normalized);
    if (!canonical) {
      throw new Error(`Invalid deployment "${value}" in ${filePath}. Allowed: saas, on-prem, hybrid`);
    }
    return canonical;
  });

  if (typeof tool.open_source !== 'boolean') {
    throw new Error(`"open_source" must be true/false in ${filePath}`);
  }

  if (tool.features !== undefined) {
    if (!Array.isArray(tool.features)) {
      throw new Error(`"features" must be a list in ${filePath}`);
    }
    if (tool.features.length > 3) {
      throw new Error(`"features" supports at most 3 items in ${filePath}`);
    }
  }

  if (tool.links !== undefined) {
    if (typeof tool.links !== 'object' || Array.isArray(tool.links)) {
      throw new Error(`"links" must be a map in ${filePath}`);
    }

    for (const key of Object.keys(tool.links)) {
      if (!VALID_LINK_KEYS.has(key)) {
        throw new Error(
          `Unsupported link key "${key}" in ${filePath}. Allowed: ${Array.from(VALID_LINK_KEYS).join(', ')}`
        );
      }
    }
  }
}

function deploymentForReadme(deployments) {
  if (!Array.isArray(deployments) || deployments.length === 0) return '-';
  const unique = Array.from(new Set(deployments));
  if (unique.length > 1) return 'Multi';
  return unique[0];
}

function buildIconLinks(tool) {
  const links = tool.links || {};

  const icon = (alt, src, url) => `[<img alt="${alt}" src="${src}" width="16" />](${url})`;
  const hasIcon = (key) => fs.existsSync(path.join(__dirname, ICON_ASSETS[key]));
  const renderIconLink = (key, alt, url) => {
    if (!url || !hasIcon(key)) return null;
    return icon(alt, ICON_ASSETS[key], url);
  };

  const result = [];
  const ordered = [
    renderIconLink('website', 'Website', tool.website),
    renderIconLink('github', 'GitHub', links.github),
    renderIconLink('linkedin', 'LinkedIn', links.linkedin),
    renderIconLink('x', 'X', links.x),
    renderIconLink('producthunt', 'Product Hunt', links.producthunt)
  ];

  for (const item of ordered) {
    if (item) result.push(item);
  }

  return result.length > 0 ? result.join(' ') : '-';
}

function buildNameCell(tool) {
  const nameLink = `[${escapeMarkdown(tool.name)}](${tool.website})`;
  if (tool.open_source) {
    return `:green_heart:${nameLink}`;
  }
  return nameLink;
}

function buildReadme(tools) {
  const lines = [
    '![Awesome AI SRE](assets/header-image.png)',
    '',
    '# Awesome AI SRE',
    '',
    'Curated AI SRE & Operations Tools for Reliability, Observability & Incident Response',
    '',
    'If this repository is useful, please consider starring :star: it.',
    '',
    '## Tools',
    '',
    'Items with :green_heart: indicate open source projects.',
    '',
    '> AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.',
    '> Auto-generated by CI workflow or pre-commit hooks using `node generate-readme.js`.',
    '',
    '| Name | Summary | Deployment | Links |',
    '| --- | --- | --- | --- |'
  ];

  if (tools.length === 0) {
    lines.push('| _No tools found_ | Add YAML files under `tools/operate/`. | - | - |');
    return `${lines.join('\n')}\n`;
  }

  for (const tool of tools) {
    const name = buildNameCell(tool);
    const summary = escapeMarkdown(tool.summary);
    const deployment = escapeMarkdown(deploymentForReadme(tool.deployment));
    const linkIcons = buildIconLinks(tool);

    lines.push(`| ${name} | ${summary} | ${deployment} | ${linkIcons} |`);
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const files = getYamlFiles(TOOLS_DIR).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  const tools = files.map((filePath) => {
    const tool = parsePhase1Yaml(filePath);
    validateTool(tool, filePath);
    return tool;
  });

  tools.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const output = buildReadme(tools);
  fs.writeFileSync(README_PATH, output, 'utf8');
  console.log(`README.md generated with ${tools.length} tool(s).`);
}

main();
