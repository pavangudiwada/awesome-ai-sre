#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const root = path.resolve(__dirname, "..");
const toolsDir = path.join(root, "tools", "operate");
const outDir = path.join(root, "public", "favicons");
const force = process.argv.includes("--force");

async function fetchIcon(url) {
  const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
  const res = await fetch(iconUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function listYamlFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".yaml") && !name.startsWith("_"))
    .map((name) => path.join(dir, name));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const files = listYamlFiles(toolsDir);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const slug = path.basename(filePath, ".yaml");
    const outPath = path.join(outDir, `${slug}.png`);

    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      skipped += 1;
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    let parsed;

    try {
      parsed = yaml.load(raw);
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${slug}: yaml parse error (${error.message})`);
      continue;
    }

    const website = parsed && parsed.website;
    if (!website) {
      failed += 1;
      console.error(`[fail] ${slug}: missing website`);
      continue;
    }

    try {
      const icon = await fetchIcon(website);
      fs.writeFileSync(outPath, icon);
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${slug}: ${error.message}`);
    }
  }

  console.log(`Favicons fetched: ${ok}, skipped existing: ${skipped}, failed: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
