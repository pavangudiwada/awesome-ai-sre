import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import { getInitials } from "./utils"

interface BrandMarkProps {
  name: string
  src?: string | null
  size?: "card" | "profile"
  className?: string
}

export function BrandMark({
  name,
  src,
  size = "card",
  className,
}: BrandMarkProps) {
  return (
    <Avatar
      className={cn(
        "shrink-0 rounded-md border bg-background",
        size === "card" ? "size-9" : "size-12",
        className
      )}
    >
      {src ? <AvatarImage src={src} alt={`${name} logo`} className="object-contain" /> : null}
      <AvatarFallback className="rounded-md font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
