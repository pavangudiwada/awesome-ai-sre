import puppeteer from 'puppeteer';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4180';
const pages = [
  { path: '/', must: ['Track the AI layer of reliable engineering.', 'Observability Stack', 'Resources'] },
  { path: '/observability', must: ['Map the telemetry stack behind reliable engineering.', 'OpenTelemetry', 'Grafana'] },
  { path: '/resources', must: ['The reading map for AI SRE and observability.', 'OpenTelemetry Blog', 'o11y news'] },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
const results = [];
for (const spec of pages) {
  const url = `${base}${spec.path}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  const text = await page.evaluate(() => document.body.innerText);
  const scripts = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src).filter(Boolean));
  const missing = spec.must.filter((needle) => !text.includes(needle));
  const safeName = spec.path === '/' ? 'home' : spec.path.slice(1).replace(/\W+/g, '-');
  const screenshot = `/tmp/ai-sre-watchlist-${safeName}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ path: spec.path, title: await page.title(), scripts, missing, screenshot });
}
await browser.close();

for (const result of results) {
  console.log(`${result.path} :: ${result.missing.length ? `MISSING ${result.missing.join(' | ')}` : 'PASS'} :: ${result.screenshot}`);
  console.log(`scripts=${result.scripts.join(',')}`);
}
if (results.some((result) => result.missing.length)) process.exit(1);
