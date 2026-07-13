import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { createEvaluationAction } from "@/actions/workflows";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAllProductSummaryMap } from "@/lib/presentation/catalog";
import { requirePractitioner } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "New evaluation", robots: { index: false } };

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  await requirePractitioner("/workspace/evaluations/new");
  const { product: productSlug } = await searchParams;
  const product = productSlug ? getAllProductSummaryMap().get(productSlug) : undefined;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/workspace/evaluations">
          <ArrowLeftIcon data-icon="inline-start" />
          Evaluations
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Create an evaluation</CardTitle>
          <CardDescription>
            Use this only for a serious candidate set. {product ? `${product.name} will be added as the first candidate.` : "You can add candidates after creating it."}
          </CardDescription>
        </CardHeader>
        <form action={createEvaluationAction}>
          {product ? <input type="hidden" name="productSlug" value={product.slug} /> : null}
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="evaluation-name">Evaluation name</FieldLabel>
                <Input id="evaluation-name" name="name" placeholder="AI incident investigation pilot" required />
                <FieldDescription>Name the decision, team, or pilot—not a generic shortlist.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="evaluation-goal">Goal</FieldLabel>
                <Textarea id="evaluation-goal" name="goal" placeholder="What reliability outcome should improve?" />
              </Field>
              <Field>
                <FieldLabel htmlFor="evaluation-requirements">Requirements</FieldLabel>
                <Textarea id="evaluation-requirements" name="requirements" placeholder="Access, deployment, integrations, audit, and security constraints." />
              </Field>
              <Field>
                <FieldLabel htmlFor="evaluation-risks">Risks and open questions</FieldLabel>
                <Textarea id="evaluation-risks" name="risks" placeholder="Unknown claims, access risks, and evidence gaps." />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" size="lg" className="h-11">Create evaluation</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
