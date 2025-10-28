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
import { Role } from '@prisma/client'
import { signOut, useSession } from 'next-auth/react'
import { CiLogout } from 'react-icons/ci'

/**
 * UserDropdown
 *
 * Displays current user avatar with dropdown menu.
 * - Shows user details (name, role, email, identifier)
 * - Allows theme switching and logout.
 * - Clean minimal design integrated with TopNav and MobileNav.
 */
const UserDropdown = () => {
  const { data: session } = useSession()
  const user = session?.user

  if (!user) return null

  /** Generates user initials (e.g., "Jan Kowalski" → "JK") */
  const getInitials = (name?: string | null): string => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }

  const initials = getInitials(user.name)

  return (
    <DropdownMenu>
      {/* Trigger: circular avatar */}
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
        {/* User info header */}
        <DropdownMenuLabel className="flex flex-col gap-0.5 text-sm font-medium p-3 pb-2 space-y-2">
          <div className="font-semibold text-base text-center truncate">
            {user.name || 'Nieznany użytkownik'}
          </div>
          <div className="text-center">
            {user.identyficator && (
              <div className="text-xs text-muted-foreground">
                ID: {user.identyficator}
              </div>
            )}
            {user.role && (
              <div className="text-xs text-muted-foreground">
                {userRoleMap[user.role as Role]}
              </div>
            )}
            {user.email && (
              <div className="text-xs text-muted-foreground">{user.email}</div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme toggle row */}
        <DropdownMenuItem asChild>
          <div className="flex items-center justify-between px-2 py-2 cursor-default">
            <span className="text-sm font-medium">Motyw</span>
            <ThemeToggle />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout button */}
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
