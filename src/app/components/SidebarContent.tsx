'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import UserDropdown from './UserDropdown'

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
        <UserDropdown />
        <ThemeToggle />
      </div>
    </div>
  )
}
