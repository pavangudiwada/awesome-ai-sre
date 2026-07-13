import { expect, test } from "@playwright/test";

import {
  expectBellWithoutFakeUnread,
  expectImageHasNaturalSize,
  expectMinimumTouchTarget,
  expectPublicPageGuardrails,
  openRoute,
} from "./support/watchlist";

const RESOURCES = [
  {
    slug: "ai-sre-incident-workflow-map",
    title: "Map AI SRE products to the incident workflow",
  },
  {
    slug: "ai-sre-pilot-scorecard",
    title: "AI SRE pilot scorecard",
  },
  {
    slug: "ai-sre-security-data-access-checklist",
    title: "AI SRE security and data-access checklist",
  },
  {
    slug: "managed-vs-self-hosted-ai-sre-architecture",
    title: "Managed vs self-hosted AI SRE architecture",
  },
  {
    slug: "replay-historical-incidents-safely",
    title: "Replay historical incidents safely",
  },
  {
    slug: "state-of-ai-sre-2026",
    title: "State of AI SRE 2026: baseline and research method",
  },
] as const;

test.describe("public Watchlist routes", () => {
  test("home exposes real research and carries search intent into the catalog", async ({ page }, testInfo) => {
    await openRoute(page, "/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the AI tools that improve reliability.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Private evaluation workspace is now available")).toBeVisible();
    await expect(page.getByText("Unknown stays unknown")).toBeVisible();

    const bell = await expectBellWithoutFakeUnread(page);
    await bell.click();
    await expect(page.getByText("No updates yet", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await expectMinimumTouchTarget(
      page.getByRole("link", { name: "Sign in", exact: true }),
      "Header Sign in action",
    );
    await expectPublicPageGuardrails(page, testInfo);

    await page.getByRole("textbox", { name: "Search the AI SRE Watchlist" }).fill("RunWhen");
    await Promise.all([
      page.waitForURL(/\/tools\?q=RunWhen$/),
      page.getByRole("button", { name: "Search", exact: true }).click(),
    ]);

    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("tools search, category toggles, and deployment filters work without a sidebar", async ({ page }, testInfo) => {
    await openRoute(page, "/tools");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Products for investigating and improving reliability",
      }),
    ).toBeVisible();

    const search = page.getByRole("textbox", { name: "Search products" });
    await search.fill("RunWhen");
    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();

    await search.clear();
    const incidentCategory = page.getByRole("radio", { name: "Show Incident AI" });
    await incidentCategory.click();
    await expect(incidentCategory).toBeChecked();
    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();

    const filters = page.getByRole("button", { name: "Filters", exact: true });
    await expectMinimumTouchTarget(filters, "Filters action");
    await filters.click();
    await expect(page.getByRole("heading", { name: "Filter products" })).toBeVisible();

    await page.getByRole("checkbox", { name: "SaaS" }).check();
    const viewResults = page.getByRole("button", { name: /View \d+ results?/ });
    await expectMinimumTouchTarget(viewResults, "Filter results action");
    await viewResults.click();

    const removeSaas = page.getByRole("button", { name: "Remove SaaS filter" });
    await expectMinimumTouchTarget(removeSaas, "Applied SaaS filter");
    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("AI product profiles keep public evidence outside the sign-in gate", async ({ page }, testInfo) => {
    await openRoute(page, "/tools/runwhen");

    await expect(page.getByRole("heading", { level: 1, name: "RunWhen" })).toBeVisible();
    await expect(page.getByText("Catalog overview", { exact: true })).toBeVisible();
    await expect(page.getByText("Evidence", { exact: true })).toBeVisible();
    await expect(page.getByText("Documented", { exact: true })).toHaveCount(3);
    await expect(
      page.getByText(/This confirms a first-party source for the capability; it is not independent performance testing/).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Official AI SRE documentation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Official security and deployment page" })).toBeVisible();
    await expect(page.getByText("Private evaluation workspace", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to use the workspace" })).toBeVisible();

    const shareHeading = page.getByRole("heading", { level: 2, name: "Share RunWhen" });
    await expect(shareHeading).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Official resources" })).toBeVisible();
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Share profile" }),
      "Primary profile share action",
    );
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Copy link" }),
      "Copy profile link action",
    );
    const linkedInShare = page.getByRole("link", {
      name: "Share RunWhen on LinkedIn (opens in a new tab)",
    });
    await expectMinimumTouchTarget(linkedInShare, "LinkedIn share action");
    const linkedInIntent = new URL((await linkedInShare.getAttribute("href"))!);
    const sharedUrl = new URL(linkedInIntent.searchParams.get("url")!);
    expect(sharedUrl.pathname).toBe("/tools/runwhen");
    expect(sharedUrl.search).toBe("");
    expect(sharedUrl.hash).toBe("");
    await expect(
      page.getByRole("link", {
        name: "Open LinkedIn for RunWhen (opens in a new tab)",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Open GitHub for RunWhen (opens in a new tab)",
      }),
    ).toBeVisible();

    if (testInfo.project.name === "mobile") {
      const shareBox = await shareHeading.boundingBox();
      const factsBox = await page.getByText("Product facts", { exact: true }).boundingBox();
      expect(shareBox).not.toBeNull();
      expect(factsBox).not.toBeNull();
      expect(shareBox!.y).toBeLessThan(factsBox!.y);
    }

    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Save RunWhen" }),
      "Save RunWhen action",
    );
    await expectMinimumTouchTarget(
      page.getByRole("link", { name: "Add to evaluation" }),
      "Add RunWhen to evaluation action",
    );
    await expectImageHasNaturalSize(
      page.getByRole("img", { name: "RunWhen product preview" }),
      "RunWhen profile screenshot",
    );
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("observability directory and detail retain the same evidence and image standards", async ({ page }, testInfo) => {
    await openRoute(page, "/observability");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the telemetry foundation behind your incident workflow",
      }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Search products" }).fill("Grafana");
    await expect(page.getByRole("link", { name: "View Grafana profile" })).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);

    await openRoute(page, "/observability/grafana");
    await expect(page.getByRole("heading", { level: 1, name: "Grafana" })).toBeVisible();
    await expect(page.getByText("Signals and use cases", { exact: true })).toBeVisible();
    await expect(page.getByText("Vendor claim", { exact: true })).toHaveCount(3);
    await expect(
      page.getByText(/The Watchlist has not independently tested this outcome/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Official website First-party source/ }),
    ).toBeVisible();
    await expect(page.getByText("Private evaluation workspace", { exact: true })).toBeVisible();
    const shareHeading = page.getByRole("heading", { level: 2, name: "Share Grafana" });
    await expect(shareHeading).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Official resources" })).toBeVisible();
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Share profile" }),
      "Grafana profile share action",
    );
    await expect(
      page.getByRole("link", {
        name: "Open Documentation for Grafana (opens in a new tab)",
      }),
    ).toBeVisible();
    if (testInfo.project.name === "mobile") {
      const shareBox = await shareHeading.boundingBox();
      const factsBox = await page.getByText("Product facts", { exact: true }).boundingBox();
      expect(shareBox).not.toBeNull();
      expect(factsBox).not.toBeNull();
      expect(shareBox!.y).toBeLessThan(factsBox!.y);
    }
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Save Grafana" }),
      "Save Grafana action",
    );
    await expectImageHasNaturalSize(
      page.getByRole("img", { name: "Grafana product preview" }),
      "Grafana profile screenshot",
    );
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("resources index publishes all six owned resources and opens a substantive detail", async ({ page }, testInfo) => {
    await openRoute(page, "/resources");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Evaluate AI incident-response tools with a repeatable process",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Read resource" })).toHaveCount(RESOURCES.length);

    for (const resource of RESOURCES) {
      const card = page
        .getByText(resource.title, { exact: true })
        .locator('xpath=ancestor::*[@data-slot="card"]');
      await expect(card).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Read resource" }),
        `${resource.title} should have a public detail route`,
      ).toHaveAttribute("href", `/resources/${resource.slug}`);
    }
    await expectPublicPageGuardrails(page, testInfo);

    await openRoute(page, "/resources/ai-sre-pilot-scorecard");
    await expect(page.getByRole("heading", { level: 1, name: "AI SRE pilot scorecard" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "1. Write the pilot contract" })).toBeVisible();
    await expect(page.getByText(/bounded reliability experiment/i)).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });
});
