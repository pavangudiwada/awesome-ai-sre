import {
  publishOperatorUpdateAction,
  requireOperator,
  retireOperatorUpdateAction,
} from "@/actions/operator-updates";
import { getPostgresClient } from "@/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function OperatorUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; published?: string; retired?: string }>;
}) {
  await requireOperator();
  const [params, updates] = await Promise.all([
    searchParams,
    getPostgresClient()<{
      slug: string;
      title: string;
      published_at: Date;
      retired_at: Date | null;
    }[]>`select slug, title, published_at, retired_at from public.published_updates where content_path is null order by published_at desc`,
  ]);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Publish alert</h1>
        <p className="text-muted-foreground">Source-linked alerts appear in the public bell and open their source directly.</p>
      </header>
      {params.error ? <Alert variant="destructive"><AlertTitle>Could not publish alert</AlertTitle><AlertDescription>{params.error}</AlertDescription></Alert> : null}
      {params.published ? <Alert><AlertTitle>Alert published</AlertTitle></Alert> : null}
      {params.retired ? <Alert><AlertTitle>Alert retired</AlertTitle></Alert> : null}
      <form action={publishOperatorUpdateAction}>
        <FieldSet>
          <FieldGroup>
            <Field><FieldLabel htmlFor="slug">Slug</FieldLabel><Input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
            <Field><FieldLabel htmlFor="title">Title</FieldLabel><Input id="title" name="title" required maxLength={500} /></Field>
            <Field><FieldLabel htmlFor="summary">Summary</FieldLabel><Textarea id="summary" name="summary" required maxLength={2000} /></Field>
            <Field><FieldLabel htmlFor="sourceUrl">HTTPS source URL</FieldLabel><Input id="sourceUrl" name="sourceUrl" type="url" required /></Field>
            <Field><FieldLabel htmlFor="companySlug">Company slug (optional)</FieldLabel><Input id="companySlug" name="companySlug" /></Field>
            <Field><FieldLabel htmlFor="productSlug">Product slug (optional)</FieldLabel><Input id="productSlug" name="productSlug" /></Field>
            <Field><FieldLabel htmlFor="publishedAt">Published at (UTC)</FieldLabel><Input id="publishedAt" name="publishedAt" type="datetime-local" required /></Field>
            <Field><Button type="submit">Publish alert</Button></Field>
          </FieldGroup>
        </FieldSet>
      </form>
      {updates.length ? <section className="flex flex-col gap-3"><h2 className="text-xl font-semibold">Manual alerts</h2>{updates.map((update) => <div key={update.slug} className="flex items-center justify-between gap-3 border-b py-3"><div><p className="font-medium">{update.title}</p><p className="text-sm text-muted-foreground">{update.slug}{update.retired_at ? " · retired" : ""}</p></div>{!update.retired_at ? <form action={retireOperatorUpdateAction}><input type="hidden" name="slug" value={update.slug} /><Button type="submit" variant="outline">Retire</Button></form> : null}</div>)}</section> : null}
    </main>
  );
}
