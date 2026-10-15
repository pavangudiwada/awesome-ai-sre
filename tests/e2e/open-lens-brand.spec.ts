import { expect, test } from "@playwright/test";

test("Open Lens artwork, typography, icons and responsive header", async ({ page }, testInfo) => {
  await page.goto("/");
  const header = page.locator("header").first();
  const home = header.getByRole("link", { name: "AI SRE Watchlist home", exact: true });
  await expect(home).toBeVisible();
  const isMobile = (page.viewportSize()?.width ?? 0) < 640;
  const artwork = home.locator(`img[src="/brand/${isMobile ? "mark" : "header-wordmark"}-light.svg"]`);
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveJSProperty("complete", true);
  expect(await artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await artwork.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBeGreaterThan(0);
  expect(await artwork.evaluate((image) => image.getBoundingClientRect().height)).toBe(40);
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveCSS("font-weight", "600");
  await expect(title).toHaveCSS("font-size", isMobile ? "32px" : "48px");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(23, 23, 23)");
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily)).toMatch(/Geist/i);
  await expect(page.getByRole("link", { name: "Browse all products" })).toHaveCSS("color", "rgb(29, 78, 216)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const selector of ['link[rel="icon"][href*="favicon-16.png"]', 'link[rel="apple-touch-icon"]']) {
    const icon = page.locator(selector).first();
    await expect(icon).toHaveAttribute("href", /.+/);
    const response = await page.request.get((await icon.getAttribute("href"))!);
    expect(response.ok()).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("public-brand-home-light.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(home.locator(`img[src="/brand/${isMobile ? "mark" : "header-wordmark"}-dark.svg"]`)).toBeVisible();
  await expect(artwork).toBeHidden();
  await expect(page.getByRole("link", { name: "Browse all products" })).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.screenshot({ path: testInfo.outputPath("public-brand-home-dark.png"), fullPage: true });
  await page.goto("/sign-in");
  await expect(page.locator('main [data-brand="open-lens"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("public-brand-sign-in.png"), fullPage: true });
});

test("brand clear space keeps tablet and desktop navigation within the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop browser checks intermediate responsive widths");
  await page.goto("/");
  for (const width of [640, 768, 1024, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    const home = page.locator("header").first().getByRole("link", { name: "AI SRE Watchlist home", exact: true });
    await expect(home).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No overflow at ${width}px`).toBe(true);
  }
});
