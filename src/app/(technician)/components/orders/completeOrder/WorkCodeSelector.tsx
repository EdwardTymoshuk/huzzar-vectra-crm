'use client'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { SelectedCode } from '@/types'
import { sortCodes } from '@/utils/sortCodes'
import { useCallback, useEffect, useState } from 'react'
import { MdDelete } from 'react-icons/md'

type Props = {
  selected: SelectedCode[]
  setSelected: (codes: SelectedCode[]) => void
  codes: { id: string; code: string }[]
}

/**
 * WorkCodeSelector component allows selecting work codes with quantity control.
 * - Codes are clickable badges.
 * - Clicking adds a code or increases its quantity.
 * - Quantity can be changed via +/- buttons or removed entirely.
 * - Props include selected state and full list of codes.
 */
const WorkCodeSelector = ({ selected, setSelected, codes }: Props) => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  const clearTimer = useCallback(() => {
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
    }
  }, [timer])

  const startAutoCollapse = useCallback(() => {
    clearTimer()
    const timeout = setTimeout(() => {
      setExpandedCode(null)
      setTimer(null)
    }, 3000)
    setTimer(timeout)
  }, [clearTimer])

  const handleBadgeClick = (code: string) => {
    clearTimer()
    if (expandedCode !== code) {
      setExpandedCode(code)
      startAutoCollapse()
    }

    const existing = selected.find((c) => c.code === code)
    if (existing) {
      setSelected(
        selected.map((c) =>
          c.code === code ? { ...c, quantity: c.quantity + 1 } : c
        )
      )
    } else {
      setSelected([...selected, { code, quantity: 1 }])
    }
  }

  const handleIncrease = (code: string) => {
    setSelected(
      selected.map((c) =>
        c.code === code ? { ...c, quantity: c.quantity + 1 } : c
      )
    )
    clearTimer()
    startAutoCollapse()
  }

  const handleDecrease = (code: string) => {
    setSelected(
      selected.map((c) =>
        c.code === code && c.quantity > 1
          ? { ...c, quantity: c.quantity - 1 }
          : c
      )
    )
    clearTimer()
    startAutoCollapse()
  }

  const handleDelete = (code: string) => {
    setSelected(selected.filter((c) => c.code !== code))
  }

  useEffect(() => {
    return () => clearTimer()
  }, [timer, clearTimer])

  const sortedCodes = sortCodes(codes.map((c) => c.code))
  const codesMap = Object.fromEntries(codes.map((c) => [c.code, c.id]))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-semibold">Kody pracy</h4>
        <div className="flex flex-wrap gap-2">
          {sortedCodes.map((code) => {
            const id = codesMap[code]
            const selectedEntry = selected.find((c) => c.code === code)

            return (
              <Badge
                key={id}
                variant="secondary"
                className={cn(
                  'cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm',
                  expandedCode === code
                    ? 'scale-110 bg-primary text-white hover:bg-primary'
                    : ''
                )}
              >
                <span
                  className="cursor-pointer"
                  onClick={() => handleBadgeClick(code)}
                >
                  {code}
                </span>
                {expandedCode === code && (
                  <span className="flex text-foreground items-center gap-1 bg-muted rounded-full ml-2 px-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!selectedEntry || selectedEntry.quantity <= 1}
                      onClick={(e) => {
                        if (!selectedEntry || selectedEntry.quantity <= 1)
                          return
                        e.stopPropagation()
                        handleDecrease(code)
                      }}
                      className={cn(
                        'h-5 w-5 p-0 items-center',
                        (!selectedEntry || selectedEntry.quantity <= 1) &&
                          'opacity-50 cursor-default pointer-events-none'
                      )}
                    >
                      -
                    </Button>
                    <span className="text-xs w-4 text-center">
                      {selectedEntry?.quantity ?? 1}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleIncrease(code)
                      }}
                      className="h-5 w-5 p-0 items-center"
                    >
                      +
                    </Button>
                  </span>
                )}
              </Badge>
            )
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 pt-4">
          <p className="font-medium">Wybrane kody</p>
          <div className="flex flex-col gap-2">
            {sortCodes(selected.map((c) => c.code)).map((code) => {
              const entry = selected.find((c) => c.code === code)!
              return (
                <div
                  key={code}
                  className="flex items-center justify-between rounded border px-4 py-2 text-sm font-medium bg-muted text-muted-foreground"
                >
                  <span className="flex-1">{code}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={entry.quantity <= 1}
                      onClick={() => handleDecrease(code)}
                    >
                      -
                    </Button>
                    <span>{entry.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIncrease(code)}
                    >
                      +
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(code)}
                      className="ml-2 text-danger hover:text-danger"
                    >
                      <MdDelete />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkCodeSelector
