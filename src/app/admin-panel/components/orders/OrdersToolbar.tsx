'use client'

import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import { useSearch } from '@/app/context/SearchContext'
import Link from 'next/link'
import { useState } from 'react'
import { MdAdd, MdCalendarMonth } from 'react-icons/md'
import AddOrderModal from './AddOrderModal'
import ImportOrders from './ImportOrders'

/**
 * OrdersToolbar component:
 * - Contains top action buttons with responsive layout.
 * - Uses universal SearchInput component.
 */
const OrdersToolbar = () => {
  const { setSearchTerm } = useSearch()
  const [isModalOpen, setModalOpen] = useState(false)
  const [searchTerm, setsearchTerm] = useState('')

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setModalOpen(true)} variant="success">
          <MdAdd />
          <span className="hidden lg:inline">Dodaj</span>
        </Button>

        <ImportOrders />

        <Link href="/admin-panel?tab=planning">
          <Button variant="danger">
            <MdCalendarMonth />
            <span className="hidden lg:inline">Planowanie</span>
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="w-full sm:w-1/2 lg:w-1/4 ">
        <SearchInput
          placeholder="Szukaj po nr zlecenia lub adresie"
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>
      {/* Add Order Modal */}
      <AddOrderModal
        open={isModalOpen}
        onCloseAction={() => setModalOpen(false)}
      />
    </div>
  )
}

export default OrdersToolbar
