"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { cn } from "@/lib/utils"

interface ProductMediaProps {
  name: string
  src?: string | null
  alt?: string
  priority?: boolean
  className?: string
}

export function ProductMedia({
  name,
  src,
  alt,
  priority = false,
  className,
}: ProductMediaProps) {
  const [failed, setFailed] = useState(false)
  const canRenderImage = Boolean(src) && !failed

  return (
    <AspectRatio
      ratio={8 / 5}
      className={cn("overflow-hidden bg-muted", className)}
    >
      {canRenderImage ? (
        <Image
          src={src!}
          alt={alt ?? `${name} product preview`}
          fill
          sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          loading={priority ? "eager" : "lazy"}
          unoptimized
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div
          className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground"
          role="img"
          aria-label={`Preview unavailable for ${name}`}
        >
          <ImageIcon className="size-5" aria-hidden="true" />
          <span className="text-sm">Preview unavailable</span>
        </div>
      )}
    </AspectRatio>
  )
}
