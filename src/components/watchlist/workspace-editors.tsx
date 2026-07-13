"use client"

import type { ChangeEvent, FormEvent } from "react"
import { LockKeyholeIcon, SaveIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type { ServerFormAction } from "./types"

interface ProductNoteEditorProps {
  productName: string
  value: string
  onValueChange: (value: string) => void
  onSave: () => void | Promise<void>
  saveStateLabel?: string
  disabled?: boolean
}

export function ProductNoteEditor({
  productName,
  value,
  onValueChange,
  onSave,
  saveStateLabel,
  disabled = false,
}: ProductNoteEditorProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Private note</CardTitle>
            <CardDescription>
              Keep one working note attached to {productName}.
            </CardDescription>
          </div>
          <Badge variant="outline">
            <LockKeyholeIcon />
            Private
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Field data-disabled={disabled || undefined}>
          <FieldLabel htmlFor="private-product-note" className="sr-only">
            Private note for {productName}
          </FieldLabel>
          <Textarea
            id="private-product-note"
            value={value}
            onChange={handleChange}
            onBlur={() => void onSave()}
            placeholder="Capture evaluation context, questions, or follow-up work…"
            className="min-h-40"
            disabled={disabled}
          />
          <FieldDescription>
            Changes save when you leave the field. Note contents are never included in company analytics.
          </FieldDescription>
        </Field>
      </CardContent>
      {saveStateLabel ? (
        <CardFooter className="justify-end">
          <span className="text-xs text-muted-foreground" role="status">
            {saveStateLabel}
          </span>
        </CardFooter>
      ) : null}
    </Card>
  )
}

interface EvaluationBriefEditorProps {
  action: ServerFormAction
  evaluationId: string
  goal?: string
  requirements?: string
  risks?: string
  decision?: "undecided" | "advance" | "hold" | "reject"
  submitLabel?: string
}

export function EvaluationBriefEditor({
  action,
  evaluationId,
  goal,
  requirements,
  risks,
  decision = "undecided",
  submitLabel = "Save evaluation brief",
}: EvaluationBriefEditorProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!event.currentTarget.reportValidity()) event.preventDefault()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation brief</CardTitle>
        <CardDescription>
          Record why this evaluation exists and what must be true to move forward.
        </CardDescription>
      </CardHeader>
      <form action={action} onSubmit={handleSubmit}>
        <input type="hidden" name="evaluationId" value={evaluationId} />
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="evaluation-goal">Goal</FieldLabel>
              <Textarea
                id="evaluation-goal"
                name="goal"
                defaultValue={goal}
                placeholder="What incident-response outcome are you trying to improve?"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="evaluation-requirements">Requirements</FieldLabel>
              <Textarea
                id="evaluation-requirements"
                name="requirements"
                defaultValue={requirements}
                placeholder="List required integrations, deployment constraints, and security needs."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="evaluation-risks">Risks and open questions</FieldLabel>
              <Textarea
                id="evaluation-risks"
                name="risks"
                defaultValue={risks}
                placeholder="Capture unresolved evidence, access risks, and pilot concerns."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="evaluation-decision">Decision</FieldLabel>
              <Select name="decision" defaultValue={decision}>
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
          <Button type="submit" size="lg" className="h-11">
            <SaveIcon data-icon="inline-start" />
            {submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
