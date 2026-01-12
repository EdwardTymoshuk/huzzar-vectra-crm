/// src/app/(technician)/components/warehouse/WarehouseToolbarTech.tsx
'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useState } from 'react'
import { CgArrowsExchange } from 'react-icons/cg'
import TransferModal from './transfer/TransferModal'

type Props = {
  searchTerm: string
  setSearchTerm: (v: string) => void
}

/**
 * WarehouseToolbarTech
 * -------------------------------------------------------------
 * – top bar for technician’s warehouse page
 * – contains global search and the new “Przekaż sprzęt” action
 */
const WarehouseToolbarTech = ({ searchTerm, setSearchTerm }: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="default" onClick={() => setOpen(true)}>
          <CgArrowsExchange />
          Przekaż sprzęt
        </Button>

        <div className="w-full sm:w-1/2 lg:w-1/4">
          <SearchInput
            placeholder="Szukaj urządzenie lub materiał"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      <TransferModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default WarehouseToolbarTech
