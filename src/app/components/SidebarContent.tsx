'use client'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CgProfile } from 'react-icons/cg'
import {
  MdAssignment,
  MdOutlineSettings,
  MdPeopleAlt,
  MdReceiptLong,
  MdSpaceDashboard,
  MdWarehouse,
} from 'react-icons/md'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const menuItems = [
  { name: 'Dashboard', icon: MdSpaceDashboard, href: '/' },
  { name: 'Zlecenia', icon: MdAssignment, href: '/orders' },
  { name: 'Magazyn', icon: MdWarehouse, href: '/warehouse' },
  { name: 'Rozliczenia', icon: MdReceiptLong, href: '/billing' },
  { name: 'Pracownicy', icon: MdPeopleAlt, href: '/employees' },
  { name: 'Ustawienia', icon: MdOutlineSettings, href: '/settings' },
]

export default function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-secondary">
      <Logo className="justify-center w-full" />
      {/* Navigation */}
      <nav className="flex-1 pt-8 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href} onClick={onClose}>
            <div
              className={cn(
                'flex items-center p-3 transition cursor-pointer text-background',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Theme Toggle & User Dropdown */}
      <div className="p-4 border-t border-border flex flex-col items-center space-y-4 transition-none">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="flex items-center bg-primary text-background rounded-full px-3 py-2 hover:bg-primary-hover"
            >
              <CgProfile size={24} className="transition-none" />
              <span className="ml-3 text-sm font-medium">Eduard Tymoshuk</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 bg-background border-border rounded-md">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="w-full font-semibold">
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger hover:text-destructive-hover"
              onClick={() => alert('Logged out!')}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
      </div>
    </div>
  )
}
