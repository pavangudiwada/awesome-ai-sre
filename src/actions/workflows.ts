"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  PENDING_AUTH_INTENT_COOKIE,
  createPendingAuthIntent,
  pendingAuthIntentCookieOptions,
} from "@/lib/auth/pending-intent";
import {
  catalogSlugSchema,
  internalReturnPathSchema,
} from "@/lib/auth/schemas";
import { getAuthenticatedPractitionerId } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

const booleanInput = z.enum(["true", "false"]).transform((value) => value === "true");
const uuidSchema = z.string().uuid();
const bodySchema = z.string().max(20_000);
const evaluationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().trim().max(4_000).default(""),
  requirements: z.string().trim().max(8_000).default(""),
  risks: z.string().trim().max(8_000).default(""),
  decision: z.string().trim().max(8_000).default(""),
  productSlug: catalogSlugSchema.optional(),
});

async function requirePractitioner(returnTo: string) {
  const practitionerId = await getAuthenticatedPractitionerId();
  if (!practitionerId) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return practitionerId;
}

async function deferAuthAction(
  action: "save" | "follow",
  slug: string,
  returnTo: string,
) {
  const token = createPendingAuthIntent({ action, slug, returnTo });
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_AUTH_INTENT_COOKIE,
    token,
    pendingAuthIntentCookieOptions(),
  );
  redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
}

export async function saveProductAction(formData: FormData) {
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  const shouldSave = booleanInput.parse(formData.get("saved") ?? "true");
  const returnTo = internalReturnPathSchema.catch(`/tools/${productSlug}`).parse(
    formData.get("returnTo") ?? `/tools/${productSlug}`,
  );
  const practitionerId = await getAuthenticatedPractitionerId();

  if (!practitionerId) {
    if (shouldSave) await deferAuthAction("save", productSlug, returnTo);
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  const supabase = await createClient();
  const result = shouldSave
    ? await supabase.from("saved_products").upsert(
        { practitioner_id: practitionerId, product_slug: productSlug },
        { onConflict: "practitioner_id,product_slug", ignoreDuplicates: true },
      )
    : await supabase
        .from("saved_products")
        .delete()
        .eq("practitioner_id", practitionerId)
        .eq("product_slug", productSlug);

  if (result.error) throw result.error;
  revalidatePath(returnTo);
  revalidatePath("/workspace/saved");
}

export async function followCompanyAction(formData: FormData) {
  const companySlug = catalogSlugSchema.parse(formData.get("companySlug"));
  const shouldFollow = booleanInput.parse(formData.get("followed") ?? "true");
  const returnTo = internalReturnPathSchema.catch(`/companies/${companySlug}`).parse(
    formData.get("returnTo") ?? `/companies/${companySlug}`,
  );
  const practitionerId = await getAuthenticatedPractitionerId();

  if (!practitionerId) {
    if (shouldFollow) await deferAuthAction("follow", companySlug, returnTo);
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  const supabase = await createClient();
  const result = shouldFollow
    ? await supabase.from("company_follows").upsert(
        { practitioner_id: practitionerId, company_slug: companySlug },
        { onConflict: "practitioner_id,company_slug", ignoreDuplicates: true },
      )
    : await supabase
        .from("company_follows")
        .delete()
        .eq("practitioner_id", practitionerId)
        .eq("company_slug", companySlug);

  if (result.error) throw result.error;
  revalidatePath(returnTo);
  revalidatePath("/workspace/following");
}

export async function upsertProductNoteAction(formData: FormData) {
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  const body = bodySchema.parse(formData.get("body") ?? "");
  const practitionerId = await requirePractitioner(`/tools/${productSlug}`);
  const supabase = await createClient();
  const { error } = await supabase.from("product_notes").upsert(
    { practitioner_id: practitionerId, product_slug: productSlug, body },
    { onConflict: "practitioner_id,product_slug" },
  );
  if (error) throw error;
  revalidatePath(`/tools/${productSlug}`);
  revalidatePath("/workspace/notes");
}

export async function createEvaluationAction(formData: FormData) {
  const input = evaluationSchema.parse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    requirements: formData.get("requirements") ?? "",
    risks: formData.get("risks") ?? "",
    decision: formData.get("decision") ?? "",
    productSlug: formData.get("productSlug") || undefined,
  });
  const practitionerId = await requirePractitioner("/workspace/evaluations");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      practitioner_id: practitionerId,
      name: input.name,
      goal: input.goal,
      requirements: input.requirements,
      risks: input.risks,
      decision: input.decision,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (input.productSlug) {
    const { error: itemError } = await supabase.from("evaluation_products").insert({
      evaluation_id: data.id,
      product_slug: input.productSlug,
      position: 0,
    });
    if (itemError) throw itemError;
  }
  redirect(`/workspace/evaluations/${data.id}`);
}

