"use client"

import { useEffect, type ComponentProps } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AudioLinesIcon,
  BellIcon,
  CommandIcon,
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
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type {
  WatchlistNavItem,
  WatchlistNotification,
  WatchlistViewer,
  ServerFormAction,
} from "./types"
import { getInitials } from "./utils"

const DEFAULT_NAV_ITEMS: WatchlistNavItem[] = [
  { label: "Tools", href: "/tools" },
  { label: "Observability", href: "/observability" },
  { label: "Resources", href: "/resources" },
  { label: "Updates", href: "/updates" },
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
}: SiteHeaderProps) {
  const pathname = usePathname() ?? "/"
  const resolvedNavItems = navItems.map((item) => ({
    ...item,
    active:
      item.active ??
      (pathname === item.href ||
        pathname.startsWith(`${item.href}/`) ||
        (item.href === "/tools" && pathname.startsWith("/companies/"))),
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
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNavigation navItems={resolvedNavItems} />

        <Link
          href={homeHref}
          className="flex min-h-11 shrink-0 items-center gap-2 font-semibold tracking-tight"
          aria-label="AI SRE Watchlist home"
          title="AI SRE Watchlist home"
        >
          <WatchlistMark />
          <span className="hidden sm:inline">AI SRE Watchlist</span>
        </Link>

        <NavigationMenu
          viewport={false}
          className="ml-4 hidden lg:flex"
          aria-label="Primary"
        >
          <NavigationMenuList>
            {resolvedNavItems.map((item) => (
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <HeaderSearch searchHref={searchHref} onSearchOpen={onSearchOpen} />

          {viewer ? (
            <Button asChild variant="ghost" className="hidden h-11 md:inline-flex">
              <Link href={viewer.workspaceHref ?? "/workspace/saved"}>
                Workspace
              </Link>
            </Button>
          ) : null}

          <NotificationsMenu
            notifications={notifications}
            onNotificationSelect={onNotificationSelect}
            markNotificationReadAction={markNotificationReadAction}
          />

          {viewer ? (
            <ViewerMenu viewer={viewer} />
          ) : (
            <Button asChild className="h-11">
              <Link href={signInHref}>Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function WatchlistMark() {
  return (
    <Avatar className="size-9 rounded-md" aria-hidden="true">
      <AvatarFallback className="rounded-md">
        <AudioLinesIcon />
      </AvatarFallback>
    </Avatar>
  )
}

function HeaderSearch({
  searchHref,
  onSearchOpen,
}: {
  searchHref: string
  onSearchOpen?: () => void
}) {
  const content = (
    <>
      <SearchIcon data-icon="inline-start" />
      <span className="hidden sm:inline">Search Watchlist</span>
      <CommandIcon data-icon="inline-end" className="ml-auto hidden sm:block" />
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onSearchOpen ? (
          <Button
            type="button"
            variant="outline"
            className="size-11 justify-center sm:h-11 sm:w-52 sm:justify-start"
            onClick={onSearchOpen}
            aria-label="Search tools and resources"
          >
            {content}
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="size-11 justify-center sm:h-11 sm:w-52 sm:justify-start"
          >
            <Link href={searchHref} aria-label="Search tools and resources">
              {content}
            </Link>
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">Search tools and resources</TooltipContent>
    </Tooltip>
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
          className="size-11 lg:hidden"
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
          {navItems.map((item) => (
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
}

function NotificationsMenu({
  notifications,
  onNotificationSelect,
  markNotificationReadAction,
}: NotificationsMenuProps) {
  const unreadCount = notifications.filter(({ unread }) => unread).length

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
                Watchlist reports and updates from companies you follow.
              </PopoverDescription>
            </PopoverHeader>
            <Separator />
            <NotificationList
              notifications={notifications}
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
                Watchlist reports and updates from companies you follow.
              </SheetDescription>
            </SheetHeader>
            <NotificationList
              notifications={notifications}
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
    unreadCount > 0
      ? `Open updates, ${unreadCount} unread`
      : "Open updates"

  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative size-11", className)}
      aria-label={label}
      title={label}
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
  closeOnSelect = false,
}: NotificationsMenuProps & { closeOnSelect?: boolean }) {
  if (notifications.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyTitle>No updates yet</EmptyTitle>
          <EmptyDescription>
            Published Watchlist updates and followed-company updates will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="max-h-[28rem]">
      <div className="flex flex-col">
        {notifications.map((notification, index) => {
          const notificationLink = (
            <Link
              href={notification.href}
              onClick={() => {
                onNotificationSelect?.(notification)
                if (notification.unread && markNotificationReadAction) {
                  const formData = new FormData()
                  formData.set("updateId", notification.id)
                  void markNotificationReadAction(formData)
                }
              }}
              className="flex min-h-24 flex-col gap-2 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium leading-snug">{notification.title}</span>
                {notification.unread ? <Badge>New</Badge> : null}
              </div>
              {notification.summary ? (
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {notification.summary}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {notification.source === "followed-company"
                  ? notification.companyName ?? "Followed company"
                  : "AI SRE Watchlist"}
                {" · "}
                {notification.publishedAtLabel}
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
