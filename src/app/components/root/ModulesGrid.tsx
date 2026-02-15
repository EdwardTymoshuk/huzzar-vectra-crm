'use client'

import { platformModules } from '@/lib/platformModules'
import { trpc } from '@/utils/trpc'
import { ShieldAlert } from 'lucide-react'
import LoaderSpinner from '../LoaderSpinner'
import MaxWidthWrapper from '../MaxWidthWrapper'
import ModuleCard from './ModuleCard'

/**
 * ModulesGrid
 * --------------------------------------------------------------
 * Displays enabled platform modules available in database.
 * Merges database module data with frontend module definitions.
 */
const ModulesGrid = () => {
  const { data: dbModules, isLoading } = trpc.core.user.getModules.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  )

  if (isLoading) {
    return (
      <MaxWidthWrapper className="justify-center items-center">
        <LoaderSpinner />
      </MaxWidthWrapper>
    )
  }

  if (!dbModules || dbModules.length === 0) {
    return (
      <MaxWidthWrapper className="justify-center items-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-border/80 bg-muted/20 p-8 md:p-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
            Brak przypisanych modułów
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            Twoje konto nie ma jeszcze dostępu do żadnego modułu systemu.
            Skontaktuj się z administratorem, aby nadać uprawnienia.
          </p>
        </div>
      </MaxWidthWrapper>
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
    .filter(
      (module): module is (typeof platformModules)[number] & { enabled: boolean } =>
        module !== null
    )

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