export async function updateEvaluationAction(formData: FormData) {
  const id = uuidSchema.parse(formData.get("evaluationId"));
  const input = evaluationSchema.omit({ productSlug: true }).parse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    requirements: formData.get("requirements") ?? "",
    risks: formData.get("risks") ?? "",
    decision: formData.get("decision") ?? "",
  });
  const practitionerId = await requirePractitioner(`/workspace/evaluations/${id}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .update(input)
    .eq("id", id)
    .eq("practitioner_id", practitionerId);
  if (error) throw error;
  revalidatePath(`/workspace/evaluations/${id}`);
}

export async function addEvaluationProductAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  await requirePractitioner(`/workspace/evaluations/${evaluationId}`);
  const supabase = await createClient();
  const { error } = await supabase.from("evaluation_products").upsert(
    { evaluation_id: evaluationId, product_slug: productSlug },
    { onConflict: "evaluation_id,product_slug", ignoreDuplicates: true },
  );
  if (error) throw error;
  revalidatePath(`/workspace/evaluations/${evaluationId}`);
}

export async function removeEvaluationProductAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  await requirePractitioner(`/workspace/evaluations/${evaluationId}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluation_products")
    .delete()
    .eq("evaluation_id", evaluationId)
    .eq("product_slug", productSlug);
  if (error) throw error;
  revalidatePath(`/workspace/evaluations/${evaluationId}`);
}

export async function deleteEvaluationAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const practitionerId = await requirePractitioner("/workspace/evaluations");
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", evaluationId)
    .eq("practitioner_id", practitionerId);
  if (error) throw error;
  redirect("/workspace/evaluations");
}

export async function markUpdateReadAction(formData: FormData) {
  const updateId = uuidSchema.parse(formData.get("updateId"));
  const practitionerId = await requirePractitioner("/updates");
  const supabase = await createClient();
  const { error } = await supabase.from("update_reads").upsert(
    { practitioner_id: practitionerId, update_id: updateId },
    { onConflict: "practitioner_id,update_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  revalidatePath("/updates");
  revalidatePath("/", "layout");
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120),
  organization: z.string().trim().max(160),
});

export async function updateProfileAction(formData: FormData) {
  const input = profileSchema.parse({
    displayName: formData.get("displayName"),
    role: formData.get("role") ?? "",
    organization: formData.get("organization") ?? "",
  });
  const practitionerId = await requirePractitioner("/settings");
  const supabase = await createClient();
  const { error } = await supabase.from("practitioner_profiles").upsert(
    {
      user_id: practitionerId,
      display_name: input.displayName,
      role: input.role,
      organization: input.organization,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  revalidatePath("/settings");
}

const submissionSchema = z.object({
  submissionType: z.enum(["correction", "company_update"]),
  relationship: z.enum(["practitioner", "company_employee", "founder", "agency", "other"]),
  productSlug: catalogSlugSchema.optional(),
  companySlug: catalogSlugSchema.optional(),
  sourceUrl: z.string().url().max(2_000),
  message: z.string().trim().min(20).max(10_000),
  contactEmail: z.string().trim().toLowerCase().email().max(320),
  website: z.string().max(0).optional(),
}).refine((value) => value.productSlug || value.companySlug, {
  message: "Choose a product or company",
});

export async function submitEditorialAction(formData: FormData) {
  const cookieStore = await cookies();
  if (cookieStore.get("watchlist-submission-throttle")) {
    redirect("/submit/correction?error=Please+wait+before+submitting+again");
  }

  const input = submissionSchema.parse({
    submissionType: formData.get("submissionType"),
    relationship: formData.get("relationship"),
    productSlug: formData.get("productSlug") || undefined,
    companySlug: formData.get("companySlug") || undefined,
    sourceUrl: formData.get("sourceUrl"),
    message: formData.get("message"),
    contactEmail: formData.get("contactEmail"),
    website: formData.get("website") || undefined,
  });

  const supabase = await createClient();
  const practitionerId = await getAuthenticatedPractitionerId();
  const { error } = await supabase.from("editorial_submissions").insert({
    submission_type: input.submissionType,
    relationship: input.relationship,
    product_slug: input.productSlug ?? null,
    company_slug: input.companySlug ?? null,
    source_url: input.sourceUrl,
    message: input.message,
    contact_email: input.contactEmail,
    submitted_by: practitionerId,
    status: "pending",
  });
  if (error) throw error;

  cookieStore.set("watchlist-submission-throttle", randomUUID(), {
    httpOnly: true,
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(
    input.submissionType === "company_update"
      ? "/submit/update?submitted=1"
      : "/submit/correction?submitted=1",
  );
}
