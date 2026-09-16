"use server";

import { cookies, headers } from "next/headers";
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
import { workflowStore } from "@/lib/workflows/store";
import { trustedClientIp } from "@/lib/http/client-ip";
import {
  editorialSubmissionSchema,
  evaluationSchema,
  parseOptionalCatalogSlug,
  practitionerProfileSchema,
  productNoteBodySchema,
} from "@/lib/workflows/validation";
import {
  getSubmissionSecurityEnvironment,
  hashSubmissionIdentity,
  verifyEditorialTurnstile,
} from "@/lib/workflows/submission-security";

const booleanInput = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const uuidSchema = z.string().uuid();

async function requirePractitioner(returnTo: string) {
  const practitionerId = await getAuthenticatedPractitionerId();
  if (!practitionerId)
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
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
  const returnTo = internalReturnPathSchema
    .catch(`/tools/${productSlug}`)
    .parse(formData.get("returnTo") ?? `/tools/${productSlug}`);
  const practitionerId = await getAuthenticatedPractitionerId();

  if (!practitionerId) {
    if (shouldSave) await deferAuthAction("save", productSlug, returnTo);
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  await workflowStore().saveProduct(practitionerId, productSlug, shouldSave);
  revalidatePath(returnTo);
  revalidatePath("/workspace/saved");
}

export async function followCompanyAction(formData: FormData) {
  const companySlug = catalogSlugSchema.parse(formData.get("companySlug"));
  const shouldFollow = booleanInput.parse(formData.get("followed") ?? "true");
  const returnTo = internalReturnPathSchema
    .catch(`/companies/${companySlug}`)
    .parse(formData.get("returnTo") ?? `/companies/${companySlug}`);
  const practitionerId = await getAuthenticatedPractitionerId();

  if (!practitionerId) {
    if (shouldFollow) await deferAuthAction("follow", companySlug, returnTo);
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  await workflowStore().followCompany(
    practitionerId,
    companySlug,
    shouldFollow,
  );
  revalidatePath(returnTo);
  revalidatePath("/workspace/following");
}

export async function upsertProductNoteAction(formData: FormData) {
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  const body = productNoteBodySchema.parse(formData.get("body") ?? "");
  const practitionerId = await requirePractitioner(`/tools/${productSlug}`);
  await workflowStore().upsertNote(practitionerId, productSlug, body);
  revalidatePath(`/tools/${productSlug}`);
  revalidatePath("/workspace/notes");
}

export async function createEvaluationAction(formData: FormData) {
  const input = evaluationSchema.parse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    requirements: formData.get("requirements") ?? "",
    risks: formData.get("risks") ?? "",
    decision: formData.get("decision") || "undecided",
    productSlug: formData.get("productSlug") || undefined,
  });
  const practitionerId = await requirePractitioner("/workspace/evaluations");
  const evaluationId = await workflowStore().createEvaluation(
    practitionerId,
    input,
    input.productSlug,
  );
  redirect(`/workspace/evaluations/${evaluationId}`);
}

export async function updateEvaluationAction(formData: FormData) {
  const id = uuidSchema.parse(formData.get("evaluationId"));
  const input = evaluationSchema.omit({ productSlug: true }).parse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    requirements: formData.get("requirements") ?? "",
    risks: formData.get("risks") ?? "",
    decision: formData.get("decision") || "undecided",
  });
  const practitionerId = await requirePractitioner(
    `/workspace/evaluations/${id}`,
  );
  if (!(await workflowStore().updateEvaluation(practitionerId, id, input)))
    throw new Error("Evaluation not found");
  revalidatePath(`/workspace/evaluations/${id}`);
}

export async function addEvaluationProductAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  const practitionerId = await requirePractitioner(
    `/workspace/evaluations/${evaluationId}`,
  );
  if (
    !(await workflowStore().addEvaluationProduct(
      practitionerId,
      evaluationId,
      productSlug,
    ))
  )
    throw new Error("Evaluation not found");
  revalidatePath(`/workspace/evaluations/${evaluationId}`);
}

