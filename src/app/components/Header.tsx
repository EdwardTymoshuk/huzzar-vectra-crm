'use client'

import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { MdMenu } from 'react-icons/md'
import SidebarContentTechnician from '../(technician)/components/SidebarContentTechnician'
import Logo from './Logo'
import SidebarContent from './SidebarContent' // Mobile Sidebar Content

/**
 * Header component that includes a mobile sidebar toggle.
 */
const Header = () => {
  const [open, setOpen] = useState(false)
  // Extract current user's role from session for role-based access control
  const { data: session } = useSession()
  const isTechnician = session?.user.role === 'TECHNICIAN'

  return (
    <header className="w-full bg-secondary text-secondary-foreground flex md:hidden items-center justify-between px-4 py-3 md:pl-72 border-b border-border">
      {/* Mobile Menu Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="md:hidden border-none text-primary-foreground rounded-md overflow-hidden"
          >
            <MdMenu size={24} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Menu nawigacyjne</SheetTitle>
          <SheetDescription className="sr-only">
            Wybierz sekcję panelu technika
          </SheetDescription>

          {isTechnician ? (
            <SidebarContentTechnician onSelect={() => setOpen(false)} />
          ) : (
            <SidebarContent onSelect={() => setOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
      <Logo />
    </header>
  )
}

export default Header
