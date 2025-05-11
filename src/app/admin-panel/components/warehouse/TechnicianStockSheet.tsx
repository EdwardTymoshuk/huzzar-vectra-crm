'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { MdInventory2 } from 'react-icons/md'
import TechnicianStockTabs from './TechnicianStockTabs'

/**
 * TechnicianStockSheet:
 * - Side panel that lets user view technician's current stock.
 * - Includes technician selector and local search input.
 */
const TechnicianStockSheet = () => {
  const [open, setOpen] = useState(false)
  const [technicianId, setTechnicianId] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery()
  const { data: stockData, isLoading } =
    trpc.warehouse.getTechnicianStock.useQuery(
      { technicianId: technicianId! },
      { enabled: !!technicianId }
    )

  // Filter items by search term (case-insensitive)
  const filteredData = stockData?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MdInventory2 className="h-5 w-5" />
          Stan technika
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full md:max-w-[700px] overflow-auto"
      >
        <SheetHeader>
          <SheetTitle>Stan magazynowy technika</SheetTitle>
        </SheetHeader>

        <div className="my-4 space-y-4">
          {/* Technician select */}
          <Select
            onValueChange={(val) => {
              setTechnicianId(val)
              setSearchTerm('') // Reset search on technician change
            }}
            value={technicianId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz technika" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search input */}
          {technicianId && (
            <SearchInput
              placeholder="Szukaj po nazwie..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          )}

          {/* Stock display */}
          {technicianId && filteredData && (
            <TechnicianStockTabs items={filteredData} searchTerm={searchTerm} />
          )}

          {technicianId && isLoading && <LoaderSpinner />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default TechnicianStockSheet
