'use client'

import { Button } from '@/app/components/ui/button'
import { ActivationPrimaryItem } from '@/types/opl-crm'
import { OplActivationType, OplBaseWorkCode } from '@prisma/client'

/**
 * Displays activation codes.
 * ZJWEW is active only for ZJ base work codes.
 */
export const ActivationSection = ({
  value,
  base,
  primary,
  all,
  showAll,
  onToggleShowAll,
  onChange,
}: {
  value: OplActivationType | null
  base: OplBaseWorkCode | null
  primary: ActivationPrimaryItem[]
  all: ActivationPrimaryItem[]
  showAll: boolean
  onToggleShowAll: () => void
  onChange: (v: OplActivationType) => void
}) => {
  const rest = all.filter((a) => !primary.some((p) => p.code === a.code))

  const isZjBase = base === 'ZJD' || base === 'ZJN' || base === 'ZJK'

  const renderLabel = (code: ActivationPrimaryItem['code']) => {
    if (code === 'I_1P') return '1P'
    if (code === 'I_2P') return '2P'
    if (code === 'I_3P') return '3P'
    return code
  }

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Aktywacja</h3>

      <div className="grid grid-cols-2 gap-2">
        {primary.map(({ code, auto }) => {
          const isZjwew = code === 'ZJWEW'
          const activeZjwew = isZjwew && isZjBase

          return (
            <Button
              key={code}
              disabled={isZjwew && !isZjBase}
              variant={
                auto && activeZjwew
                  ? 'default'
                  : value === code
                  ? 'default'
                  : 'outline'
              }
              onClick={() => {
                if (!auto && !isZjwew) {
                  onChange(code as OplActivationType)
                }
              }}
            >
              {renderLabel(code)}
            </Button>
          )
        })}
      </div>

      {rest.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onToggleShowAll}
        >
          {showAll ? 'Ukryj pozostałe' : 'Pokaż wszystkie'}
        </Button>
      )}

      {showAll && (
        <div className="grid grid-cols-2 gap-2">
          {rest.map(({ code }) => (
            <Button
              key={code}
              variant={value === code ? 'default' : 'outline'}
              onClick={() => onChange(code as OplActivationType)}
            >
              {renderLabel(code)}
            </Button>
          ))}
        </div>
      )}
    </section>
  )
}
