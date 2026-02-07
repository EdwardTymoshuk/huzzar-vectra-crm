'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { useState } from 'react'

type Props =
  | {
      open: boolean
      type: 'ZJD' | 'ZJK'
      onConfirm: (meters: number) => void
      onClose: () => void
    }
  | {
      open: boolean
      type: 'ZJN'
      onConfirm: (points: number) => void
      onClose: () => void
    }

/**
 * Dialog for DIG input depending on base work code.
 */
export const DigInputDialog = (props: Props) => {
  const [value, setValue] = useState('')

  const num = Number(value)
  const isValid = Number.isInteger(num) && num > 0

  return (
    <Dialog open={props.open} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {props.type === 'ZJN'
              ? 'Ilość punktów zawieszenia'
              : 'Ilość metrów'}
          </DialogTitle>
        </DialogHeader>

        <Input
          inputMode="numeric"
          placeholder={props.type === 'ZJN' ? 'np. 3' : 'np. 28'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <Button disabled={!isValid} onClick={() => props.onConfirm(num)}>
          Zapisz
        </Button>
      </DialogContent>
    </Dialog>
  )
}
