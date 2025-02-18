'use client'

import SidebarContent from './SidebarContent'

export default function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 bg-secondary text-secondary-foreground flex-col border-r border-border pt-20">
      <SidebarContent />
    </aside>
  )
}
