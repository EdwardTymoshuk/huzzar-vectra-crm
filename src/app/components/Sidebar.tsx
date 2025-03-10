'use client'

import SidebarContent from './SidebarContent'

/**
 * Sidebar component wraps the dynamic SidebarContent
 * and provides a consistent layout.
 */
const Sidebar = () => {
  return (
    <aside className="hidden md:flex h-screen w-64 bg-secondary text-secondary-foreground flex-col border-r border-border">
      <SidebarContent />
    </aside>
  )
}

export default Sidebar
