import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(
    path.resolve(process.cwd(), "supabase/migrations", name),
    "utf8",
  ).toLowerCase();
}

const expand = migration(
  "20260717091000_workflow_input_and_submission_hardening.sql",
);
const contract = migration(
  "20260717131355_workflow_input_and_submission_contract.sql",
);

describe("workflow hardening migration release phases", () => {
  it("keeps the pre-promotion expand migration compatible with legacy writes", () => {
    expect(expand).not.toContain("alter table public.product_notes");
    expect(expand).not.toContain("delete from public.product_notes");
    expect(expand).not.toContain("revoke all on table public.editorial_submissions");
    expect(expand).not.toContain("drop policy if exists \"visitors can submit editorial corrections\"");
    expect(expand).not.toContain("create trigger product_notes_enforce_row_quota");
    expect(expand).toContain("create or replace function private.submit_editorial_submission");
  });

  it("moves remediation, validation, quotas, and legacy revocation into contract", () => {
    expect(contract).toContain("lock table public.product_notes in access exclusive mode");
    expect(contract).toContain("insert into private.workflow_text_quarantine");
    expect(contract).toContain("insert into private.editorial_submission_quarantine");
    expect(contract).toContain("delete from public.product_notes where btrim(body) = ''");
    expect(contract).toContain("alter table public.product_notes");
    expect(contract).toContain("create trigger product_notes_enforce_row_quota");
    expect(contract).toContain("revoke all on table public.editorial_submissions");
  });

  it("captures complete payloads before deterministic contract remediation", () => {
    const workflowQuarantine = contract.indexOf(
      "insert into private.workflow_text_quarantine",
    );
    const workflowRemediation = contract.indexOf("update public.evaluations\nset goal");
    const editorialQuarantine = contract.indexOf(
      "insert into private.editorial_submission_quarantine",
    );
    const editorialDelete = contract.indexOf(
      "delete from public.editorial_submissions as submission_row",
    );

    expect(workflowQuarantine).toBeGreaterThanOrEqual(0);
    expect(workflowQuarantine).toBeLessThan(workflowRemediation);
    expect(editorialQuarantine).toBeGreaterThanOrEqual(0);
    expect(editorialQuarantine).toBeLessThan(editorialDelete);
    expect(contract.slice(editorialQuarantine, editorialDelete)).toContain(
      "to_jsonb(submission_row)",
    );
    expect(contract).not.toContain("not valid");
  });
});
