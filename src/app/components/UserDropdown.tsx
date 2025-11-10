'use client'

import ThemeToggle from '@/app/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { userRoleMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Role } from '@prisma/client'
import { signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { CiLogout } from 'react-icons/ci'
import { MdInfoOutline, MdOutlineSettings } from 'react-icons/md'

/**
 * UserDropdown
 * ------------------------------------------------------------------
 * Displays user avatar with dropdown menu.
 * - Shows user info and quick actions (Settings, Theme, Logout)
 * - Highlights avatar when user is on Settings page
 */
const UserDropdown = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const user = session?.user

  if (!user) return null

  /** Returns initials for avatar fallback (e.g., "John Doe" → "JD") */
  const getInitials = (name?: string | null): string => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }

  const initials = getInitials(user.name)
  const isTechnician = user.role === 'TECHNICIAN'
  const isOnSettings = pathname.includes('/settings')

  return (
    <DropdownMenu>
      {/* Avatar trigger */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center justify-center bg-transparent hover:bg-muted rounded-full p-0 transition-all"
          title={user.name || user.email}
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold p-2">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      {/* Dropdown content */}
      <DropdownMenuContent
        align="end"
        className="w-56 bg-background border border-border rounded-xl shadow-lg"
      >
        {/* --- User info header --- */}
        <DropdownMenuLabel className="flex flex-col gap-0.5 text-sm font-medium p-3 pb-2">
          <div className="font-semibold text-base text-center truncate">
            {user.name || 'Nieznany użytkownik'}
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {user.identyficator && <div>ID: {user.identyficator}</div>}
            {user.role && <div>{userRoleMap[user.role as Role]}</div>}
            {user.email && <div>{user.email}</div>}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* --- Settings navigation --- */}
        <DropdownMenuItem
          onClick={() =>
            router.push(isTechnician ? '/settings' : '/admin-panel/settings')
          }
          className={cn(
            'cursor-pointer text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-sm transition-colors',
            isOnSettings
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold'
              : 'text-foreground hover:text-foreground'
          )}
        >
          <MdOutlineSettings className="w-5 h-5" />
          Ustawienia
        </DropdownMenuItem>

        {/* --- Theme toggle row --- */}
        <DropdownMenuItem asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-default">
            <span className="text-sm font-medium flex items-center gap-2">
              <MdInfoOutline className="w-5 h-5" />
              Motyw
            </span>
            <ThemeToggle />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* --- Future section (help/about placeholders) --- */}
        {/* <DropdownMenuItem
          disabled
          className="cursor-default text-muted-foreground flex items-center gap-2 px-3 py-2"
        >
          <MdHelpOutline className="w-5 h-5" />
          Pomoc (wkrótce)
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="cursor-default text-muted-foreground flex items-center gap-2 px-3 py-2"
        >
          <MdInfoOutline className="w-5 h-5" />O aplikacji (wkrótce)
        </DropdownMenuItem>

        <DropdownMenuSeparator /> */}

        {/* --- Logout --- */}
        <DropdownMenuItem
          className="text-danger hover:text-danger focus:text-danger cursor-pointer font-medium text-center"
          onClick={() =>
            signOut({ callbackUrl: `${window.location.origin}/login` })
          }
        >
          <CiLogout className="mr-2" /> Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserDropdown
