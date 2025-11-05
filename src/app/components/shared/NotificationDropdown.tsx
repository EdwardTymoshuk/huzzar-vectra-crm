'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Bell } from 'lucide-react'

/**
 * NotificationDropdown
 *
 * Reusable notifications dropdown component.
 * - Displays notification bell with badge (if new items exist).
 * - Contains dropdown list of recent notifications.
 * - Used in both TopNav (desktop) and MobileHeader (mobile).
 */
const NotificationDropdown = () => {
  // TODO: Integrate with TRPC query, e.g. trpc.notifications.getUnread.useQuery()
  const notifications: { id: string; title: string; date: string }[] = [] // placeholder data
  const hasNotifications = notifications.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group relative rounded-full hover:bg-transparent focus-visible:outline-none"
          aria-label="Powiadomienia"
        >
          {/* Icon */}
          <Bell className="h-8 w-8 text-primary-foreground transition-colors group-hover:text-primary" />
          {hasNotifications && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-warning rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-72 bg-background border border-border rounded-md shadow-md"
      >
        <DropdownMenuLabel className="text-sm font-semibold text-foreground px-3 py-2">
          Powiadomienia
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasNotifications ? (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start px-3 py-2 gap-1 cursor-pointer hover:bg-accent/50"
            >
              <span className="text-sm font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.date}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem
            disabled
            className="text-sm text-muted-foreground text-center py-3"
          >
            Brak nowych powiadomień
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationDropdown
