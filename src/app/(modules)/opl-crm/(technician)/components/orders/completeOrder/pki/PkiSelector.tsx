'use client'

import { Button } from '@/app/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command'
import { Label } from '@/app/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { Switch } from '@/app/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { PkiDefinition } from '@/types/opl-crm/orders'
import { useState } from 'react'

interface Props {
  enabled: boolean
  onToggle: (v: boolean) => void
  available: PkiDefinition[]
  onSelect: (pki: PkiDefinition) => void
}

/**
 * PKI selector (adder).
 * Allows selecting multiple PKI codes.
 */
const PkiSelector = ({ enabled, onToggle, available, onSelect }: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>PKI</Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
            >
              Dodaj PKI
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="p-0 w-[--radix-popover-trigger-width]"
          >
            <Command className="bg-background">
              <CommandInput placeholder="Szukaj PKI..." className="h-9" />

              <CommandList
                className="max-h-64 overflow-y-auto overscroll-contain"
                onWheelCapture={(e) => e.stopPropagation()}
              >
                <CommandEmpty>Brak pasujących kodów</CommandEmpty>

                <TooltipProvider>
                  {available.map((pki) => (
                    <CommandItem
                      key={pki.code}
                      value={`${pki.code} ${pki.label}`}
                      onSelect={() => {
                        onSelect(pki)
                        setOpen(false)
                      }}
                      className="flex items-center gap-2 bg-background"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 w-full">
                            <span className="font-medium shrink-0">
                              {pki.code}
                            </span>
                            <span className="truncate text-sm text-muted-foreground">
                              {pki.label}
                            </span>
                          </div>
                        </TooltipTrigger>

                        <TooltipContent side="right">
                          {pki.label}
                        </TooltipContent>
                      </Tooltip>
                    </CommandItem>
                  ))}
                </TooltipProvider>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

export default PkiSelector
