import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export async function openRoute(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });

  expect(response, `Expected ${path} to return a document response`).not.toBeNull();
  expect(response!.status(), `Expected ${path} not to return an error status`).toBeLessThan(400);
  await page.waitForLoadState("load");
  // Do not wait for global network idleness: analytics, images, or the dev
  // server may keep a connection active after the document is usable. The app
  // provider exposes a deterministic post-hydration signal so client controls
  // cannot be exercised while they are still inert SSR markup.
  await expect(page.locator("html")).toHaveAttribute("data-app-hydrated", "true");
  await expect(page.locator('main:not([aria-busy="true"])')).toBeVisible();
}

export async function expectPublicPageGuardrails(
  page: Page,
  testInfo: TestInfo,
) {
  await expectNoHorizontalOverflow(page, testInfo);
  await expect(page.getByText(/\bVerified\b/i)).toHaveCount(0);

  // The retired directory rail rendered Category as a heading inside an aside.
  // Profile research asides remain valid, so the assertion is intentionally narrow.
  await expect(page.locator("aside").getByText(/^Category$/i)).toHaveCount(0);
}

export async function expectNoHorizontalOverflow(
  page: Page,
  testInfo: TestInfo,
) {
  const measurements = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  if (testInfo.project.name === "mobile") {
    expect(
      measurements.viewportWidth,
      "The configured mobile project is the required 390px QA viewport",
    ).toBe(390);
  }

  expect(
    Math.max(measurements.documentWidth, measurements.bodyWidth),
    `Page overflows its ${measurements.viewportWidth}px viewport`,
  ).toBeLessThanOrEqual(measurements.viewportWidth + 1);
}

export async function expectMinimumTouchTarget(
  target: Locator,
  label: string,
  minimum = 44,
) {
  await expect(target, `${label} should be visible`).toBeVisible();
  const box = await target.boundingBox();

  expect(box, `${label} should have a rendered box`).not.toBeNull();
  expect(box!.width, `${label} should be at least ${minimum}px wide`).toBeGreaterThanOrEqual(minimum);
  expect(box!.height, `${label} should be at least ${minimum}px tall`).toBeGreaterThanOrEqual(minimum);
}

export async function expectImageHasNaturalSize(image: Locator, label: string) {
  await expect(image, `${label} should render as an image`).toBeVisible();

  const dimensions = await image.evaluate(async (node) => {
    const element = node as HTMLImageElement;

    if (!element.complete) {
      await new Promise<void>((resolve) => {
        element.addEventListener("load", () => resolve(), { once: true });
        element.addEventListener("error", () => resolve(), { once: true });
      });
    }

    return {
      currentSrc: element.currentSrc || element.src,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
    };
  });

  expect(dimensions.currentSrc, `${label} should have a real source`).not.toBe("");
  expect(dimensions.naturalWidth, `${label} should decode with a non-zero naturalWidth`).toBeGreaterThan(0);
  expect(dimensions.naturalHeight, `${label} should decode with a non-zero naturalHeight`).toBeGreaterThan(0);
}

export async function expectBellWithoutFakeUnread(page: Page) {
  const bell = page.getByRole("button", { name: "Open updates", exact: true });

  await expectMinimumTouchTarget(bell, "Updates Bell");
  await expect(bell.locator('[data-slot="badge"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /unread/i })).toHaveCount(0);

  return bell;
}
