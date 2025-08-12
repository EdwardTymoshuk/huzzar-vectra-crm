'use client'

import { Button } from '@/app/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { OrderStatus, OrderType } from '@prisma/client'
import { MdFilterList } from 'react-icons/md'

type FilterProps = {
  statusValue: OrderStatus | null
  typeValue: OrderType | null
  setStatusFilterAction: (status: OrderStatus | null) => void
  setOrderTypeFilterAction: (type: OrderType | null) => void
  onClearAction: () => void
}

export const TechnicianOrdersFilter = ({
  statusValue,
  typeValue,
  setStatusFilterAction,
  setOrderTypeFilterAction,
  onClearAction,
}: FilterProps) => {
  const statusSelectVal = statusValue ?? 'all'
  const typeSelectVal = typeValue ?? 'all'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <MdFilterList className="mr-2" /> Filtruj
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-background space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Status</p>
          <Select
            value={statusSelectVal as string}
            onValueChange={(value) =>
              setStatusFilterAction(
                value === 'all' ? null : (value as OrderStatus)
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="COMPLETED">Wykonane</SelectItem>
              <SelectItem value="NOT_COMPLETED">Niewykonane</SelectItem>
              <SelectItem value="ASSIGNED">Przypisane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Typ zlecenia</p>
          <Select
            value={typeSelectVal as string}
            onValueChange={(value) =>
              setOrderTypeFilterAction(
                value === 'all' ? null : (value as OrderType)
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="INSTALATION">Instalacja</SelectItem>
              <SelectItem value="SERVICE">Serwis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1">
          <Button variant="ghost" className="w-full" onClick={onClearAction}>
            Wyczyść filtry
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
