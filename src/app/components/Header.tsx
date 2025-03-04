'use client'

import { Button } from '@/app/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/app/components/ui/sheet'
import { MdMenu } from 'react-icons/md'
import Logo from './Logo'
import SidebarContent from './SidebarContent' // Mobile Sidebar Content

/**
 * Header component that includes a mobile sidebar toggle.
 */
export default function Header() {
  return (
    <header className="w-full bg-secondary text-secondary-foreground flex md:hidden items-center justify-between px-4 py-3 md:pl-72 border-b border-border">
      {/* Mobile Menu Button */}
      <Sheet>
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
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <Logo />
    </header>
  )
}