export async function removeEvaluationProductAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const productSlug = catalogSlugSchema.parse(formData.get("productSlug"));
  const practitionerId = await requirePractitioner(
    `/workspace/evaluations/${evaluationId}`,
  );
  if (
    !(await workflowStore().removeEvaluationProduct(
      practitionerId,
      evaluationId,
      productSlug,
    ))
  )
    throw new Error("Evaluation candidate not found");
  revalidatePath(`/workspace/evaluations/${evaluationId}`);
}

export async function deleteEvaluationAction(formData: FormData) {
  const evaluationId = uuidSchema.parse(formData.get("evaluationId"));
  const practitionerId = await requirePractitioner("/workspace/evaluations");
  if (!(await workflowStore().deleteEvaluation(practitionerId, evaluationId)))
    throw new Error("Evaluation not found");
  redirect("/workspace/evaluations");
}

export async function markUpdateReadAction(formData: FormData) {
  const updateId = uuidSchema.parse(formData.get("updateId"));
  const practitionerId = await requirePractitioner("/updates");
  await workflowStore().markUpdateRead(practitionerId, updateId);
  revalidatePath("/updates");
  revalidatePath("/", "layout");
}

export async function updateProfileAction(formData: FormData) {
  const input = practitionerProfileSchema.parse({
    displayName: formData.get("displayName"),
    role: formData.get("role") ?? "",
    organization: formData.get("organization") ?? "",
  });
  const practitionerId = await requirePractitioner("/settings");
  await workflowStore().updateProfile(practitionerId, input);
  revalidatePath("/settings");
}

function submissionErrorUrl(
  type: "correction" | "company_update",
  message: string,
) {
  const path =
    type === "company_update" ? "/submit/update" : "/submit/correction";
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function submitEditorialAction(formData: FormData) {
  const requestedType =
    formData.get("submissionType") === "company_update"
      ? "company_update"
      : "correction";
  const parsedInput = editorialSubmissionSchema.safeParse({
    submissionType: formData.get("submissionType"),
    relationship: formData.get("relationship"),
    productSlug: parseOptionalCatalogSlug(formData.get("productSlug")),
    companySlug: parseOptionalCatalogSlug(formData.get("companySlug")),
    sourceUrl: formData.get("sourceUrl"),
    message: formData.get("message"),
    contactEmail: formData.get("contactEmail"),
    website: formData.get("website") || undefined,
    turnstileToken: formData.get("cf-turnstile-response"),
  });
  if (!parsedInput.success) {
    redirect(
      submissionErrorUrl(
        requestedType,
        "Check the submission fields and try again",
      ),
    );
  }
  const input = parsedInput.data;

  const securityEnvironment = getSubmissionSecurityEnvironment();
  const ipAddress = trustedClientIp(await headers());
  const botCheckPassed = await verifyEditorialTurnstile({
    token: input.turnstileToken,
    ipAddress,
    secret: securityEnvironment.TURNSTILE_SECRET_KEY,
  });
  if (!botCheckPassed) {
    redirect(
      submissionErrorUrl(
        input.submissionType,
        "Please complete the anti-bot check and try again",
      ),
    );
  }

  const practitionerId = await getAuthenticatedPractitionerId();
  const ipHash = hashSubmissionIdentity(
    ipAddress,
    securityEnvironment.SUBMISSION_HASH_SECRET,
  );
  const accountHash = practitionerId
    ? hashSubmissionIdentity(
        practitionerId,
        securityEnvironment.SUBMISSION_HASH_SECRET,
      )
    : null;
  try {
    await workflowStore().submitEditorial({
      submissionType: input.submissionType,
      relationship: input.relationship,
      productSlug: input.productSlug ?? null,
      companySlug: input.companySlug ?? null,
      sourceUrl: input.sourceUrl,
      message: input.message,
      contactEmail: input.contactEmail,
      submittedBy: practitionerId,
      ipHash,
      accountHash,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("submission rate limit exceeded")
    ) {
      redirect(
        submissionErrorUrl(
          input.submissionType,
          "Please wait before submitting again",
        ),
      );
    }
    throw error;
  }

  redirect(
    input.submissionType === "company_update"
      ? "/submit/update?submitted=1"
      : "/submit/correction?submitted=1",
  );
}
