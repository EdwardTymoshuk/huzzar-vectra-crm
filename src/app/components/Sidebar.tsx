'use client'

import { useSession } from 'next-auth/react'
import SidebarContentTechnician from '../(technician)/components/SidebarContentTechnician'
import SidebarContent from './SidebarContent'

/**
 * Sidebar component renders the correct sidebar content
 * depending on the current user's role.
 */
const Sidebar = () => {
  const { data: session } = useSession()

  if (!session?.user) return null

  const isTechnician = session.user.role === 'TECHNICIAN'

  return (
    <aside className="hidden md:flex h-full w-64 bg-secondary text-secondary-foreground flex-col border-r border-border">
      {isTechnician ? <SidebarContentTechnician /> : <SidebarContent />}
    </aside>
  )
}

export default Sidebar
