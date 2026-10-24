import { expect, test } from "@playwright/test";

const projects = [
  { slug: "ingero", name: "Ingero project" },
  { slug: "k8sgpt", name: "K8sGPT project" },
  { slug: "kagent", name: "Kagent open-source project" },
  { slug: "kubestellar-console", name: "KubeStellar Console project" },
  { slug: "sre-bench", name: "SRE Bench project" },
  { slug: "opensre-in", name: "OpenSRE.in project" },
] as const;

test.describe("source-backed project identities", () => {
  for (const project of projects) {
    test(`shows ${project.name} and its identity limits without a company follow`, async ({ page }) => {
      await page.goto(`/tools/${project.slug}`);

      await expect(page.getByText(`Project identity: ${project.name}`, { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Project identity and sources", exact: true })).toBeVisible();
      await expect(page.getByText(/The live site|The public repository|This entry covers|The repository|The website does not identify|Public sources identify/)).toBeVisible();
      await expect(page.getByRole("list", { name: "Profile sources" }).getByRole("link").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "View company and follow updates" })).toHaveCount(0);
    });
  }
});
