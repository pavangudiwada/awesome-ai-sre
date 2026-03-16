#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { parse } = require("node-html-parser");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "tools", "operate");
const SCREENSHOT_DIR = path.join(ROOT, "public", "screenshots");
const LOGO_DIR = path.join(ROOT, "public", "logos");
const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 800;
const TODAY = new Date().toISOString().slice(0, 10);
const STALE_DAYS = 30;
const USER_AGENT = "awesome-ai-sre-image-fetcher/1.0";

function parseArgs(argv) {
  const args = { limit: null, slug: null, force: false };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--force") {
      args.force = true;
    } else if (value === "--limit") {
      args.limit = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (value === "--slug") {
      args.slug = argv[i + 1] || null;
      i += 1;
    }
  }

  return args;
}

function getToolFiles() {
  return fs
    .readdirSync(TOOLS_DIR)
    .filter((name) => name.endsWith(".yaml") && !name.startsWith("_"))
    .sort()
    .map((name) => path.join(TOOLS_DIR, name));
}

function loadTool(filePath) {
  return yaml.load(fs.readFileSync(filePath, "utf8"));
}

function isStale(dateString) {
  if (!dateString) return true;
  const fetched = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(fetched.getTime())) return true;
  const now = new Date(`${TODAY}T00:00:00Z`);
  const diff = (now - fetched) / (1000 * 60 * 60 * 24);
  return diff > STALE_DAYS;
}

function shouldFetch(tool, force) {
  if (tool.claimed) return false;
  if (force) return true;
  if (!tool.screenshot) return true;
  return isStale(tool.screenshot_last_fetched);
}

function withTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    headers: {
      "user-agent": USER_AGENT,
      ...(options.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

function absolutize(baseUrl, value) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  try {
    const response = await withTimeout(url, { redirect: "follow" });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchBinary(url) {
  try {
    const response = await withTimeout(url, { redirect: "follow" });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType,
    };
  } catch {
    return null;
  }
}

function logoExtensionFromContentType(url, contentType) {
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/svg")) return "svg";
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "png";
    if (pathname.endsWith(".svg")) return "svg";
  } catch {}
  return null;
}

async function fetchLogoAsset(tool) {
  const html = await fetchHtml(tool.url);
  if (html) {
    const root = parse(html);
    const ogImage =
      root.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      root.querySelector('meta[name="og:image"]')?.getAttribute("content");

    const ogUrl = absolutize(tool.url, ogImage);
    if (ogUrl) {
      const asset = await fetchBinary(ogUrl);
      if (asset) {
        const ext = logoExtensionFromContentType(ogUrl, asset.contentType);
        if (ext === "png" || ext === "svg") {
          return { ext, buffer: asset.buffer };
        }
      }
    }
  }

  const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(tool.url)}`;
  const favicon = await fetchBinary(faviconUrl);
  if (favicon) {
    return { ext: "png", buffer: favicon.buffer };
  }

  return null;
}

function orderedTool(tool) {
  const result = {
    name: tool.name,
    slug: tool.slug,
    url: tool.url,
    summary: tool.summary,
    deployment: tool.deployment,
    opensource: tool.opensource,
    tags: tool.tags,
    dateAdded: tool.dateAdded,
    claimed: Boolean(tool.claimed),
  };

  if (tool.screenshot) result.screenshot = tool.screenshot;
  if (tool.logo) result.logo = tool.logo;
  if (tool.screenshot_last_fetched) result.screenshot_last_fetched = tool.screenshot_last_fetched;
  if (Array.isArray(tool.features) && tool.features.length > 0) result.features = tool.features;
  if (tool.linkedin) result.linkedin = tool.linkedin;
  if (tool.github) result.github = tool.github;
  if (tool.x) result.x = tool.x;
  if (tool.producthunt) result.producthunt = tool.producthunt;
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(LOGO_DIR, { recursive: true });

  let files = getToolFiles();
  if (args.slug) {
    files = files.filter((filePath) => path.basename(filePath, ".yaml") === args.slug);
  }
  if (Number.isInteger(args.limit) && args.limit > 0) {
    files = files.slice(0, args.limit);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const failed = [];
  const updated = [];

  try {
    for (const filePath of files) {
      const tool = loadTool(filePath);
      if (!tool || !tool.slug || !tool.url) {
        failed.push(`${path.basename(filePath)}: missing slug or url`);
        continue;
      }

      if (!shouldFetch(tool, args.force)) {
        continue;
      }

      try {
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT });
        await page.goto(tool.url, { waitUntil: "networkidle2", timeout: 30000 });
        await page.evaluate(() => window.scrollBy(0, 180));

        const screenshotPath = path.join(SCREENSHOT_DIR, `${tool.slug}.png`);
        await page.screenshot({
          path: screenshotPath,
          type: "png",
          clip: { x: 0, y: 0, width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
        });
        await page.close();

        tool.screenshot = `/screenshots/${tool.slug}.png`;
        tool.screenshot_last_fetched = TODAY;

        const logoAsset = await fetchLogoAsset(tool);
        if (logoAsset) {
          const logoPath = path.join(LOGO_DIR, `${tool.slug}.${logoAsset.ext}`);
          fs.writeFileSync(logoPath, logoAsset.buffer);
          tool.logo = `/logos/${tool.slug}.${logoAsset.ext}`;
        }

        fs.writeFileSync(
          filePath,
          yaml.dump(orderedTool(tool), {
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
          })
        );

        updated.push(tool.slug);
      } catch (error) {
        failed.push(`${tool.slug}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`Image fetch updated ${updated.length} tool(s).`);
  if (failed.length > 0) {
    console.log("Failed tools:");
    for (const entry of failed) {
      console.log(`- ${entry}`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
