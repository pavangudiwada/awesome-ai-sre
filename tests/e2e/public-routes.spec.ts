import { expect, test } from "@playwright/test";

import {
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
    title: "State of AI SRE 2026: catalog snapshot and research method",
  },
] as const;

test.describe("public Watchlist routes", () => {
  test("static resource content survives header personalization failure", async ({ page }, testInfo) => {
    await page.route("**/api/header-state", (route) => route.abort());
    await openRoute(page, "/resources");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Evaluate AI incident-response tools with a repeatable process",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open updates" }).first()).toBeVisible();
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("home exposes real research and carries search intent into the catalog", async ({ page }, testInfo) => {
    await openRoute(page, "/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the right tools for reliable systems.",
      }),
    ).toBeVisible();
    await expect(page.getByText("The most useful AI SRE product updates, delivered to your inbox.")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Frequency" })).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: /newsletter/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: `View all 78 tools` })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Featured AI SRE tools" })).toBeVisible();
    await expect(page.getByText("A rotating selection from the directory, refreshed every day.")).toBeVisible();
    await expect(page.getByText("Useful information, without the vendor pitch.")).toHaveCount(0);

    await page.getByRole("button", { name: "Search tools and resources" }).click();
    const commandSearch = page.getByPlaceholder("Search tools, companies, or guides…");
    await commandSearch.fill("RunWhen");
    const toolResult = page
      .getByLabel("Tools", { exact: true })
      .getByText("RunWhen", { exact: true });
    await Promise.all([
      page.waitForURL(/\/tools\/runwhen$/),
      toolResult.click(),
    ]);
    await page.goBack({ waitUntil: "load" });

    await expect(
      page.getByRole("link", { name: "Pavan Gudiwada" }),
    ).toHaveAttribute("href", "https://www.linkedin.com/in/pavangudiwada");
    await expect(
      page.getByRole("link", { name: "Follow us on LinkedIn" }),
    ).toHaveAttribute("href", "https://www.linkedin.com/company/112729107/");

    const headerSearch = page.getByRole("button", { name: "Search tools and resources" });
    await expect(headerSearch).toContainText("K");

    await expectMinimumTouchTarget(page.getByRole("button", { name: "Open updates" }).first(), "Updates action");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
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

  test("company discovery is available from the public navigation and has source-backed profiles", async ({ page }, testInfo) => {
    await openRoute(page, "/");

    await page.getByRole("link", { name: "Browse all companies" }).click();
    await expect(page).toHaveURL(/\/companies$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Explore the teams behind the products" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "RunWhen", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View company", exact: true }).first()).toBeVisible();
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
    await expect(page).toHaveURL(/\/tools\?q=RunWhen$/);
    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();

    await search.clear();
    await expect(page).toHaveURL(/\/tools$/);
    const incidentCategory = page.getByRole("radio", { name: "Show Incident AI" });
    await incidentCategory.click();
    await expect(page).toHaveURL(/\/tools\?category=incident-ai$/);
    await expect(incidentCategory).toBeChecked();
    await expect(page.getByRole("link", { name: "View RunWhen profile" })).toBeVisible();

    const openSourceCategory = page.getByRole("radio", { name: "Show Open source" });
    await openSourceCategory.click();
    await expect(page).toHaveURL(/\/tools\?category=oss$/);
    await expect(openSourceCategory).toBeChecked();
    await expect(page.getByRole("link", { name: "View HolmesGPT profile" })).toBeVisible();

    const filters = page.getByRole("button", { name: "Filters", exact: true });
    await expectMinimumTouchTarget(filters, "Filters action");
    await filters.click();
    await expect(page.getByRole("heading", { name: "Filter products" })).toBeVisible();

    await page.getByRole("checkbox", { name: "On-premises" }).check();
    await expect(page).toHaveURL(
      /\/tools\?category=oss&deployment=on-prem$/,
    );
    const viewResults = page.getByRole("button", { name: /View \d+ results?/ });
    await expectMinimumTouchTarget(viewResults, "Filter results action");
    await viewResults.click();

    const removeOnPremises = page.getByRole("button", {
      name: "Remove on-prem filter",
    });
    await expectMinimumTouchTarget(removeOnPremises, "Applied On-premises filter");

    await page.getByRole("combobox", { name: "Sort" }).click();
    await page.getByRole("option", { name: "Newest added" }).click();
    await expect(page).toHaveURL(
      /\/tools\?category=oss&deployment=on-prem&sort=newest$/,
    );

    await search.fill("HolmesGPT");
    await expect(page).toHaveURL(
      /\/tools\?q=HolmesGPT&category=oss&deployment=on-prem&sort=newest$/,
    );
    await expect(page.getByRole("link", { name: "View HolmesGPT profile" })).toBeVisible();

    const shareableDirectoryUrl = page.url();
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-app-hydrated", "true");
    await expect(search).toHaveValue("HolmesGPT");
    await expect(openSourceCategory).toBeChecked();
    await expect(removeOnPremises).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Sort" })).toHaveText("Newest added");

    await page.getByRole("link", { name: "View HolmesGPT profile" }).click();
    await expect(page).toHaveURL(/\/tools\/holmesgpt$/);
    await page.goBack({ waitUntil: "load" });
    await expect(page).toHaveURL(shareableDirectoryUrl);
    await expect(page.locator("html")).toHaveAttribute("data-app-hydrated", "true");
    await expect(page.getByRole("link", { name: "View HolmesGPT profile" })).toBeVisible();

    await removeOnPremises.click();
    await expect(page).toHaveURL(
      /\/tools\?q=HolmesGPT&category=oss&sort=newest$/,
    );
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("AI product profiles keep public evidence outside the sign-in gate", async ({ page }, testInfo) => {
    await openRoute(page, "/tools/runwhen");

    await expect(page.getByRole("heading", { level: 1, name: "RunWhen" })).toBeVisible();
    await expect(page.getByText("Product details", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Capabilities" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Evidence" })).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Product evidence claims" })
        .getByText("Documented", { exact: true }),
    ).toHaveCount(3);
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
      const summaryBox = await page.getByText("Product details", { exact: true }).boundingBox();
      expect(shareBox).not.toBeNull();
      expect(summaryBox).not.toBeNull();
      expect(summaryBox!.y).toBeLessThan(shareBox!.y);
    }

    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Save RunWhen", exact: true }).first(),
      "Save RunWhen action",
    );
    await expect(
      page.getByRole("button", { name: "Save RunWhen", exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Save RunWhen", exact: true }).first(),
    ).toBeEnabled();
    await expectMinimumTouchTarget(
      page.getByRole("link", { name: "Add to evaluation", exact: true }).first(),
      "Add RunWhen to evaluation action",
    );
    await expect(
      page.getByRole("link", { name: "Add to evaluation", exact: true }),
    ).toHaveCount(1);
    await expectImageHasNaturalSize(
      page.getByRole("img", { name: "RunWhen logo" }),
      "RunWhen profile logo",
    );

    const sectionNav = page.getByRole("navigation", { name: "Product sections" });
    await sectionNav.getByRole("link", { name: "Evidence 3" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Evidence" })).toBeInViewport();
    const [headerBox, sectionNavBox] = await Promise.all([
      page.getByRole("banner").boundingBox(),
      sectionNav.boundingBox(),
    ]);
    expect(headerBox).not.toBeNull();
    expect(sectionNavBox).not.toBeNull();
    expect(sectionNavBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 2);
    await expectPublicPageGuardrails(page, testInfo);
  });

  test("company profile preloads its above-the-fold hero without LCP warnings", async ({ page }, testInfo) => {
    const lcpWarnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("Largest Contentful Paint")) {
        lcpWarnings.push(message.text());
      }
    });

    await openRoute(page, "/companies/runwhen");
    const hero = page.getByRole("img", { name: "RunWhen product preview" });
    await expectImageHasNaturalSize(hero, "RunWhen company hero");
    await expect(hero).toHaveAttribute("loading", "eager");
    await expect(
      page.locator('link[rel="preload"][as="image"][href="/screenshots/runwhen.png"]'),
    ).toHaveCount(1);
    await page.waitForTimeout(500);
    expect(lcpWarnings).toEqual([]);
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
    const search = page.getByRole("textbox", { name: "Search products" });
    await search.fill("not-a-real-observability-product");
    await expect(page).toHaveURL(
      /\/observability\?q=not-a-real-observability-product$/,
    );
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/observability$/);

    await search.fill("Grafana");
    await expect(page).toHaveURL(/\/observability\?q=Grafana$/);
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
      page.getByRole("button", { name: "Save Grafana" }).first(),
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
