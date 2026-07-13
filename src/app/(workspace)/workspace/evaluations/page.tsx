import type { Metadata } from "next";
import Link from "next/link";
import { FolderSearch2Icon, PlusIcon } from "lucide-react";

import {
  EvaluationCollectionCard,
  WorkspaceEmptyState,
  WorkspaceShell,
} from "@/components/watchlist";
import { Button } from "@/components/ui/button";
import { getWorkspaceEvaluations } from "@/lib/workflows/queries";

export const metadata: Metadata = { title: "Evaluations", robots: { index: false } };

export default async function EvaluationsPage() {
  const evaluations = await getWorkspaceEvaluations();
  return (
    <WorkspaceShell
      activeSection="evaluations"
      title="Evaluations"
      description="Named, serious candidate sets with a goal, requirements, risks, and a decision."
      actions={
        <Button asChild>
          <Link href="/workspace/evaluations/new">
            <PlusIcon data-icon="inline-start" />
            New evaluation
          </Link>
        </Button>
      }
    >
      {evaluations.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {evaluations.map((evaluation) => (
            <EvaluationCollectionCard
              key={evaluation.id}
              title={evaluation.name}
              href={`/workspace/evaluations/${evaluation.id}`}
              description={evaluation.goal || "No evaluation goal recorded yet."}
              productCount={evaluation.evaluation_products.length}
              updatedLabel={new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(evaluation.updated_at))}
              statusLabel={evaluation.decision || "Undecided"}
            />
          ))}
        </div>
      ) : (
        <WorkspaceEmptyState
          icon={<FolderSearch2Icon />}
          title="No evaluations yet"
          description="Create an evaluation when saved products become serious pilot candidates."
          action={<Button asChild><Link href="/workspace/evaluations/new">Create evaluation</Link></Button>}
        />
      )}
    </WorkspaceShell>
  );
}
