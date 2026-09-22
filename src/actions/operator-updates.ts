"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getPostgresClient } from "@/db";
import { getAuthenticatedPractitionerId } from "@/lib/auth/actions";
import { isOperatorEmail } from "@/lib/operator/authorization";
import { operatorUpdateInputSchema, slugSchema } from "@/lib/operator/updates";

type Operator = { id: string; email: string };

export async function requireOperator(): Promise<Operator> {
  const id = await getAuthenticatedPractitionerId();
  if (!id) redirect("/sign-in?next=%2Foperator%2Fupdates");
  const [user] = await getPostgresClient()<{
    email: string;
    email_verified: boolean;
  }[]>`select email, email_verified from auth."user" where id = ${id}::uuid`;
  if (!user?.email_verified || !isOperatorEmail(user.email)) redirect("/");
  return { id, email: user.email };
}

function errorUrl(message: string) {
  return `/operator/updates?error=${encodeURIComponent(message)}`;
}

export async function publishOperatorUpdateAction(formData: FormData) {
  await requireOperator();
  const parsed = operatorUpdateInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    sourceUrl: formData.get("sourceUrl"),
    companySlug: formData.get("companySlug"),
    productSlug: formData.get("productSlug"),
    publishedAt: formData.get("publishedAt"),
  });
  if (!parsed.success) redirect(errorUrl("Check the update fields and try again."));
  const input = parsed.data;
  const publishedAt = new Date(`${input.publishedAt}:00Z`);
  if (Number.isNaN(publishedAt.getTime())) redirect(errorUrl("Choose a valid publish time."));
  try {
    await getPostgresClient()`
      insert into public.published_updates
        (slug, company_slug, product_slug, title, summary, content_path, source_url, published_at)
      values
        (${input.slug}, ${input.companySlug ?? null}, ${input.productSlug ?? null}, ${input.title}, ${input.summary}, null, ${input.sourceUrl}, ${publishedAt})`;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23503")
      redirect(errorUrl("Company or product must be a current catalog reference."));
    if (typeof error === "object" && error && "code" in error && error.code === "23505")
      redirect(errorUrl("That update slug already exists."));
    throw error;
  }
  updateTag("published-updates");
  revalidatePath("/", "layout");
  revalidatePath("/updates");
  redirect("/operator/updates?published=1");
}

export async function retireOperatorUpdateAction(formData: FormData) {
  await requireOperator();
  const result = slugSchema.safeParse(formData.get("slug"));
  if (!result.success) redirect(errorUrl("Invalid update slug."));
  await getPostgresClient()`
    update public.published_updates
    set retired_at = now(), updated_at = now()
    where slug = ${result.data} and content_path is null and retired_at is null`;
  updateTag("published-updates");
  revalidatePath("/", "layout");
  revalidatePath("/updates");
  redirect("/operator/updates?retired=1");
}
