import "server-only";

import type { EvaluationDecision } from "@/db";
import { getPostgresClient } from "@/db";

export type EvaluationInput = {
  name: string;
  goal: string;
  requirements: string;
  risks: string;
  decision: EvaluationDecision;
};

/**
 * Server-side persistence boundary for practitioner data. Every method receives
 * the authenticated subject from Better Auth and includes it in its SQL
 * predicate; callers never supply an owner id from the browser.
 */
export function workflowStore() {
  const sql = getPostgresClient();

  return {
    async saveProduct(
      practitionerId: string,
      productSlug: string,
      saved: boolean,
    ) {
      if (saved) {
        await sql`
          insert into public.saved_products (practitioner_id, product_slug)
          values (${practitionerId}::uuid, ${productSlug})
          on conflict (practitioner_id, product_slug) do nothing
        `;
      } else {
        await sql`
          delete from public.saved_products
          where practitioner_id = ${practitionerId}::uuid and product_slug = ${productSlug}
        `;
      }
    },

    async followCompany(
      practitionerId: string,
      companySlug: string,
      followed: boolean,
    ) {
      if (followed) {
        await sql`
          insert into public.company_follows (practitioner_id, company_slug)
          values (${practitionerId}::uuid, ${companySlug})
          on conflict (practitioner_id, company_slug) do nothing
        `;
      } else {
        await sql`
          delete from public.company_follows
          where practitioner_id = ${practitionerId}::uuid and company_slug = ${companySlug}
        `;
      }
    },

    async upsertNote(
      practitionerId: string,
      productSlug: string,
      body: string,
    ) {
      if (!body) {
        await sql`
          delete from public.product_notes
          where practitioner_id = ${practitionerId}::uuid and product_slug = ${productSlug}
        `;
        return;
      }
      await sql`
        insert into public.product_notes (practitioner_id, product_slug, body)
        values (${practitionerId}::uuid, ${productSlug}, ${body})
        on conflict (practitioner_id, product_slug) do update
        set body = excluded.body, updated_at = now()
      `;
    },

    async createEvaluation(
      practitionerId: string,
      input: EvaluationInput,
      productSlug?: string,
    ) {
      return sql.begin(async (transaction) => {
        const [evaluation] = await transaction<{ id: string }[]>`
          insert into public.evaluations
            (practitioner_id, name, goal, requirements, risks, decision)
          values
            (${practitionerId}::uuid, ${input.name}, ${input.goal}, ${input.requirements}, ${input.risks}, ${input.decision})
          returning id::text as id
        `;
        if (!evaluation) throw new Error("Evaluation insert returned no id");
        if (productSlug) {
          await transaction`
            insert into public.evaluation_products (evaluation_id, product_slug, position)
            values (${evaluation.id}::uuid, ${productSlug}, 0)
            on conflict (evaluation_id, product_slug) do nothing
          `;
        }
        return evaluation.id;
      });
    },

    async updateEvaluation(
      practitionerId: string,
      evaluationId: string,
      input: EvaluationInput,
    ) {
      const updated = await sql`
        update public.evaluations
        set name = ${input.name}, goal = ${input.goal}, requirements = ${input.requirements},
            risks = ${input.risks}, decision = ${input.decision}, updated_at = now()
        where id = ${evaluationId}::uuid and practitioner_id = ${practitionerId}::uuid
        returning id
      `;
      return updated.length > 0;
    },

    async addEvaluationProduct(
      practitionerId: string,
      evaluationId: string,
      productSlug: string,
    ) {
      return sql.begin(async (transaction) => {
        const owned = await transaction`
          select 1 from public.evaluations
          where id = ${evaluationId}::uuid and practitioner_id = ${practitionerId}::uuid
          for update
        `;
        if (!owned.length) return false;
        await transaction`
          insert into public.evaluation_products (evaluation_id, product_slug, position)
          values (
            ${evaluationId}::uuid,
            ${productSlug},
            (select coalesce(max(position), -1) + 1 from public.evaluation_products where evaluation_id = ${evaluationId}::uuid)
          ) on conflict (evaluation_id, product_slug) do nothing
        `;
        return true;
      });
    },

    async removeEvaluationProduct(
      practitionerId: string,
      evaluationId: string,
      productSlug: string,
    ) {
      const removed = await sql`
        delete from public.evaluation_products as candidate
        using public.evaluations as evaluation
        where candidate.evaluation_id = evaluation.id
          and evaluation.id = ${evaluationId}::uuid
          and evaluation.practitioner_id = ${practitionerId}::uuid
          and candidate.product_slug = ${productSlug}
        returning candidate.product_slug
      `;
      return removed.length > 0;
    },

    async deleteEvaluation(practitionerId: string, evaluationId: string) {
      const deleted = await sql`
        delete from public.evaluations
        where id = ${evaluationId}::uuid and practitioner_id = ${practitionerId}::uuid
        returning id
      `;
      return deleted.length > 0;
    },

    async markUpdateRead(practitionerId: string, updateId: string) {
      await sql`
        insert into public.update_reads (practitioner_id, update_id)
        values (${practitionerId}::uuid, ${updateId}::uuid)
        on conflict (practitioner_id, update_id) do nothing
      `;
    },

    async updateProfile(
      practitionerId: string,
      input: { displayName: string | null; role: string; organization: string },
    ) {
      await sql`
        insert into public.practitioner_profiles (user_id, display_name, role, organization)
        values (${practitionerId}::uuid, ${input.displayName}, ${input.role}, ${input.organization})
        on conflict (user_id) do update
        set display_name = excluded.display_name, role = excluded.role,
            organization = excluded.organization, updated_at = now()
      `;
    },

    async submitEditorial(input: {
      submissionType: string;
      relationship: string;
      productSlug: string | null;
      companySlug: string | null;
      sourceUrl: string;
      message: string;
      contactEmail: string;
      submittedBy: string | null;
      ipHash: string;
      accountHash: string | null;
    }) {
      return sql.begin(async (transaction) => {
        await transaction`select pg_advisory_xact_lock(hashtextextended('editorial:' || ${input.ipHash}, 0))`;
        const throttle = async (
          kind: "ip" | "account",
          hash: string,
          limit: number,
        ) => {
          const [row] = await transaction<{ accepted: boolean }[]>`
            with current as (
              select window_started_at, submission_count, last_submitted_at
              from private.editorial_submission_throttles
              where key_kind = ${kind} and key_hash = ${hash}
              for update
            ), upserted as (
              insert into private.editorial_submission_throttles
                (key_kind, key_hash, window_started_at, submission_count, last_submitted_at)
              values (${kind}, ${hash}, now(), 1, now())
              on conflict (key_kind, key_hash) do update set
                window_started_at = case when private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour' then now() else private.editorial_submission_throttles.window_started_at end,
                submission_count = case when private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour' then 1 else private.editorial_submission_throttles.submission_count + 1 end,
                last_submitted_at = now()
              where private.editorial_submission_throttles.last_submitted_at <= now() - interval '60 seconds'
                and (private.editorial_submission_throttles.window_started_at <= now() - interval '1 hour' or private.editorial_submission_throttles.submission_count < ${limit})
              returning true as accepted
            ) select accepted from upserted
          `;
          if (!row?.accepted) throw new Error("submission rate limit exceeded");
        };
        await throttle("ip", input.ipHash, 5);
        if (input.accountHash) await throttle("account", input.accountHash, 3);
        const [submission] = await transaction<{ id: string }[]>`
          insert into public.editorial_submissions
            (submission_type, relationship, product_slug, company_slug, source_url, message, contact_email, submitted_by)
          values (${input.submissionType}, ${input.relationship}, ${input.productSlug}, ${input.companySlug}, ${input.sourceUrl}, ${input.message}, ${input.contactEmail}, ${input.submittedBy}::uuid)
          returning id::text as id
        `;
        if (!submission)
          throw new Error("Editorial submission insert returned no id");
        return submission.id;
      });
    },
  };
}
