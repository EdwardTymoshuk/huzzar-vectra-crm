'use client'

import { platformModules } from '@/lib/constants'
import { hasModule } from '@/utils/auth/permissions'
import { useUser } from '@/utils/hooks/useUser'
import ModuleCard from './ModuleCard'

const ModulesGrid = () => {
  const { modules, role } = useUser()

  const availableModules =
    role === 'ADMIN'
      ? platformModules
      : platformModules.filter((m) => hasModule(role, modules, m.code))

  if (availableModules.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Brak przypisanych modułów. Skontaktuj się z administratorem.
      </p>
    )
  }

  const count = availableModules.length

  const getGridClass = (count: number): string => {
    /**
     * Base layout:
     * - mobile: 1 column
     * - sm: 2 columns
     * - md: 3 columns
     * Grid is always centered as a block.
     */
    const base =
      'grid gap-8 w-full justify-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3'

    if (count <= 1) {
      return 'flex justify-center'
    }

    if (count === 2) {
      return `${base} lg:grid-cols-2`
    }

    if (count === 3) {
      return `${base} lg:grid-cols-3`
    }

    if (count === 4) {
      return `${base} lg:grid-cols-4`
    }

    return `${base} xl:grid-cols-5`
  }

  const layoutClass = getGridClass(count)

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold uppercase">
          Platforma HUZZAR CRM
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Wybierz moduł, do którego chciałbyś przejść
        </p>
      </div>

      <div className={layoutClass}>
        {availableModules.map((module) => (
          <ModuleCard key={module.code} module={module} />
        ))}
      </div>
    </>
  )
}

export default ModulesGrid
