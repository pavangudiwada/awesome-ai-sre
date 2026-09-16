import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateCatalog } from "../src/lib/catalog/validation";
import {
  catalogWarningIdentity,
  findNewWarningIdentities,
  loadValidationWarningBaseline,
} from "./lib/validation-warning-baseline";

const report = validateCatalog();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const warningBaseline = loadValidationWarningBaseline(repoRoot);
const warningIdentities = report.issues
  .filter((issue) => issue.severity === "warning")
  .map(catalogWarningIdentity);
const newWarningIdentities = findNewWarningIdentities(
  warningIdentities,
  warningBaseline.catalog,
);
const outputReport = {
  ...report,
  valid: report.valid && newWarningIdentities.length === 0,
  warningBaseline: {
    accepted: warningBaseline.catalog.length,
    current: warningIdentities.length,
    new: newWarningIdentities,
  },
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
} else {
  const { counts } = report;
  process.stdout.write(
    [
      "AI SRE Watchlist catalog validation",
      `Products: ${counts.products}`,
      `Observability products: ${counts.observabilityProducts}`,
      `Companies: ${counts.companies}`,
      `Early cohort entries: ${counts.cohortEntries}`,
      `Content documents: ${counts.contentDocuments}`,
      "",
    ].join("\n"),
  );

  if (report.issues.length === 0) {
    process.stdout.write("No catalog gaps found.\n");
  } else {
    for (const issue of report.issues) {
      process.stdout.write(
        `${issue.severity.toUpperCase()} ${issue.code} ${issue.sourceFile}: ${issue.message}\n`,
      );
    }
  }

  const errorCount = report.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;
  process.stdout.write(`\n${errorCount} error(s), ${warningCount} warning(s)\n`);

  if (newWarningIdentities.length > 0) {
    process.stderr.write(
      `New catalog warning identities:\n${newWarningIdentities.map((identity) => `- ${identity}`).join("\n")}\n`,
    );
  }
}

if (!outputReport.valid) {
  process.exitCode = 1;
}
