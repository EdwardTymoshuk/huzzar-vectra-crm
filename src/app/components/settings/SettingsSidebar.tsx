import { SETTINGS_SECTIONS } from '@/lib/constants'
import { getSettingsNavItemClass } from '../navigation/navItemStyles'
import { SettingsContext } from '@/types'
import { Role } from '@prisma/client'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'

const SIDEBAR_WIDTH = 256 // 64 * 4

interface Props {
  value: SettingsContext
  onChange: (section: SettingsContext) => void
  role: Role
  modules: string[]
}

/**
 * SettingsSidebar
 * ------------------------------------------------------
 * Fixed application-level sidebar.
 * Does not scroll with content.
 */
export const SettingsSidebar = ({ value, onChange, role, modules }: Props) => {
  const visibleSections = SETTINGS_SECTIONS.filter((section) => {
    if (role === 'ADMIN') return true
    if (!section.roles.includes(role)) return false
    if (section.module && !modules.includes(section.module)) return false
    return true
  })

  return (
    <aside
      className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] border-r bg-background"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <ScrollArea className="h-full">
        <div className="px-4 py-4">
          <h2 className="text-xl font-semibold uppercase text-primary pb-4">
            {role === 'TECHNICIAN' ? 'Moje konto' : 'Ustawienia'}
          </h2>

          <Separator className="mb-4" />

          <nav className="space-y-1">
            {visibleSections.map((section) => {
              const isActive = value === section.key

              return (
                <Button
                  key={section.key}
                  variant="ghost"
                  onClick={() => onChange(section.key)}
                  className={getSettingsNavItemClass(isActive)}
                >
                  {section.label}
                </Button>
              )
            })}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  )
}
