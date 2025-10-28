'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import SearchInput from '@/app/components/shared/SearchInput'
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
} from '@/app/components/ui/sheet'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import TechnicianStockTabs from './TechnicianStockTabs'

type Props = {
  open: boolean
  setOpen: (val: boolean) => void
}

/**
 * TechnicianStockSheet:
 * - Displays a side sheet with technician stock info.
 * - Allows selection of technician and searching items.
 */
const TechnicianStockSheet = ({ open, setOpen }: Props) => {
  const [technicianId, setTechnicianId] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })
  const { data: stockData, isLoading } =
    trpc.warehouse.getTechnicianStock.useQuery(
      { technicianId: technicianId! },
      { enabled: !!technicianId }
    )
  // Reset selection when sheet closes
  useEffect(() => {
    if (!open) {
      setTechnicianId(undefined)
      setSearchTerm('')
    }
  }, [open])

  const filteredData = !searchTerm
    ? stockData
    : stockData?.filter((item) => {
        const name = item.name ?? item.materialDefinition?.name ?? ''
        const sn = item.serialNumber ?? ''
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sn.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-[95%] md:w-full md:max-w-lg overflow-auto"
      >
        <SheetHeader>
          <SheetTitle>Stan magazynowy technika</SheetTitle>
        </SheetHeader>

        <div className="my-4 space-y-4">
          {/* Technician selector */}
          <Select
            onValueChange={(val) => {
              setTechnicianId(val)
              setSearchTerm('')
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

          {/* Search field */}
          {technicianId && (
            <SearchInput
              placeholder="Szukaj po nazwie lub sn/mac..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          )}

          {/* Stock results */}
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
