"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon, BookOpenIcon, Building2Icon, WrenchIcon } from "lucide-react"

import { BrandMark } from "@/components/watchlist/brand-mark"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

export type WatchlistSearchItem = {
  type: "tool" | "company" | "resource"
  label: string
  description: string
  href: string
  logoSrc?: string | null
}

type WatchlistSearchProps = {
  items: readonly WatchlistSearchItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GROUPS = [
  { type: "tool" as const, label: "Tools", icon: WrenchIcon },
  { type: "company" as const, label: "Companies", icon: Building2Icon },
  { type: "resource" as const, label: "Resources", icon: BookOpenIcon },
]

export function WatchlistSearch({ items, open, onOpenChange }: WatchlistSearchProps) {
  const router = useRouter()

  function navigate(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search the AI SRE Watchlist"
      description="Search tools, companies, and research resources."
      showCloseButton
      className="sm:max-w-xl"
    >
      <Command
        filter={(value, search) =>
          value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) ? 1 : 0
        }
      >
        <CommandInput autoFocus placeholder="Search tools, companies, or guides…" />
        <CommandList className="max-h-[min(28rem,60vh)]">
          <CommandEmpty>No matching tools, companies, or guides.</CommandEmpty>
          {GROUPS.map((group, groupIndex) => {
            const groupItems = items.filter((item) => item.type === group.type)
            if (!groupItems.length) return null
            const Icon = group.icon

            return (
              <div key={group.type}>
                {groupIndex > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group.label}>
                  {groupItems.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={`${item.label} ${item.description}`}
                      onSelect={() => navigate(item.href)}
                      className="min-h-11"
                    >
                      {item.logoSrc ? (
                        <BrandMark name={item.label} src={item.logoSrc} className="size-8" />
                      ) : (
                        <Icon aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            )
          })}
          <CommandSeparator />
          <CommandGroup heading="Directory">
            <CommandItem value="View all tools products directory" onSelect={() => navigate("/tools")} className="min-h-11">
              <WrenchIcon aria-hidden="true" />
              <span>View all tools</span>
              <ArrowRightIcon aria-hidden="true" className="ml-auto" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
