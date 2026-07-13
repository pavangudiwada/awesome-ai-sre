import "server-only";

import { redirect } from "next/navigation";

import { getAuthenticatedPractitionerId } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getOptionalPractitionerId() {
  if (!isSupabaseConfigured()) return null;
  return getAuthenticatedPractitionerId();
}

export async function requirePractitioner(returnTo: string) {
  const practitionerId = await getOptionalPractitionerId();
  if (!practitionerId) {
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return practitionerId;
}

export async function getSavedProductSlugs() {
  const practitionerId = await getOptionalPractitionerId();
  if (!practitionerId) return [] as string[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_products")
    .select("product_slug")
    .eq("practitioner_id", practitionerId);
  if (error) throw error;
  return data.map((row) => row.product_slug);
}

export async function getProductWorkflowState(
  productSlug: string,
  companySlug?: string | null,
) {
  const practitionerId = await getOptionalPractitionerId();
  if (!practitionerId) {
    return { signedIn: false, saved: false, following: false, note: "" };
  }
  const supabase = await createClient();
  const [savedResult, noteResult, followResult] = await Promise.all([
    supabase
      .from("saved_products")
      .select("product_slug")
      .eq("practitioner_id", practitionerId)
      .eq("product_slug", productSlug)
      .maybeSingle(),
    supabase
      .from("product_notes")
      .select("body")
      .eq("practitioner_id", practitionerId)
      .eq("product_slug", productSlug)
      .maybeSingle(),
    companySlug
      ? supabase
          .from("company_follows")
          .select("company_slug")
          .eq("practitioner_id", practitionerId)
          .eq("company_slug", companySlug)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = savedResult.error ?? noteResult.error ?? followResult.error;
  if (error) throw error;
  return {
    signedIn: true,
    saved: Boolean(savedResult.data),
    following: Boolean(followResult.data),
    note: noteResult.data?.body ?? "",
  };
}

export async function getCompanyFollowingState(companySlug: string) {
  const practitionerId = await getOptionalPractitionerId();
  if (!practitionerId) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_follows")
    .select("company_slug")
    .eq("practitioner_id", practitionerId)
    .eq("company_slug", companySlug)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getCompanyPublishedUpdates(companySlug: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_updates")
    .select("id,slug,title,summary,published_at,source_url")
    .eq("company_slug", companySlug)
    .order("published_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function getAllPublishedUpdates() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_updates")
    .select("id,slug,company_slug,product_slug,title,summary,published_at,source_url")
    .order("published_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function getWorkspaceSavedProducts() {
  const practitionerId = await requirePractitioner("/workspace/saved");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_products")
    .select("product_slug,created_at")
    .eq("practitioner_id", practitionerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getWorkspaceNotes() {
  const practitionerId = await requirePractitioner("/workspace/notes");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_notes")
    .select("product_slug,body,updated_at")
    .eq("practitioner_id", practitionerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getWorkspaceEvaluations() {
  const practitionerId = await requirePractitioner("/workspace/evaluations");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select("id,name,goal,requirements,risks,decision,updated_at")
    .eq("practitioner_id", practitionerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!data.length) return [];
  const { data: products, error: productsError } = await supabase
    .from("evaluation_products")
    .select("evaluation_id,product_slug")
    .in("evaluation_id", data.map((evaluation) => evaluation.id));
  if (productsError) throw productsError;
  return data.map((evaluation) => ({
    ...evaluation,
    evaluation_products: products.filter((item) => item.evaluation_id === evaluation.id),
  }));
}

export async function getWorkspaceEvaluation(id: string) {
  const practitionerId = await requirePractitioner(`/workspace/evaluations/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select("id,name,goal,requirements,risks,decision,updated_at")
    .eq("id", id)
    .eq("practitioner_id", practitionerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: products, error: productsError } = await supabase
    .from("evaluation_products")
    .select("product_slug,position")
    .eq("evaluation_id", id)
    .order("position", { ascending: true });
  if (productsError) throw productsError;
  return { ...data, evaluation_products: products };
}

export async function getWorkspaceFollowing() {
  const practitionerId = await requirePractitioner("/workspace/following");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_follows")
    .select("company_slug,created_at")
    .eq("practitioner_id", practitionerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPractitionerProfile() {
  const practitionerId = await requirePractitioner("/settings");
  const supabase = await createClient();
  const [{ data: profile, error }, { data: userData }] = await Promise.all([
    supabase
      .from("practitioner_profiles")
      .select("display_name,role,organization")
      .eq("user_id", practitionerId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (error) throw error;
  return { profile, email: userData.user?.email ?? "" };
}
