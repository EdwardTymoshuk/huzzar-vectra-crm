'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { VectraActivatedService } from '@/types/vectra-crm'
import { GrPowerReset } from 'react-icons/gr'

type Props = {
  activatedServices: VectraActivatedService[]
  value: { pion: number; listwa: number }
  onChangeAction: (val: { pion: number; listwa: number }) => void
}

/**
 * InstallationSection – Technician's installation elements management.
 *
 * - Displays summary of installation items:
 *   • Przyłącze: always one (disabled)
 *   • Gniazdo: one per activated service
 *   • Pion / Listwa: editable counters
 * - Fully responsive: single column on mobile, 2 columns on sm+, 4 on lg+.
 * - Includes a reset button spanning full width.
 */
const InstallationSection = ({
  activatedServices,
  value,
  onChangeAction,
}: Props) => {
  const socketCount = activatedServices.reduce((count, svc) => {
    if (svc.type === 'NET') return count + 1 + (svc.extraDevices?.length ?? 0)
    if (['DTV', 'TEL', 'ATV'].includes(svc.type)) return count + 1
    return count
  }, 0)

  const resetCounters = () => onChangeAction({ pion: 0, listwa: 0 })

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div
          className="
            grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch
          "
        >
          {/* Przyłącze */}
          <Button
            variant="secondary"
            disabled
            className="w-full justify-between h-12"
          >
            <span>Przyłącze</span>
            <span className="font-semibold">×1</span>
          </Button>

          {/* Gniazdo */}
          <Button
            variant={socketCount > 0 ? 'secondary' : 'outline'}
            disabled
            className="w-full justify-between h-12"
          >
            <span>Gniazdo</span>
            <span className="font-semibold">×{socketCount}</span>
          </Button>

          {/* Pion counter */}
          <div className="flex flex-col w-full">
            <span className="text-xs mb-1 text-center text-muted-foreground">
              Pion
            </span>
            <div className="flex rounded-lg border bg-background overflow-hidden h-fit">
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
                disabled={value.pion === 0}
              >
                −
              </Button>
              <span className="flex-1 flex items-center justify-center font-semibold select-none">
                {value.pion}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({ ...value, pion: Math.min(1, value.pion + 1) })
                }
                disabled={value.pion >= 1}
              >
                +
              </Button>
            </div>
          </div>

          {/* Listwa counter */}
          <div className="flex flex-col w-full">
            <span className="text-xs mb-1 text-center text-muted-foreground">
              Listwa
            </span>
            <div className="flex rounded-lg border bg-background overflow-hidden max-h-fit">
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
                disabled={value.listwa === 0}
              >
                −
              </Button>
              <span className="flex-1 flex items-center justify-center font-semibold select-none">
                {value.listwa}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="rounded-none px-3"
                onClick={() =>
                  onChangeAction({ ...value, listwa: value.listwa + 1 })
                }
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Reset button */}
        {(value.listwa !== 0 || value.pion !== 0) && (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={resetCounters}
            >
              <GrPowerReset className="mr-2" /> Resetuj
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default InstallationSection
