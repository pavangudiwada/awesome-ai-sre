import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  addEvaluationProductAction,
  deleteEvaluationAction,
  removeEvaluationProductAction,
  updateEvaluationAction,
} from "@/actions/workflows";
import {
  WorkspaceEmptyState,
  WorkspaceProductRow,
  WorkspaceShell,
} from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllProductSummaryMap } from "@/lib/presentation/catalog";
import { getWorkspaceEvaluation } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Evaluation brief", robots: { index: false } };

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evaluation = await getWorkspaceEvaluation(id);
  if (!evaluation) notFound();
  const productMap = getAllProductSummaryMap();
  const selectedSlugs = new Set(evaluation.evaluation_products.map((item) => item.product_slug));
  const candidates = evaluation.evaluation_products.flatMap((item) => {
    const product = productMap.get(item.product_slug);
    return product ? [product] : [];
  });
  const available = [...productMap.values()]
    .filter((product) => !selectedSlugs.has(product.slug))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <WorkspaceShell
      activeSection="evaluations"
      title={evaluation.name}
      description="A private decision brief. Nothing on this page appears in company-facing analytics."
      actions={
        <Button asChild variant="ghost">
          <Link href="/workspace/evaluations">
            <ArrowLeftIcon data-icon="inline-start" />
            All evaluations
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation brief</CardTitle>
              <CardDescription>Keep the decision criteria explicit as evidence changes.</CardDescription>
            </CardHeader>
            <form action={updateEvaluationAction}>
              <input type="hidden" name="evaluationId" value={evaluation.id} />
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="evaluation-name">Name</FieldLabel>
                    <Input id="evaluation-name" name="name" defaultValue={evaluation.name} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="evaluation-goal">Goal</FieldLabel>
                    <Textarea id="evaluation-goal" name="goal" defaultValue={evaluation.goal ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="evaluation-requirements">Requirements</FieldLabel>
                    <Textarea id="evaluation-requirements" name="requirements" defaultValue={evaluation.requirements ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="evaluation-risks">Risks and open questions</FieldLabel>
                    <Textarea id="evaluation-risks" name="risks" defaultValue={evaluation.risks ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="evaluation-decision">Decision</FieldLabel>
                    <Select name="decision" defaultValue={evaluation.decision || "undecided"}>
                      <SelectTrigger id="evaluation-decision" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="undecided">Undecided</SelectItem>
                          <SelectItem value="advance">Advance to pilot</SelectItem>
                          <SelectItem value="hold">Hold</SelectItem>
                          <SelectItem value="reject">Do not advance</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" size="lg" className="h-11">Save brief</Button>
              </CardFooter>
            </form>
          </Card>

          {candidates.length >= 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Candidate comparison</CardTitle>
                <CardDescription>
                  Side-by-side catalog facts only. Unknown evidence is not converted into a score.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-3xl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      {candidates.map((product) => (
                        <TableHead key={product.slug}>{product.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Company</TableCell>
                      {candidates.map((product) => (
                        <TableCell key={product.slug}>{product.companyName ?? "Unknown"}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Catalog labels</TableCell>
                      {candidates.map((product) => (
                        <TableCell key={product.slug}>
                          {(product.badges ?? []).map((badge) => badge.label).join(", ") || "Unknown"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Source check</TableCell>
                      {candidates.map((product) => (
                        <TableCell key={product.slug}>{product.lastReviewedLabel ?? "Pending"}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Public profile</TableCell>
                      {candidates.map((product) => (
                        <TableCell key={product.slug}>
                          <Link href={product.href} className="font-medium text-primary hover:underline">Open profile</Link>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold tracking-tight">Candidates</h2>
              <p className="text-sm text-muted-foreground">Products enter an evaluation only through this explicit step.</p>
            </div>
            {candidates.length ? candidates.map((product) => (
              <WorkspaceProductRow
                key={product.slug}
                product={product}
                actions={
                  <form action={removeEvaluationProductAction}>
                    <input type="hidden" name="evaluationId" value={evaluation.id} />
                    <input type="hidden" name="productSlug" value={product.slug} />
                    <Button type="submit" variant="outline" className="h-11">Remove candidate</Button>
                  </form>
                }
              />
            )) : (
              <WorkspaceEmptyState
                title="No candidates added yet"
                description="Review a public product profile, then add a candidate from this evaluation."
              />
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Add a candidate</CardTitle>
              <CardDescription>Choose from the full catalog after you have reviewed its public profile.</CardDescription>
            </CardHeader>
            <form action={addEvaluationProductAction}>
              <input type="hidden" name="evaluationId" value={evaluation.id} />
              <CardContent>
                <FieldGroup>
                  <Field data-disabled={!available.length || undefined}>
                    <FieldLabel htmlFor="candidate-product">Product</FieldLabel>
                    <Select name="productSlug" required disabled={!available.length}>
                      <SelectTrigger id="candidate-product" className="w-full">
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {available.map((product) => (
                            <SelectItem key={product.slug} value={product.slug}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full"
                  disabled={!available.length}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add candidate
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delete evaluation</CardTitle>
              <CardDescription>This removes the brief and candidate set. Saved products and notes are not deleted.</CardDescription>
            </CardHeader>
            <CardFooter>
              <form action={deleteEvaluationAction} className="w-full">
                <input type="hidden" name="evaluationId" value={evaluation.id} />
                <Button type="submit" variant="destructive" className="h-11 w-full">
                  <Trash2Icon data-icon="inline-start" />
                  Delete evaluation
                </Button>
              </form>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
