import Image from "next/image"

/** Supplied Open Lens artwork, unmodified; reserve its clear space in the wrapper. */
export function BrandLockup({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center p-3" aria-hidden="true" data-brand="open-lens">
      {compactOnMobile ? (
        <span className="sm:hidden">
          <Image src="/brand/mark-light.svg" width={40} height={40} alt="" className="size-10 dark:hidden" />
          <Image src="/brand/mark-dark.svg" width={40} height={40} alt="" className="hidden size-10 dark:block" />
        </span>
      ) : null}
      <span className={compactOnMobile ? "hidden sm:block" : "block"}>
        <Image src="/brand/header-wordmark-light.svg" width={176} height={40} alt="" className="h-10 w-44 dark:hidden" />
        <Image src="/brand/header-wordmark-dark.svg" width={176} height={40} alt="" className="hidden h-10 w-44 dark:block" />
      </span>
    </span>
  )
}
