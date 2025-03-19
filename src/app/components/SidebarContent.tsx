'use client'

import { adminsMenuItems, techniciansMenuItems } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { MenuItem } from '@/types'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import UserDropdown from './UserDropdown'

const SidebarContent = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pobranie aktywnej zakładki z parametrów URL (domyślnie dashboard)
  const currentTab = searchParams.get('tab') || 'dashboard'

  // Wybór menu na podstawie roli użytkownika
  const menuItems: MenuItem[] =
    session?.user.role === 'ADMIN' ||
    session?.user.role === 'COORDINATOR' ||
    session?.user.role === 'WAREHOUSEMAN'
      ? adminsMenuItems
      : techniciansMenuItems

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />

      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => {
          const isActive =
            item.key === 'orders'
              ? currentTab === 'orders' || currentTab === 'planning'
              : currentTab === item.key

          return (
            <div
              key={item.key}
              onClick={() => router.push(`/admin-panel?tab=${item.key}`)}
              className={cn(
                'flex items-center p-3 transition cursor-pointer text-background',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border flex flex-col items-center space-y-4">
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}

export default SidebarContent
