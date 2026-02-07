'use client'

import { Button } from '@/app/components/ui/button'
import { OplBaseWorkCode } from '@prisma/client'

/**
 * Displays base work codes.
 * Shows 4 primary codes by default, with optional expansion.
 */
export const BaseWorkSection = ({
  value,
  primary,
  all,
  showAll,
  onToggleShowAll,
  onChange,
}: {
  value: OplBaseWorkCode | null
  primary: OplBaseWorkCode[]
  all: OplBaseWorkCode[]
  showAll: boolean
  onToggleShowAll: () => void
  onChange: (v: OplBaseWorkCode) => void
}) => {
  const rest = all.filter((c) => !primary.includes(c))

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Wybudowanie</h3>

      {/* PRIMARY (4) */}
      <div className="grid grid-cols-2 gap-2">
        {primary.map((c) => (
          <Button
            key={c}
            variant={value === c ? 'default' : 'outline'}
            onClick={() => onChange(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {/* TOGGLE */}
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

      {/* ALL */}
      {showAll && (
        <div className="grid grid-cols-2 gap-2">
          {rest.map((c) => (
            <Button
              key={c}
              variant={value === c ? 'default' : 'outline'}
              onClick={() => onChange(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      )}
    </section>
  )
}
