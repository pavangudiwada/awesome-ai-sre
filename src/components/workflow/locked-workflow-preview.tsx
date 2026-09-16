import Link from "next/link";
import { FileTextIcon, FolderSearch2Icon, LockKeyholeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIVATE_WORKFLOWS_AVAILABLE } from "@/lib/features";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export function LockedWorkflowPreview({
  returnTo,
  compact = false,
  privateWorkflowsAvailable = PRIVATE_WORKFLOWS_AVAILABLE,
}: {
  returnTo: string;
  compact?: boolean;
  privateWorkflowsAvailable?: boolean;
}) {
  if (compact) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <LockKeyholeIcon className="size-4" aria-hidden="true" />
              Private evaluation workspace
            </CardTitle>
            <CardDescription>
              {privateWorkflowsAvailable
                ? "Your notes, evaluations, and research stay private."
                : "Private notes and evaluations are coming soon."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="justify-end">
          {privateWorkflowsAvailable ? (
            <Button asChild className="h-11">
              <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>
                Sign in to use the workspace
              </Link>
            </Button>
          ) : (
            <Button type="button" className="h-11" disabled>
              Workspace coming soon
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Private evaluation workspace</CardTitle>
            <CardDescription>
              {privateWorkflowsAvailable
                ? "Public evidence stays visible. Sign in only when you want personal workflow."
                : "Public evidence stays visible while we finish the private workspace."}
            </CardDescription>
          </div>
          <Badge variant="outline">
            <LockKeyholeIcon />
            {privateWorkflowsAvailable ? "Private" : "Coming soon"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ItemGroup className="grid sm:grid-cols-2">
          <Item variant="muted" className="min-h-28 items-start">
            <ItemMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Product note</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Keep one auto-saved private note for questions and research context.
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item variant="muted" className="min-h-28 items-start">
            <ItemMedia variant="icon">
              <FolderSearch2Icon aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Evaluation brief</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Capture your goal, requirements, risks, candidates, and decision.
              </ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
      <CardFooter>
        {privateWorkflowsAvailable ? (
          <Button asChild>
            <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>
              Sign in to use the workspace
            </Link>
          </Button>
        ) : (
          <Button type="button" disabled>
            Workspace coming soon
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
