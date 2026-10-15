"use client"

import { useEffect, useSyncExternalStore, type ComponentProps } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { isPersistedUpdateId } from "@/lib/presentation/notification-id"

import type {
  WatchlistNavItem,
  WatchlistNotification,
  WatchlistViewer,
  ServerFormAction,
} from "./types"
import { getInitials } from "./utils"
import { BrandLockup } from "./brand-lockup"
import { PublicProjectLinks } from "./public-project-links"

const DEFAULT_NAV_ITEMS: WatchlistNavItem[] = [
  { label: "Tools", href: "/tools" },
  { label: "Observability", href: "/observability" },
  { label: "Resources", href: "/resources" },
  { label: "Updates", href: "/updates" },
]

const RESOURCE_ITEMS = [
  { label: "All resources", href: "/resources" },
  { label: "Glossary", href: "/glossary" },
  { label: "Companies", href: "/companies" },
]

interface SiteHeaderProps {
  navItems?: WatchlistNavItem[]
  viewer?: WatchlistViewer | null
  notifications?: WatchlistNotification[]
  signInHref?: string
  homeHref?: string
  searchHref?: string
  onSearchOpen?: () => void
  onNotificationSelect?: (notification: WatchlistNotification) => void
  markNotificationReadAction?: ServerFormAction
  accountPending?: boolean
  accountUnavailable?: boolean
  notificationsStatus?: "loading" | "ready" | "unavailable" | "partial"
}

