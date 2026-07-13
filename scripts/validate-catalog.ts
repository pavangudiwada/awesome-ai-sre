import { validateCatalog } from "../src/lib/catalog/validation";

const report = validateCatalog();

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
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
}

if (!report.valid) {
  process.exitCode = 1;
}
