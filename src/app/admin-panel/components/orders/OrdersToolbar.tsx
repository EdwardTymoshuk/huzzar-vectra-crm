'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MdAdd, MdCalendarMonth, MdOutlineSearch } from 'react-icons/md'
import AddOrderModal from './AddOrderModal'
import ImportOrders from './ImportOrders'

/**
 * OrdersToolbar component:
 * - Contains top action buttons with responsive layout.
 */
const OrdersToolbar = () => {
  const [isModalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Buttons with responsive icons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setModalOpen(true)} variant="success">
          <MdAdd />
          <span className="hidden lg:inline">Dodaj</span>
        </Button>

        <ImportOrders />

        <Button variant="danger" onClick={() => router.push('/planowanie')}>
          <MdCalendarMonth />
          <span className="hidden lg:inline">Planowanie</span>
        </Button>
      </div>

      <div className="relative w-full  sm:w-1/2 lg:w-1/4">
        <MdOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Szukaj" className="pl-10" />
      </div>

      {/* Add Order Modal */}
      <AddOrderModal open={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export default OrdersToolbar