export function SiteHeader({
  navItems = DEFAULT_NAV_ITEMS,
  viewer,
  notifications = [],
  signInHref = "/sign-in",
  homeHref = "/",
  searchHref = "/tools",
  onSearchOpen,
  onNotificationSelect,
  markNotificationReadAction,
  accountPending = false,
  accountUnavailable = false,
  notificationsStatus = "ready",
}: SiteHeaderProps) {
  const pathname = usePathname() ?? "/"
  const resolvedNavItems = navItems.map((item) => ({
    ...item,
    active:
      item.active ??
      (pathname === item.href ||
        pathname.startsWith(`${item.href}/`)),
  }))

  useEffect(() => {
    if (!onSearchOpen) return

    const openSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onSearchOpen()
      }
    }

    window.addEventListener("keydown", openSearch)
    return () => window.removeEventListener("keydown", openSearch)
  }, [onSearchOpen])

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-screen-2xl flex-wrap items-center gap-x-3 gap-y-1 pb-2 lg:flex-nowrap lg:pb-0 px-4 sm:px-6 lg:px-8">
        <MobileNavigation navItems={resolvedNavItems} />

        <Link
          href={homeHref}
          className="-ml-3 flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="AI SRE Watchlist home"
          title="AI SRE Watchlist home"
        >
          <BrandLockup compactOnMobile />
        </Link>

        <NavigationMenu
          viewport={false}
          className="hidden xl:flex"
          aria-label="Primary"
        >
          <NavigationMenuList>
            {resolvedNavItems.map((item) => item.href === "/resources" ? (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuTrigger className="h-11 px-3">Resources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-48 p-1">
                    {RESOURCE_ITEMS.map((resource) => (
                      <li key={resource.href}>
                        <NavigationMenuLink asChild active={pathname === resource.href || pathname.startsWith(`${resource.href}/`)} className="min-h-11">
                          <Link href={resource.href} aria-current={pathname === resource.href || pathname.startsWith(`${resource.href}/`) ? "page" : undefined}>{resource.label}</Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  active={item.active}
                  className={cn(navigationMenuTriggerStyle(), "h-11 px-3")}
                >
                  <Link
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="order-last flex w-full items-center gap-2 lg:order-none lg:ml-auto lg:w-auto" data-header-search-community>
          <HeaderSearch searchHref={searchHref} onSearchOpen={onSearchOpen} />
          <PublicProjectLinks />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">

          {viewer ? (
            <Button asChild variant="ghost" className="hidden h-11 md:inline-flex">
              <Link href={viewer.workspaceHref ?? "/workspace/saved"}>
                Workspace
              </Link>
            </Button>
          ) : null}

          <NotificationsMenu
            notifications={notifications}
            status={notificationsStatus}
            onNotificationSelect={onNotificationSelect}
            markNotificationReadAction={markNotificationReadAction}
          />

          {accountPending || accountUnavailable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              disabled
              aria-label={accountUnavailable ? "Account temporarily unavailable" : "Loading account"}
              title={accountUnavailable ? "Account temporarily unavailable" : "Loading account"}
            >
              <UserIcon />
            </Button>
          ) : viewer ? (
            <ViewerMenu viewer={viewer} />
          ) : (
            <>
              <Button asChild variant="outline" className="hidden h-11 sm:inline-flex">
                <Link href={signInHref}>Sign up</Link>
              </Button>
              <Button asChild className="h-11">
                <Link href={signInHref}>Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

const subscribeToPlatform = () => () => {}
const getPlatformShortcut = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘ K" : "Ctrl K"
const getServerShortcut = () => "Ctrl K"

function HeaderSearch({
  searchHref,
  onSearchOpen,
}: {
  searchHref: string
  onSearchOpen?: () => void
}) {
  const shortcut = useSyncExternalStore(subscribeToPlatform, getPlatformShortcut, getServerShortcut)
  const content = (
    <>
      <SearchIcon data-icon="inline-start" />
      <span className="lg:hidden 2xl:inline">Search Watchlist</span>
      {onSearchOpen ? <Badge
        variant="secondary"
        className="ml-auto hidden gap-1 rounded-md px-1.5 font-normal 2xl:inline-flex"
        aria-hidden="true"
      >
        {shortcut}
      </Badge> : null}
    </>
  )

  return onSearchOpen ? (
    <Button
      type="button"
      variant="outline"
      className="h-11 min-w-11 flex-1 justify-start lg:size-11 lg:flex-none lg:justify-center 2xl:w-56 2xl:justify-start"
      onClick={onSearchOpen}
      aria-label="Search tools and resources"
      title="Search tools and resources (Ctrl+K or Command+K)"
      aria-keyshortcuts="Control+k Meta+k"
    >
      {content}
    </Button>
  ) : (
    <Button
      asChild
      variant="outline"
      className="h-11 min-w-11 flex-1 justify-start lg:size-11 lg:flex-none lg:justify-center 2xl:w-56 2xl:justify-start"
    >
      <Link
        href={searchHref}
        aria-label="Search tools and resources"
        title="Search tools and resources"
      >
        {content}
      </Link>
    </Button>
  )
}

function MobileNavigation({ navItems }: { navItems: WatchlistNavItem[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 xl:hidden"
          aria-label="Open navigation"
          title="Open navigation"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>AI SRE Watchlist</SheetTitle>
          <SheetDescription>
            Browse tools, evidence, resources, and product updates.
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Mobile primary">
          {navItems.map((item) => item.href === "/resources" ? (
            <DropdownMenu key={item.href}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 justify-between">Resources <ChevronDownIcon aria-hidden="true" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {RESOURCE_ITEMS.map((resource) => (
                  <DropdownMenuItem key={resource.href} asChild>
                    <SheetClose asChild>
                      <Link href={resource.href} className="min-h-11">{resource.label}</Link>
                    </SheetClose>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SheetClose key={item.href} asChild>
              <Button
                asChild
                variant={item.active ? "secondary" : "ghost"}
                className="h-11 justify-start"
              >
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </Button>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

interface NotificationsMenuProps {
  notifications: WatchlistNotification[]
  onNotificationSelect?: (notification: WatchlistNotification) => void
  markNotificationReadAction?: ServerFormAction
  status?: "loading" | "ready" | "unavailable" | "partial"
}

function NotificationsMenu({
  notifications,
  onNotificationSelect,
  markNotificationReadAction,
  status = "ready",
}: NotificationsMenuProps) {
  const unreadCount = notifications.filter(({ unread, id }) => unread && isPersistedUpdateId(id)).length

  return (
    <>
      <div className="hidden md:block">
        <Popover>
          <PopoverTrigger asChild>
            <NotificationTrigger unreadCount={unreadCount} />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <PopoverHeader className="p-4">
              <PopoverTitle role="heading" aria-level={2}>
                Updates
              </PopoverTitle>
              <PopoverDescription>
                Public AI SRE news, with followed-company updates highlighted.
              </PopoverDescription>
            </PopoverHeader>
            <Separator />
            <NotificationList
              notifications={notifications}
              status={status}
              onNotificationSelect={onNotificationSelect}
              markNotificationReadAction={markNotificationReadAction}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <NotificationTrigger unreadCount={unreadCount} />
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Updates</SheetTitle>
              <SheetDescription>
                Public AI SRE news, with followed-company updates highlighted.
              </SheetDescription>
            </SheetHeader>
            <NotificationList
              notifications={notifications}
              status={status}
              onNotificationSelect={onNotificationSelect}
              markNotificationReadAction={markNotificationReadAction}
              closeOnSelect
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

type NotificationTriggerProps = Omit<ComponentProps<typeof Button>, "children"> & {
  unreadCount: number
}

function NotificationTrigger({
  unreadCount,
  className,
  ...props
}: NotificationTriggerProps) {
  const label =
    props["aria-label"] ??
    (unreadCount > 0
      ? `Open updates, ${unreadCount} unread`
      : "Open updates")
  const title = props.title ?? label

  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative size-11", className)}
      aria-label={label}
      title={title}
    >
      <BellIcon />
      {unreadCount > 0 ? (
        <Badge className="absolute -right-1 -top-1 min-w-5 justify-center px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      ) : null}
    </Button>
  )
}

function NotificationList({
  notifications,
  onNotificationSelect,
  markNotificationReadAction,
  status = "ready",
  closeOnSelect = false,
}: NotificationsMenuProps & { closeOnSelect?: boolean }) {
  if (status === "loading") {
    return (
      <Empty className="py-10" role="status" aria-live="polite">
        <EmptyHeader>
          <EmptyTitle>Loading updates</EmptyTitle>
          <EmptyDescription>
            Checking for published Watchlist updates.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if ((status === "unavailable" || status === "partial") && notifications.length === 0) {
    return (
      <Empty className="py-10" role="status">
        <EmptyHeader>
          <EmptyTitle>Updates unavailable</EmptyTitle>
          <EmptyDescription>
            Public navigation is still available. Try the updates menu again later.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (notifications.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyTitle>No updates yet</EmptyTitle>
          <EmptyDescription>
            Reviewed funding, launches, and product news will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="max-h-[28rem]">
      <div className="flex flex-col">
        {status === "partial" || status === "unavailable" ? (
          <p role="status" className="border-b p-4 text-sm text-muted-foreground">
            Some publications or read states are temporarily unavailable. Public news remains available.
          </p>
        ) : null}
        {notifications.map((notification, index) => {
          const notificationLink = (
            <Link
              href={notification.href}
              onClick={() => {
                onNotificationSelect?.(notification)
                if (notification.unread && isPersistedUpdateId(notification.id) && markNotificationReadAction) {
                  const formData = new FormData()
                  formData.set("updateId", notification.id)
                  void markNotificationReadAction(formData)
                }
              }}
              className="flex min-h-24 flex-col gap-2 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium leading-snug">{notification.title}</span>
                {notification.unread && isPersistedUpdateId(notification.id) ? <Badge>New</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {notification.category ? <Badge variant="outline">{notification.category}</Badge> : null}
                {notification.source === "followed-company" ? <Badge variant="secondary">Followed company</Badge> : null}
              </div>
              {notification.summary ? (
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {notification.summary}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {notification.source === "followed-company"
                  ? notification.companyName ?? "Followed company"
                  : notification.companyName ?? "AI SRE Watchlist"}
                {" · "}
                {notification.publishedAtLabel}
                {notification.actualEventDateLabel ? ` · Actual event: ${notification.actualEventDateLabel}` : ""}
              </span>
            </Link>
          )

          return (
            <div key={notification.id}>
              {index > 0 ? <Separator /> : null}
              {closeOnSelect ? (
                <SheetClose asChild>{notificationLink}</SheetClose>
              ) : (
                notificationLink
              )}
            </div>
          )
        })}
        <Button asChild variant="link" className="min-h-11"><Link href="/updates">View all Global Updates</Link></Button>
      </div>
    </ScrollArea>
  )
}

function ViewerMenu({ viewer }: { viewer: WatchlistViewer }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          aria-label={`Open account menu for ${viewer.displayName}`}
          title={`Open account menu for ${viewer.displayName}`}
        >
          <Avatar>
            {viewer.avatarUrl ? (
              <AvatarImage src={viewer.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{getInitials(viewer.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>{viewer.displayName}</span>
          {viewer.email ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {viewer.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={viewer.workspaceHref ?? "/workspace/saved"}>
              <UserIcon />
              Workspace
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={viewer.settingsHref ?? "/settings"}>
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {viewer.signOutAction ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <form action={viewer.signOutAction}>
                <DropdownMenuItem asChild>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="h-auto w-full justify-start px-2 py-1.5"
                  >
                    <LogOutIcon />
                    Sign out
                  </Button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
