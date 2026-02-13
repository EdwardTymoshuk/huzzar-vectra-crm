'use client'

import { platformModules } from '@/lib/platformModules'
import { trpc } from '@/utils/trpc'
import MaxWidthWrapper from '../MaxWidthWrapper'
import ModuleCard from './ModuleCard'

/**
 * ModulesGrid
 * --------------------------------------------------------------
 * Displays enabled platform modules available in database.
 * Merges database module data with frontend module definitions.
 */
const ModulesGrid = () => {
  const { data: dbModules } = trpc.core.user.getModules.useQuery(undefined, {
    staleTime: 60_000,
  })

  if (!dbModules || dbModules.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Brak przypisanych modułów. Skontaktuj się z administratorem.
      </p>
    )
  }

  /**
   * Merge DB modules with frontend definitions by code.
   */
  const availableModules = dbModules
    .map((dbModule) => {
      const definition = platformModules.find((m) => m.code === dbModule.code)

      if (!definition) return null

      return {
        ...definition,
        enabled: dbModule.enabled,
      }
    })
    .filter(Boolean)

  const count = availableModules.length

  const baseGrid =
    'grid gap-8 w-full justify-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3'

  const layoutClass =
    count <= 1
      ? 'flex justify-center'
      : count === 2
      ? `${baseGrid} lg:grid-cols-2`
      : count === 3
      ? `${baseGrid} lg:grid-cols-3`
      : count === 4
      ? `${baseGrid} lg:grid-cols-4`
      : `${baseGrid} xl:grid-cols-5`

  return (
    <MaxWidthWrapper className="my-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold uppercase">
          Platforma HUZZAR CRM
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Wybierz moduł, do którego chciałbyś przejść
        </p>
      </div>

      <div className={layoutClass}>
        {availableModules.map((dbModule) => {
          const staticModule = platformModules.find(
            (m) => m.code === dbModule.code
          )

          if (!staticModule) return null

          return (
            <ModuleCard
              key={dbModule.code}
              module={{
                ...staticModule,
                enabled: dbModule.enabled,
              }}
            />
          )
        })}
      </div>
    </MaxWidthWrapper>
  )
}

export default ModulesGrid
