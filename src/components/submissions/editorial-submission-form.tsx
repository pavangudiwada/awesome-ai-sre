import { ShieldCheckIcon } from "lucide-react";

import { submitEditorialAction } from "@/actions/workflows";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import type { CatalogCompany, CatalogProduct, ObservabilityProduct } from "@/types/catalog";
import { observabilityWorkflowSlug } from "@/lib/presentation/catalog";

interface EditorialSubmissionFormProps {
  type: "correction" | "company_update";
  companies: readonly CatalogCompany[];
  products: readonly (CatalogProduct | ObservabilityProduct)[];
  defaultCompany?: string;
  defaultProduct?: string;
}

export function EditorialSubmissionForm({
  type,
  companies,
  products,
  defaultCompany,
  defaultProduct,
}: EditorialSubmissionFormProps) {
  const isUpdate = type === "company_update";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isUpdate ? "Submit a company update" : "Submit a correction"}</CardTitle>
        <CardDescription>
          {isUpdate
            ? "Share a source-linked product change for editorial review. Nothing publishes automatically."
            : "Point us to the source and explain what should change. We review every accepted correction before publication."}
        </CardDescription>
      </CardHeader>
      <form action={submitEditorialAction}>
        <input type="hidden" name="submissionType" value={type} />
        <CardContent>
          <FieldGroup>
            <Field className="sr-only !size-px" aria-hidden="true">
              <FieldLabel htmlFor="submission-website">Website</FieldLabel>
              <Input
                id="submission-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="submission-relationship">Your relationship</FieldLabel>
              <Select name="relationship" required>
                <SelectTrigger id="submission-relationship" className="w-full">
                  <SelectValue placeholder="Choose relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="practitioner">Practitioner or evaluator</SelectItem>
                    <SelectItem value="company_employee">Company employee</SelectItem>
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="agency">Agency or representative</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Submission subject</FieldLegend>
              <FieldDescription>
                Choose at least one company or product.
              </FieldDescription>
              <FieldGroup className="grid sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="submission-company">Company</FieldLabel>
                  <Select name="companySlug" defaultValue={defaultCompany ?? "none"}>
                    <SelectTrigger id="submission-company" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Not company-specific</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.slug} value={company.slug}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="submission-product">Product</FieldLabel>
                  <Select name="productSlug" defaultValue={defaultProduct ?? "none"}>
                    <SelectTrigger id="submission-product" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Not product-specific</SelectItem>
                        {products.map((product) => (
                          <SelectItem
                            key={`${product.catalogFamily}-${product.slug}`}
                            value={
                              product.catalogFamily === "observability"
                                ? observabilityWorkflowSlug(product.slug)
                                : product.slug
                            }
                          >
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="submission-source">Primary source URL</FieldLabel>
              <Input
                id="submission-source"
                name="sourceUrl"
                type="url"
                inputMode="url"
                placeholder="https://docs.example.com/change"
                required
              />
              <FieldDescription>
                Use official documentation, a release note, repository, security page,
                or first-party announcement.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="submission-message">What should we review?</FieldLabel>
              <Textarea id="submission-message" name="message" className="min-h-40" minLength={20} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="submission-email">Contact email</FieldLabel>
              <Input
                id="submission-email"
                name="contactEmail"
                type="email"
                autoComplete="email"
                required
              />
              <FieldDescription>
                Used only to clarify this submission. It is never shown publicly.
              </FieldDescription>
            </Field>
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>Editorial review is mandatory</AlertTitle>
              <AlertDescription>
                Company submissions never publish directly and do not change evidence
                state automatically.
              </AlertDescription>
            </Alert>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" size="lg" className="h-11">
            Send for review
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
