import { expect, test } from "@playwright/test";

import { expectImageHasNaturalSize, expectPublicPageGuardrails, openRoute } from "./support/watchlist";

const projects = [
  { slug: "ingero", name: "Ingero project", productName: "Ingero" },
  { slug: "k8sgpt", name: "K8sGPT project", productName: "K8sGPT" },
  { slug: "kagent", name: "Kagent open-source project", productName: "Kagent" },
  { slug: "kubestellar-console", name: "KubeStellar Console project", productName: "KubeStellar Console" },
  { slug: "sre-bench", name: "SRE Bench project", productName: "SRE Bench" },
  { slug: "opensre-in", name: "OpenSRE.in project", productName: "OpenSRE.in" },
] as const;

test.describe("source-backed project identities", () => {
  for (const project of projects) {
    test(`shows ${project.name} and its identity limits without a company follow`, async ({ page }, testInfo) => {
      await openRoute(page, `/tools/${project.slug}`);

      await expect(page.getByText(`Project identity: ${project.name}`, { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Project identity and sources", exact: true })).toBeVisible();
      await expect(page.getByText(/The live site|The public repository|This entry covers|The repository|The website does not identify|Public sources identify/)).toBeVisible();
      await expect(page.getByRole("list", { name: "Profile sources" }).getByRole("link").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "View company and follow updates" })).toHaveCount(0);
      await expectImageHasNaturalSize(
        page.getByRole("img", { name: `${project.productName} logo`, exact: true }),
        `${project.productName} logo`,
      );
      await expectImageHasNaturalSize(
        page.getByRole("img", { name: `${project.productName} product preview`, exact: true }),
        `${project.productName} product preview`,
      );
      await expectPublicPageGuardrails(page, testInfo);
      await page.screenshot({
        path: testInfo.outputPath(`public-catalog-project-identity-${project.slug}.png`),
        fullPage: true,
        style: "nextjs-portal { display: none !important; } .sticky { position: static !important; }",
      });
    });
  }
});
