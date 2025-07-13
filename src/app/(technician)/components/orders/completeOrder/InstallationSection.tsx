'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { ActivatedService } from '@/types'
import { GrPowerReset } from 'react-icons/gr'

type Props = {
  activatedServices: ActivatedService[]
  value: { pion: number; listwa: number }
  onChangeAction: (val: { pion: number; listwa: number }) => void
}

/**
 * InstallationSection – Technician's installation elements management.
 *
 * - Displays a summary of installation items:
 *   • "Przyłącze" (connection): always one, not editable.
 *   • "Gniazdo" (socket): calculated as the number of activated services.
 *   • "Pion" (vertical shaft) and "Listwa" (molding): increment/decrement with visible counters.
 * - Full-width, responsive grid and card-based UI, consistent with the ServicesSection.
 * - Includes a reset button to quickly zero both counters.
 */
export const InstallationSection = ({
  activatedServices,
  value,
  onChangeAction,
}: Props) => {
  // Calculate the number of sockets (one per service)
  const socketCount = activatedServices.filter((s) =>
    ['DTV', 'NET', 'TEL', 'ATV'].includes(s.type)
  ).length

  // Reset both counters to 0
  const resetCounters = () => onChangeAction({ pion: 0, listwa: 0 })

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:items-end">
          {/* Always one connection */}
          <Button variant="secondary" disabled className="w-full">
            Przyłącze <span className="ml-1">×1</span>
          </Button>
          {/* Sockets: one per activated service */}
          <Button
            variant={socketCount > 0 ? 'secondary' : 'outline'}
            disabled
            className="w-full"
          >
            Gniazdo <span className="ml-1">×{socketCount}</span>
          </Button>
          {/* Vertical shafts counter */}
          <div className="flex flex-col w-full">
            <span className="text-xs mb-1 text-center text-muted-foreground">
              Pion
            </span>
            <div className="flex rounded-lg border bg-background overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({
                    ...value,
                    pion: Math.max(0, value.pion - 1),
                  })
                }
                aria-label="Decrement pion"
                tabIndex={-1}
                disabled={value.pion === 0}
              >
                −
              </Button>
              <span className="flex-1 flex items-center justify-center min-w-[40px] font-semibold select-none">
                {value.pion}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({ ...value, pion: value.pion + 1 })
                }
                aria-label="Increment pion"
                tabIndex={-1}
              >
                +
              </Button>
            </div>
          </div>
          {/* Molding counter */}
          <div className="flex flex-col w-full">
            <span className="text-xs mb-1 text-center text-muted-foreground">
              Listwa
            </span>
            <div className="flex rounded-lg border bg-background overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({
                    ...value,
                    listwa: Math.max(0, value.listwa - 1),
                  })
                }
                aria-label="Decrement listwa"
                tabIndex={-1}
                disabled={value.listwa === 0}
              >
                −
              </Button>
              <span className="flex-1 flex items-center justify-center min-w-[40px] font-semibold select-none">
                {value.listwa}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({ ...value, listwa: value.listwa + 1 })
                }
                aria-label="Increment listwa"
                tabIndex={-1}
              >
                +
              </Button>
            </div>
          </div>
          {/* Reset button (spans all columns on mobile/desktop) */}
          {(value.listwa !== 0 || value.pion !== 0) && (
            <Button
              type="button"
              variant="ghost"
              className="w-full col-span-1 sm:col-span-2 md:col-span-4 mt-2"
              onClick={resetCounters}
            >
              <GrPowerReset className="mr-2" /> Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default InstallationSection
