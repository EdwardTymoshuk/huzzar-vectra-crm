'use client'

import { Button } from '@/app/components/ui/button'
import { PrimaryAddonCode } from '@/types/opl-crm'
import { OplActivationType, OplBaseWorkCode } from '@prisma/client'

/**
 * Displays additional work codes.
 * All addon codes are visible.
 * Primary codes are only visual hints.
 */
export const AddonsSection = ({
  primary,
  all,
  showAll,
  activation,
  mrCount,
  umz,
  onToggleShowAll,
  onMr,
  onToggleAddon,
  onToggleUmz,
  selected,
  base,
}: {
  primary: PrimaryAddonCode[]
  all: PrimaryAddonCode[]
  showAll: boolean
  activation: OplActivationType | null
  mrCount: number
  umz: boolean
  onToggleShowAll: () => void
  onMr: () => void
  onToggleAddon: (code: PrimaryAddonCode) => void
  onToggleUmz: () => void
  selected: PrimaryAddonCode[]
  base: OplBaseWorkCode | null
}) => {
  const renderButton = (c: PrimaryAddonCode) => {
    /* -------- MR -------- */
    if (c === 'MR') {
      const disabled = activation !== 'I_3P'

      return (
        <Button
          key="MR"
          disabled={disabled}
          onClick={onMr}
          variant={mrCount > 0 ? 'default' : 'outline'}
        >
          {mrCount > 0 ? `MR ×${mrCount}` : 'MR'}
        </Button>
      )
    }

    /* -------- DIG (auto) -------- */
    if (c === 'ZJDD' || c === 'ZJKD' || c === 'ZJND') {
      return (
        <Button key={c} variant="outline" disabled>
          {c}
        </Button>
      )
    }

    /* -------- SERVICE BLOCK BY BASE -------- */
    const disabledByBase =
      base !== null &&
      (c === 'DMR' || c === 'DTV' || c === 'DMOD' || c === 'DDSD')

    const isSelected = selected.includes(c)
    const isPrimary = primary.includes(c)

    return (
      <Button
        key={c}
        disabled={disabledByBase}
        variant={isSelected ? 'default' : 'outline'}
        onClick={() => onToggleAddon(c)}
      >
        {c}
      </Button>
    )
  }

  const rest = all.filter((c) => !primary.includes(c))

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Dodatkowe kody</h3>

      {/* PRIMARY (hint only) */}
      <div className="grid grid-cols-2 gap-2">{primary.map(renderButton)}</div>

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
        <div className="grid grid-cols-2 gap-2">{rest.map(renderButton)}</div>
      )}
    </section>
  )
}
