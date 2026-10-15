import { expect, test } from "@playwright/test";

test.describe("public project community links", () => {
  test("GitHub stars and brand LinkedIn are visible in the first viewport", async ({ page }) => {
    await page.route("**/api/repository-stats", (route) => route.fulfill({
      json: { stars: 75, checkedAt: "2026-10-15T00:00:00Z" },
    }));
    await page.goto("/companies");
    const github = page.getByRole("link", { name: "Open-source project on GitHub, 75 stars" });
    const linkedin = page.getByRole("link", { name: "Follow AI SRE Watchlist on LinkedIn" });
    for (const link of [github, linkedin]) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThan(page.viewportSize()!.height);
    }
    await expect(github).toHaveAttribute("href", "https://github.com/pavangudiwada/awesome-ai-sre");
    await expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/company/112729107/");
    const search = page.getByRole("button", { name: "Search tools and resources" });
    const searchBox = await search.boundingBox();
    const githubBox = await github.boundingBox();
    const linkedinBox = await linkedin.boundingBox();
    expect(Math.abs(searchBox!.y - githubBox!.y)).toBeLessThan(2);
    expect(Math.abs(searchBox!.y - linkedinBox!.y)).toBeLessThan(2);
    expect(githubBox!.x).toBeGreaterThan(searchBox!.x);
    expect(linkedinBox!.x).toBeGreaterThan(githubBox!.x);
    await expect(page.getByText(/Sources checked|Source check date unknown/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("failed star request leaves working links and no fabricated count", async ({ page }) => {
    await page.route("**/api/repository-stats", (route) => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
    await page.goto("/companies");
    const github = page.getByRole("link", { name: "Open-source project on GitHub", exact: true });
    await expect(github).toContainText("View stars");
    await expect(page.getByRole("link", { name: "Follow AI SRE Watchlist on LinkedIn" })).toBeVisible();
    await page.getByRole("button", { name: "Search tools and resources" }).focus();
    await page.keyboard.press("Tab");
    // Search is followed immediately by the community actions.
    await expect(github).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Follow AI SRE Watchlist on LinkedIn" })).toBeFocused();
  });
});
