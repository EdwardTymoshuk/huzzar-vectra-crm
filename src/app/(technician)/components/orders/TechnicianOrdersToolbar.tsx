'use client'

import AddOrderModal from '@/app/admin-panel/components/orders/AddOrderModal'
import SearchInput from '@/app/components/shared/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useState } from 'react'
import { MdAdd } from 'react-icons/md'

type Props = {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

const TechnicianOrdersToolbar = ({ searchTerm, setSearchTerm }: Props) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={() => setAddModalOpen(true)}>
          <MdAdd /> <span>Dodaj</span>
        </Button>
      </div>

      <div className="w-full sm:w-1/2 lg:w-1/4">
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      <AddOrderModal
        open={isAddModalOpen}
        onCloseAction={() => setAddModalOpen(false)}
      />
    </div>
  )
}

export default TechnicianOrdersToolbar
