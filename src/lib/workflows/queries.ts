import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPostgresClient } from "@/db";
import { getAuthenticatedPractitionerId } from "@/lib/auth/actions";
import { isAuthConfigured } from "@/lib/auth/server";

type EvaluationProduct = { product_slug: string; position: number | null };
type WorkspaceEvaluation = {
  id: string;
  name: string;
  goal: string | null;
  requirements: string | null;
  risks: string | null;
  decision: string;
  updated_at: Date;
  evaluation_products: EvaluationProduct[];
};

export async function getOptionalPractitionerId() {
  return getAuthenticatedPractitionerId();
}
export async function requirePractitioner(returnTo: string) {
  const id = await getOptionalPractitionerId();
  if (!id) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return id;
}

export async function getSavedProductSlugs() {
  const id = await getOptionalPractitionerId();
  if (!id) return [] as string[];
  const rows = await getPostgresClient()<
    { product_slug: string }[]
  >`select product_slug from public.saved_products where practitioner_id = ${id}::uuid`;
  return rows.map((row) => row.product_slug);
}
export async function getProductWorkflowState(
  productSlug: string,
  companySlug?: string | null,
) {
  const id = await getOptionalPractitionerId();
  if (!id) return { signedIn: false, saved: false, following: false, note: "" };
  const sql = getPostgresClient();
  const [row] = await sql<
    { saved: boolean; following: boolean; note: string | null }[]
  >`
    select exists(select 1 from public.saved_products where practitioner_id = ${id}::uuid and product_slug = ${productSlug}) as saved,
      exists(select 1 from public.company_follows where practitioner_id = ${id}::uuid and company_slug = ${companySlug ?? ""}) as following,
      (select body from public.product_notes where practitioner_id = ${id}::uuid and product_slug = ${productSlug}) as note`;
  return {
    signedIn: true,
    saved: row?.saved ?? false,
    following: row?.following ?? false,
    note: row?.note ?? "",
  };
}
export async function getCompanyFollowingState(companySlug: string) {
  const id = await getOptionalPractitionerId();
  if (!id) return false;
  return (
    (
      await getPostgresClient()`select 1 from public.company_follows where practitioner_id = ${id}::uuid and company_slug = ${companySlug} limit 1`
    ).length > 0
  );
}
export async function getCompanyPublishedUpdates(companySlug: string) {
  if (!isAuthConfigured()) return [];
  try {
    return await getPostgresClient()`select id::text as id, slug, title, summary, to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as published_at, source_url from public.published_updates where company_slug = ${companySlug} and published_at <= now() order by published_at desc`;
  } catch {
    return [];
  }
}
export async function getAllPublishedUpdates() {
  if (!isAuthConfigured()) return [];
  try {
    return await getPostgresClient()`select id::text as id, slug, company_slug, product_slug, title, summary, to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as published_at, source_url from public.published_updates where published_at <= now() order by published_at desc`;
  } catch {
    return [];
  }
}
export async function getWorkspaceSavedProducts() {
  const id = await requirePractitioner("/workspace/saved");
  return getPostgresClient()`select product_slug, created_at from public.saved_products where practitioner_id = ${id}::uuid order by created_at desc`;
}
export async function getWorkspaceNotes() {
  const id = await requirePractitioner("/workspace/notes");
  return getPostgresClient()`select product_slug, body, updated_at from public.product_notes where practitioner_id = ${id}::uuid order by updated_at desc`;
}
export async function getWorkspaceEvaluations() {
  const id = await requirePractitioner("/workspace/evaluations");
  return getPostgresClient()<
    WorkspaceEvaluation[]
  >`select e.id::text as id, e.name, e.goal, e.requirements, e.risks, e.decision, e.updated_at, coalesce(jsonb_agg(jsonb_build_object('product_slug', ep.product_slug, 'position', ep.position)) filter (where ep.product_slug is not null), '[]'::jsonb) as evaluation_products from public.evaluations e left join public.evaluation_products ep on ep.evaluation_id = e.id where e.practitioner_id = ${id}::uuid group by e.id order by e.updated_at desc`;
}
export async function getWorkspaceEvaluation(evaluationId: string) {
  if (!z.string().uuid().safeParse(evaluationId).success) return null;
  const id = await requirePractitioner(
    `/workspace/evaluations/${evaluationId}`,
  );
  const [row] = await getPostgresClient()<
    WorkspaceEvaluation[]
  >`select e.id::text as id, e.name, e.goal, e.requirements, e.risks, e.decision, e.updated_at, coalesce(jsonb_agg(jsonb_build_object('product_slug', ep.product_slug, 'position', ep.position) order by ep.position) filter (where ep.product_slug is not null), '[]'::jsonb) as evaluation_products from public.evaluations e left join public.evaluation_products ep on ep.evaluation_id = e.id where e.id = ${evaluationId}::uuid and e.practitioner_id = ${id}::uuid group by e.id`;
  return row ?? null;
}
export async function getWorkspaceFollowing() {
  const id = await requirePractitioner("/workspace/following");
  return getPostgresClient()`select company_slug, created_at from public.company_follows where practitioner_id = ${id}::uuid order by created_at desc`;
}
export async function getPractitionerProfile() {
  const id = await requirePractitioner("/settings");
  const [row] =
    await getPostgresClient()`select p.display_name, p.role, p.organization, u.email from auth."user" u left join public.practitioner_profiles p on p.user_id = u.id where u.id = ${id}::uuid`;
  return {
    profile: row
      ? {
          display_name: row.display_name,
          role: row.role,
          organization: row.organization,
        }
      : null,
    email: row?.email ?? "",
  };
}
