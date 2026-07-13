import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ArticleLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
        {children}
      </Link>
    );
  }
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

export function MdxArticle({ source }: { source: string }) {
  return (
    <article className="flex max-w-3xl flex-col gap-5 text-base leading-7">
      <MDXRemote
        source={source}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        components={{
          h2: (props) => <h2 {...props} className="mt-8 text-2xl font-semibold tracking-tight" />,
          h3: (props) => <h3 {...props} className="mt-5 text-xl font-semibold tracking-tight" />,
          h4: (props) => <h4 {...props} className="mt-4 text-lg font-medium" />,
          p: (props) => <p {...props} className="text-foreground/90" />,
          a: ArticleLink,
          ul: (props) => <ul {...props} className="flex list-disc flex-col gap-2 pl-6" />,
          ol: (props) => <ol {...props} className="flex list-decimal flex-col gap-2 pl-6" />,
          li: (props) => <li {...props} className="pl-1" />,
          blockquote: (props) => (
            <Alert>
              <AlertDescription>
                <blockquote {...props} />
              </AlertDescription>
            </Alert>
          ),
          table: (props) => <Table {...props} />,
          thead: (props) => <TableHeader {...props} />,
          tbody: (props) => <TableBody {...props} />,
          tr: (props) => <TableRow {...props} />,
          th: (props) => <TableHead {...props} />,
          td: (props) => <TableCell {...props} />,
          code: (props) => (
            <code {...props} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" />
          ),
          pre: (props) => (
            <pre {...props} className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm" />
          ),
        }}
      />
    </article>
  );
}
