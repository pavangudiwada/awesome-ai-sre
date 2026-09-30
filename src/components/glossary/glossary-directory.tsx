"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { filterGlossary, GLOSSARY_CHECKED_AT, GLOSSARY_TERMS, GLOSSARY_TOPICS } from "@/lib/glossary";

export function GlossaryDirectory() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") ?? "All topics";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [topic, setTopic] = useState(GLOSSARY_TOPICS.some(value => value === initialTopic) ? initialTopic : "All topics");
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    const nextTopic = searchParams.get("topic") ?? "All topics";
    setTopic(GLOSSARY_TOPICS.some(value => value === nextTopic) ? nextTopic : "All topics");
  }, [searchParams]);
  function change(nextQuery: string, nextTopic: string) {
    setQuery(nextQuery); setTopic(nextTopic);
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextTopic !== "All topics") params.set("topic", nextTopic);
    const suffix = params.toString();
    window.history.replaceState(null, "", `/glossary${suffix ? `?${suffix}` : ""}`);
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const terms = filterGlossary(query, topic);
  function reset() { change("", "All topics"); inputRef.current?.focus(); }
  return <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <Field className="flex-1">
        <FieldLabel htmlFor="glossary-search">Find a term</FieldLabel>
        <InputGroup className="h-14 bg-card">
          <InputGroupInput id="glossary-search" ref={inputRef} value={query} onChange={e => change(e.target.value, topic)} placeholder="Search a term, acronym, or definition…" />
          <InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon>
          {query ? <InputGroupAddon align="inline-end"><InputGroupButton size="icon-sm" className="size-11" aria-label="Clear term search" onClick={() => { change("", topic); inputRef.current?.focus(); }}><XIcon aria-hidden="true" /></InputGroupButton></InputGroupAddon> : null}
        </InputGroup>
      </Field>
      <Field className="sm:w-56">
        <FieldLabel htmlFor="glossary-topic">Topic</FieldLabel>
        <Select value={topic} onValueChange={value => change(query, value)}>
          <SelectTrigger id="glossary-topic" className="min-h-14 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{GLOSSARY_TOPICS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{terms.length} of {GLOSSARY_TERMS.length} terms</p>
    {terms.length ? <div className="grid items-start gap-5 lg:grid-cols-2">
      {terms.map(term => <Card id={term.slug} key={term.slug} className="scroll-mt-24">
        <CardHeader className="gap-3"><Badge variant="outline">{term.topic}</Badge><CardTitle><h2 className="text-xl">{term.name}</h2></CardTitle>{term.aliases.length ? <p className="text-sm text-muted-foreground">Also: {term.aliases.join(" · ")}</p> : null}</CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="leading-relaxed">{term.definition}</p>
          <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">In practice: </span>{term.why}</p>
          <div className="flex flex-col gap-1 border-t pt-3"><a href={term.source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{term.source.title}<span className="sr-only"> (opens in a new tab)</span></a><p className="text-xs text-muted-foreground">Primary source checked {GLOSSARY_CHECKED_AT}</p></div>
          <div><p className="mb-1 text-sm font-medium">Related terms</p><div className="flex flex-wrap gap-1">{term.related.map(slug => { const related = GLOSSARY_TERMS.find(item => item.slug === slug)!; return <Button key={slug} variant="outline" size="sm" className="min-h-11" onClick={() => { change(related.name, "All topics"); inputRef.current?.focus(); }}>{related.name}</Button>; })}</div></div>
          <Link href={term.catalog.href} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{term.catalog.label}</Link>
        </CardContent>
      </Card>)}
    </div> : <Empty><EmptyHeader><EmptyTitle>No terms match your search and topic</EmptyTitle><EmptyDescription>Try an acronym such as SLO or RCA, or reset to see all terms.</EmptyDescription></EmptyHeader><Button className="min-h-11" onClick={reset}>Reset search and topic</Button></Empty>}
  </>;
}
